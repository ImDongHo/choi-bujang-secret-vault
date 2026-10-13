// 보너스 xdr-04 만들기 3: 몰래 심어진 프로그램(머무름) 경보 판단. 근거 MITRE ATT&CK T1543·T1053·T1547.001.
// - 아래 PATTERNS는 patterns.json과 같은 값입니다(바꿀 때는 두 곳을 함께 바꿉니다).
// - 판정자는 인터넷 없이 이 파일 하나만 불러오므로 import·파일 읽기/쓰기·바깥 요청 없이 혼자 계산합니다.
// - 확신도(confidence)는 경보가 패턴과 얼마나 뚜렷하게 맞는지를 0~1로 매긴 값입니다. 0.85 이상 block, 0.5 이상 alert, 그 아래 record.
// - 핵심 표기와 뒷받침 신호가 함께 있을 때만 block. 머무름 관련 표기만 있으면 alert, 정상 동작 표기나 근거가 없으면 record.

export const PATTERNS = Object.freeze([
  { name: 'unsigned-new-service', technique: 'T1543',
    match: { markers: ['서비스'], anyOf: ['서명 없는', '서명이 없', '평소 목록에 없는'] } },
  { name: 'unfamiliar-scheduled-task', technique: 'T1053',
    match: { markers: ['예약 작업'], anyOf: ['처음 보는', '임의 문자열', '수업 시간 밖'], path: '임시 폴더 실행 파일' } },
  { name: 'startup-folder-change', technique: 'T1547.001',
    match: { markers: ['시작 폴더', '시작 프로그램', 'Startup 경로'], anyOf: ['평소 목록에 없는', '임시 폴더 실행 파일'] } },
]);

// patterns.json common.normalMarkers와 같은 값: 평소대로 도는 정상 동작 표기
const NORMAL_MARKERS = ['평소 시각에 그대로', '서명된 채로', '기존 예약 작업이', '읽기만'];
// 머무름과 관련된 표기(애매한 시도 판단용)
const PERSISTENCE_TERMS = ['서비스', '예약 작업', '시작 폴더', '시작 항목', '시작 프로그램', '실행 파일'];
const TECHNIQUES = ['T1543', 'T1053', 'T1547'];

export const BLOCK_AT = 0.85;
export const ALERT_AT = 0.5;

const round = value => Math.round(value * 100) / 100;
const text = value => (typeof value === 'string' ? value : '');

export function signalsOf(alert) {
  const data = alert?.data && typeof alert.data === 'object' ? alert.data : {};
  const description = text(alert?.rule?.description);
  const path = text(data.path).replaceAll('/', '\\').toLowerCase();
  const tempExe = /\\appdata\\local\\temp\\[^\\]+\.(?:exe|dll|scr|bat|cmd|ps1|vbs)$/u.test(path);
  const startupPath = path.includes('\\start menu\\programs\\startup\\');
  const has = marker => (marker === '임시 폴더 실행 파일' ? tempExe : marker === 'Startup 경로' ? startupPath : description.includes(marker));
  const matched = PATTERNS.filter(pattern => pattern.match.markers.some(has)
    && pattern.match.anyOf.some(has)
    && (!pattern.match.path || has(pattern.match.path))).map(pattern => pattern.name);
  const countField = Number.parseInt(data.count, 10);
  const textCount = /(\d+)\s*건/u.exec(description);
  return {
    matched,
    tempExe,
    level: Number.isFinite(alert?.rule?.level) ? alert.rule.level : 0,
    repeats: Number.isFinite(countField) ? countField : textCount ? Number(textCount[1]) : 1,
    tagged: Array.isArray(alert?.rule?.mitre) && alert.rule.mitre.some(id => TECHNIQUES.some(t => String(id).startsWith(t))),
    normal: NORMAL_MARKERS.some(marker => description.includes(marker)),
    related: PERSISTENCE_TERMS.some(term => description.includes(term)),
  };
}

function actionOf(confidence) {
  if (confidence >= BLOCK_AT) return 'block';
  if (confidence >= ALERT_AT) return 'alert';
  return 'record';
}

export function decide(alert) {
  const signals = signalsOf(alert);
  if (signals.matched.length && !signals.normal) {
    // 패턴 하나로 0.88, 임시 폴더 실행 파일·여러 패턴·연속 등록·높은 규칙 수준이 겹칠수록 더 뚜렷합니다.
    let confidence = 0.88;
    if (signals.tempExe) confidence += 0.03;
    if (signals.matched.length > 1) confidence += 0.03;
    if (signals.repeats >= 3) confidence += 0.02;
    if (signals.level >= 12) confidence += 0.02;
    confidence = round(Math.min(confidence, 0.98));
    const techniques = [...new Set(PATTERNS.filter(p => signals.matched.includes(p.name)).map(p => p.technique))].join('·');
    return { action: actionOf(confidence), confidence, reason: `${signals.matched.join('+')}(${techniques})` };
  }
  if (signals.normal) {
    return { action: 'record', confidence: 0.1, reason: '근거 패턴 없음: 평소대로 도는 기존·서명된 작업' };
  }
  if (signals.tagged && signals.related) {
    const confidence = signals.tempExe ? 0.65 : 0.6;
    return { action: actionOf(confidence), confidence, reason: '근거 패턴 없음(머무름 관련 표기만 있음, 뒷받침 신호 없음) → 사람 확인 필요' };
  }
  return { action: 'record', confidence: 0.05, reason: '근거 패턴 없음: 머무름 표기가 없는 정상 이벤트' };
}
