// 보너스 xdr-05 만들기 3: 권한 가로채기 경보 판단. 근거 MITRE ATT&CK T1068·T1078(·T1098.007).
// - 아래 PATTERNS·ADMIN_GROUPS는 patterns.json과 같은 값입니다(바꿀 때는 두 곳을 함께 바꿉니다).
// - 판정자는 인터넷 없이 이 파일 하나만 불러오므로 import·파일 읽기/쓰기·바깥 요청 없이 혼자 계산합니다.
// - 확신도(confidence)는 경보가 패턴과 얼마나 뚜렷하게 맞는지를 0~1로 매긴 값입니다. 0.85 이상 block, 0.5 이상 alert, 그 아래 record.
// - 패턴이 맞으면 block, 권한 관련 T1068·T1078 경보이지만 패턴이 없으면 alert, 근거가 없으면 record.

export const ADMIN_GROUPS = Object.freeze(['administrators', 'admins', 'domain admins', 'enterprise admins', 'sudo', 'wheel']);
export const PATTERNS = Object.freeze([
  { name: 'admin-group-add', technique: 'T1078',
    match: { groupIn: 'adminGroups', orDescription: ['관리자 그룹에 추가', '관리자 그룹에 들어', '다시 관리자로 들어'], notDescription: ['관리자 그룹은 아닙니다'] } },
  { name: 'unfamiliar-admin-command', technique: 'T1068',
    match: { markers: ['관리자 명령', '관리자 권한', '권한 명령'], anyOf: ['처음 보는', '처음 봅니다', '방금 관리자가 된', '다른 계정의 권한', '곧바로'] } },
  { name: 'off-hours-privilege-use', technique: 'T1078',
    match: { markers: ['관리자', '권한'], anyOf: ['수업 시간 밖', '업무 시간 밖', '업무처럼 보이지 않는 시각'] } },
]);

const RELATED_TERMS = ['관리자', '권한', '그룹', '계정 종류'];
const TECHNIQUES = ['T1068', 'T1078', 'T1098'];

export const BLOCK_AT = 0.85;
export const ALERT_AT = 0.5;

const round = value => Math.round(value * 100) / 100;
const text = value => (typeof value === 'string' ? value : '');

function patternMatches(pattern, description, group) {
  const m = pattern.match;
  if (m.notDescription?.some(marker => description.includes(marker))) return false;
  if (m.groupIn) return ADMIN_GROUPS.includes(group) || m.orDescription.some(marker => description.includes(marker));
  return m.markers.some(marker => description.includes(marker)) && m.anyOf.some(marker => description.includes(marker));
}

export function signalsOf(alert) {
  const data = alert?.data && typeof alert.data === 'object' ? alert.data : {};
  const description = text(alert?.rule?.description);
  const group = text(data.group).trim().toLowerCase();
  const countField = Number.parseInt(data.count, 10);
  return {
    matched: PATTERNS.filter(pattern => patternMatches(pattern, description, group)).map(pattern => pattern.name),
    level: Number.isFinite(alert?.rule?.level) ? alert.rule.level : 0,
    repeats: Number.isFinite(countField) ? countField : 1,
    tagged: Array.isArray(alert?.rule?.mitre) && alert.rule.mitre.some(id => TECHNIQUES.some(t => String(id).startsWith(t))),
    related: RELATED_TERMS.some(term => description.includes(term)),
  };
}

function actionOf(confidence) {
  if (confidence >= BLOCK_AT) return 'block';
  if (confidence >= ALERT_AT) return 'alert';
  return 'record';
}

export function decide(alert) {
  const signals = signalsOf(alert);
  if (signals.matched.length) {
    // 패턴 하나로 0.88, 여러 패턴·반복(여러 계정·재추가)·높은 규칙 수준이 겹칠수록 더 뚜렷합니다.
    let confidence = 0.88;
    if (signals.matched.length > 1) confidence += 0.03;
    if (signals.repeats >= 2) confidence += 0.02;
    if (signals.level >= 12) confidence += 0.02;
    confidence = round(Math.min(confidence, 0.98));
    const techniques = [...new Set(PATTERNS.filter(p => signals.matched.includes(p.name)).map(p => p.technique))].join('·');
    return { action: actionOf(confidence), confidence, reason: `${signals.matched.join('+')}(${techniques})` };
  }
  if (signals.tagged && signals.related) {
    return { action: 'alert', confidence: 0.6, reason: '근거 패턴 없음(권한 관련 표기만 있음, 뒷받침 신호 없음) → 사람 확인 필요' };
  }
  return { action: 'record', confidence: 0.05, reason: '근거 패턴 없음: 권한 가로채기 표기가 없는 정상 이벤트' };
}
