// 보너스 xdr-06 만들기 3: 자료 빼돌리기 경보 판단. 근거 MITRE ATT&CK T1041·T1048.
// - 아래 상수(COMMON·PATTERNS)는 patterns.json과 같은 값입니다(바꿀 때는 두 곳을 함께 바꿉니다).
// - 판정자는 인터넷 없이 이 파일 하나만 불러오므로 import·파일 읽기/쓰기·바깥 요청 없이 혼자 계산합니다.
// - 확신도(confidence)는 경보가 패턴과 얼마나 뚜렷하게 맞는지를 0~1로 매긴 값입니다. 0.85 이상 block, 0.5 이상 alert, 그 아래 record.
// - 50MB 이상 전송과 뒷받침 신호가 함께 있을 때만 block. 유출 관련 T1041·T1048 경보이지만 패턴이 없으면 alert, 정상 동작이나 근거가 없으면 record.

export const COMMON = Object.freeze({ largeBytes: 50000000, bulkFiles: 50, minRepeats: 5, normalMarkers: ['작은 동기화', '동기화가 끝났'] });
export const PATTERNS = Object.freeze([
  { name: 'large-transfer-unfamiliar-destination', technique: 'T1048',
    match: { minBytes: 'largeBytes', anyOf: ['처음 보는', '외부 주소', '평소에 쓰지 않던', 'repeats>=minRepeats', 'files>=bulkFiles'] } },
  { name: 'off-hours-archive-exfil', technique: 'T1048',
    match: { minBytes: 'largeBytes', markers: ['압축'], anyOf: ['수업 시간 밖', '업무 시간 밖', '처음 보는'] } },
  { name: 'c2-channel-exfil', technique: 'T1041',
    match: { minBytes: 'largeBytes', markers: ['명령 통로'] } },
]);

const RELATED_TERMS = ['전송', '나갔', '목적지', '주소', '압축', '명령 통로', '읽힌'];
const TECHNIQUES = ['T1041', 'T1048'];

export const BLOCK_AT = 0.85;
export const ALERT_AT = 0.5;

const round = value => Math.round(value * 100) / 100;
const text = value => (typeof value === 'string' ? value : '');
const numberOf = value => {
  const parsed = Number.parseInt(typeof value === 'number' ? String(value) : text(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export function signalsOf(alert) {
  const data = alert?.data && typeof alert.data === 'object' ? alert.data : {};
  const description = text(alert?.rule?.description);
  const textRepeats = /(\d+)\s*번/u.exec(description);
  const signals = {
    bytes: numberOf(data.bytes),
    files: numberOf(data.files),
    repeats: Math.max(numberOf(data.count), textRepeats ? Number(textRepeats[1]) : 0),
    level: Number.isFinite(alert?.rule?.level) ? alert.rule.level : 0,
    tagged: Array.isArray(alert?.rule?.mitre) && alert.rule.mitre.some(id => TECHNIQUES.some(t => String(id).startsWith(t))),
    normal: COMMON.normalMarkers.some(marker => description.includes(marker)),
    related: RELATED_TERMS.some(term => description.includes(term)),
  };
  const has = marker => {
    if (marker === 'repeats>=minRepeats') return signals.repeats >= COMMON.minRepeats;
    if (marker === 'files>=bulkFiles') return signals.files >= COMMON.bulkFiles;
    return description.includes(marker);
  };
  signals.matched = PATTERNS.filter(pattern => signals.bytes >= COMMON[pattern.match.minBytes]
    && (!pattern.match.markers || pattern.match.markers.some(has))
    && (!pattern.match.anyOf || pattern.match.anyOf.some(has))).map(pattern => pattern.name);
  return signals;
}

function actionOf(confidence) {
  if (confidence >= BLOCK_AT) return 'block';
  if (confidence >= ALERT_AT) return 'alert';
  return 'record';
}

export function decide(alert) {
  const signals = signalsOf(alert);
  if (signals.matched.length && !signals.normal) {
    // 패턴 하나로 0.88, 여러 패턴·200MB 이상·대량 파일 또는 반복·높은 규칙 수준이 겹칠수록 더 뚜렷합니다.
    let confidence = 0.88;
    if (signals.matched.length > 1) confidence += 0.03;
    if (signals.bytes >= 200000000) confidence += 0.02;
    if (signals.files >= 100 || signals.repeats >= COMMON.minRepeats) confidence += 0.02;
    if (signals.level >= 12) confidence += 0.02;
    confidence = round(Math.min(confidence, 0.98));
    const techniques = [...new Set(PATTERNS.filter(p => signals.matched.includes(p.name)).map(p => p.technique))].join('·');
    return { action: actionOf(confidence), confidence, reason: `${signals.matched.join('+')}(${techniques})` };
  }
  if (signals.normal) {
    return { action: 'record', confidence: 0.1, reason: '근거 패턴 없음: 수업 자료 주소로 끝난 작은 동기화' };
  }
  if (signals.tagged && signals.related) {
    return { action: 'alert', confidence: 0.6, reason: '근거 패턴 없음(유출 관련 표기만 있음, 50MB 이상 전송·뒷받침 신호 없음) → 사람 확인 필요' };
  }
  return { action: 'record', confidence: 0.05, reason: '근거 패턴 없음: 자료 빼돌리기 표기가 없는 정상 이벤트' };
}
