// 보너스 xdr-03 만들기 3: 알려진 취약점 악용(CVE-2021-44228 형태, MITRE ATT&CK T1190) 경보 판단.
// - 아래 PATTERNS는 patterns.json과 같은 값입니다(바꿀 때는 두 곳을 함께 바꿉니다).
// - 판정자는 인터넷 없이 이 파일 하나만 불러오므로 import·파일 읽기/쓰기·바깥 요청 없이 혼자 계산합니다.
// - 확신도(confidence)는 경보가 패턴과 얼마나 뚜렷하게 맞는지를 0~1로 매긴 값입니다. 0.85 이상 block, 0.5 이상 alert, 그 아래 record.
// - 완전한 원격 조회 구문이 있어야만 block 합니다. CVE 이름·jndi 낱말·잘린 형태만 있으면 alert, 근거가 없으면 record.
// - 반환하는 reason에는 패턴 이름만 적고, 경보 안의 조회 구문 원문은 옮겨 적지 않습니다.

export const PATTERNS = Object.freeze([
  { name: 'log4shell-lookup-header', technique: 'T1190',
    match: { fields: ['useragent', 'referer', 'xforwardedfor', 'header', 'headers'], lookupSyntax: true } },
  { name: 'log4shell-lookup-param', technique: 'T1190',
    match: { fields: ['url', 'query', 'params'], lookupSyntax: true } },
  { name: 'known-scanner-trace', technique: 'T1190',
    match: { markers: ['알려진 취약점 점검', '점검 흔적'], requiresLookupSyntax: true } },
]);

// ${jndi:<프로토콜>: 형태의 완전한 원격 조회 구문(대소문자 무시, 주소 인자는 한 번 디코딩해 봄)
const LOOKUP = /\$\{\s*jndi\s*:\s*(?:ldaps?|rmi|dns|iiop|corba|nds|nis|https?)\s*:/iu;
// 완전한 구문은 없지만 이 공격과 관련된 표기(애매한 시도)
const WEAK_MARKERS = ['cve-2021-44228', 'jndi', 'log4j', 'lookup', '조회 형태', '중괄호', '점검 도구', '취약점'];

export const BLOCK_AT = 0.85;
export const ALERT_AT = 0.5;

const round = value => Math.round(value * 100) / 100;
const text = value => (typeof value === 'string' ? value : '');

function decoded(value) {
  try { return decodeURIComponent(value); } catch { return value; }
}

export function signalsOf(alert) {
  const data = alert?.data && typeof alert.data === 'object' ? alert.data : {};
  const description = text(alert?.rule?.description);
  const fieldText = field => {
    const raw = text(data[field]);
    return field === 'url' || field === 'query' || field === 'params' ? `${raw}\n${decoded(raw)}` : raw;
  };
  const matched = PATTERNS.filter(pattern => pattern.match.fields
    && pattern.match.fields.some(field => LOOKUP.test(fieldText(field)))).map(pattern => pattern.name);
  const hasLookup = matched.length > 0;
  const scanner = PATTERNS.find(pattern => pattern.name === 'known-scanner-trace');
  if (hasLookup && scanner.match.markers.some(marker => description.includes(marker))) matched.push(scanner.name);
  const countField = Number.parseInt(data.count, 10);
  const textCount = /(\d+)\s*번/u.exec(description);
  const haystack = `${description}\n${Object.values(data).filter(v => typeof v === 'string').map(decoded).join('\n')}`.toLowerCase();
  return {
    matched,
    hasLookup,
    level: Number.isFinite(alert?.rule?.level) ? alert.rule.level : 0,
    repeats: Number.isFinite(countField) ? countField : textCount ? Number(textCount[1]) : 1,
    t1190: Array.isArray(alert?.rule?.mitre) && alert.rule.mitre.some(id => String(id).startsWith('T1190')),
    weak: WEAK_MARKERS.some(marker => haystack.includes(marker)),
  };
}

function actionOf(confidence) {
  if (confidence >= BLOCK_AT) return 'block';
  if (confidence >= ALERT_AT) return 'alert';
  return 'record';
}

export function decide(alert) {
  const signals = signalsOf(alert);
  if (signals.hasLookup) {
    // 완전한 조회 구문 하나로 0.88, 머리글·인자 둘 다·점검 흔적·반복·높은 규칙 수준이 겹칠수록 더 뚜렷합니다.
    let confidence = 0.88;
    const lookupPatterns = signals.matched.filter(name => name !== 'known-scanner-trace').length;
    if (lookupPatterns > 1) confidence += 0.03;
    if (signals.matched.includes('known-scanner-trace')) confidence += 0.03;
    if (signals.repeats >= 5) confidence += 0.03;
    if (signals.level >= 12) confidence += 0.02;
    confidence = round(Math.min(confidence, 0.98));
    return { action: actionOf(confidence), confidence, reason: `${signals.matched.join('+')}(CVE-2021-44228·T1190)` };
  }
  if (signals.t1190 || signals.weak) {
    // 완전한 구문이 없으면 패턴 근거가 없으므로 막지 않고 사람 확인으로 돌립니다.
    const confidence = signals.repeats > 1 ? 0.65 : 0.6;
    return { action: actionOf(confidence), confidence, reason: '근거 패턴 없음(CVE-2021-44228 관련 표기만 있음, 완전한 조회 구문 없음) → 사람 확인 필요' };
  }
  return { action: 'record', confidence: 0.05, reason: '근거 패턴 없음: 취약점 악용 표기가 없는 정상 요청' };
}
