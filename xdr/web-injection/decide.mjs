// 보너스 xdr-02 만들기 3: 웹 주입 공격(MITRE ATT&CK T1190) 경보 판단.
// 1) 경보의 시각·출발 주소·계정·규칙 수준·설명과 요청 주소 표기·반복 횟수를 아래 PATTERNS(= patterns.json과 같은 값)와 맞춰 봅니다.
// 2) 패턴은 안 맞지만 T1190 의심 신호가 있는 애매한 건만 Jev에게 확신도(0~1)를 묻습니다.
// 3) 확신도 0.85 이상 block, 0.5 이상 alert, 그 아래 record. Jev가 응답하지 않으면 alert.
// Jev 주소는 환경변수 JEV_URL로만 받습니다(없으면 응답 없음과 같음). 키·토큰은 코드에 두지 않습니다.
// 정상 사용자를 막지 않도록, 패턴 근거가 없는 경보는 Jev가 높게 답해도 block하지 않습니다.
// 판정자는 이 파일 하나만 격리 환경에서 실행할 수 있으므로 다른 파일을 import하거나 읽지 않습니다.

// patterns.json과 같은 값입니다(바꿀 때는 두 곳을 함께 바꿉니다).
export const MIN_REPEATS = 5;
export const PATTERNS = Object.freeze([
  { name: 'sql-injection-repeat', technique: 'T1190',
    match: { markers: ['SQL 구문', 'SQL 표식', '데이터베이스 조회를 이어 붙', 'doc-sql', 'union select', "' or 1=1"], minRepeats: 5 } },
  { name: 'script-injection-repeat', technique: 'T1190',
    match: { markers: ['스크립트 삽입 표기', '스크립트 표식', 'doc-script', 'doc-mixed', '<script', 'javascript:'], minRepeats: 5 } },
  { name: 'path-traversal-repeat', technique: 'T1190',
    match: { markers: ['거슬러 올라가', '경로 이탈', 'doc-up-repeat', '../../'], minRepeats: 5 } },
  { name: 'command-separator-repeat', technique: 'T1190',
    match: { markers: ['명령 구분자', 'doc-cmd', '$(', '&&'], minRepeats: 5 } },
]);

export const BLOCK_AT = 0.85;
export const ALERT_AT = 0.5;
const JEV_TIMEOUT_MS = 3000;

// 판단에 필요한 다섯 항목(시각·출발 주소·계정·규칙 수준·설명)만 꺼냅니다. read-alerts.mjs의 extractAlert와 같은 모양입니다.
function extractAlert(alert) {
  const data = alert?.data ?? {};
  return {
    id: typeof alert?.id === 'string' ? alert.id : '',
    time: typeof alert?.timestamp === 'string' ? alert.timestamp : null,
    srcip: typeof data.srcip === 'string' ? data.srcip : null,
    accounts: typeof data.srcuser === 'string' ? [data.srcuser] : [],
    level: Number.isFinite(alert?.rule?.level) ? alert.rule.level : null,
    description: typeof alert?.rule?.description === 'string' ? alert.rule.description : '',
  };
}

export function signalsOf(alert) {
  const row = extractAlert(alert);
  let url = typeof alert?.data?.url === 'string' ? alert.data.url : '';
  try { url = decodeURIComponent(url); } catch { /* 디코딩할 수 없으면 원문 그대로 */ }
  const countField = Number.parseInt(alert?.data?.count, 10);
  const textCount = /(\d+)\s*번/u.exec(row.description);
  return {
    row,
    haystack: `${row.description}\n${url}`.toLowerCase(),
    repeats: Number.isFinite(countField) ? countField : textCount ? Number(textCount[1]) : 0,
    t1190: Array.isArray(alert?.rule?.mitre) && alert.rule.mitre.some(id => String(id).startsWith('T1190')),
  };
}

function markersFound(signals, pattern) {
  return pattern.match.markers.some(marker => signals.haystack.includes(marker.toLowerCase()));
}

export function matchPatterns(signals) {
  if (!signals.row.srcip) return [];
  return PATTERNS
    .filter(pattern => signals.repeats >= pattern.match.minRepeats && markersFound(signals, pattern))
    .map(pattern => pattern.name);
}

// Jev에게 애매한 경보 요약만 보내고 확신도(0~1)를 받습니다. 주소·계정 이름은 보내지 않습니다.
export async function askJev(signals, { url = process.env.JEV_URL, fetchImpl = globalThis.fetch } = {}) {
  if (!url || typeof fetchImpl !== 'function') return null;
  try {
    const target = new URL(url);
    if (target.protocol !== 'https:') return null;
    const response = await fetchImpl(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'web-injection-triage',
        technique: 'T1190',
        question: '이 웹 요청 경보가 주입 공격일 확신도를 0~1 숫자 confidence로만 답해 주세요.',
        alert: { level: signals.row.level, description: signals.row.description, repeats: signals.repeats },
      }),
      signal: AbortSignal.timeout(JEV_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const confidence = Number(data?.confidence);
    return Number.isFinite(confidence) && confidence >= 0 && confidence <= 1 ? confidence : null;
  } catch {
    return null;
  }
}

const round = value => Math.round(value * 100) / 100;

function actionOf(confidence) {
  if (confidence >= BLOCK_AT) return 'block';
  if (confidence >= ALERT_AT) return 'alert';
  return 'record';
}

export async function decide(alert, { jev = askJev } = {}) {
  const signals = signalsOf(alert);
  const matched = matchPatterns(signals);

  if (matched.length) {
    let confidence = 0.86;
    if ((signals.row.level ?? 0) >= 10) confidence += 0.04;
    if (matched.length > 1) confidence += 0.04;
    confidence = round(Math.min(confidence, 0.98));
    return {
      action: actionOf(confidence),
      confidence,
      reason: `${matched.join('+')}(T1190): 같은 주소에서 ${signals.repeats}번 반복`,
    };
  }

  const anyMarker = PATTERNS.some(pattern => markersFound(signals, pattern));
  const ambiguous = signals.t1190 || anyMarker;
  if (!ambiguous) {
    return { action: 'record', confidence: 0.05, reason: '근거 패턴 없음: 주입 표기가 없는 정상 요청' };
  }

  const answer = await jev(signals);
  if (answer === null) {
    return { action: 'alert', confidence: 0.6, reason: '근거 패턴 없음(T1190 의심, 반복 없음): Jev 응답 없음 → 사람 확인 필요' };
  }
  // 패턴 근거 없이 Jev 답만으로는 막지 않습니다(정상 사용자 보호).
  const confidence = round(Math.min(answer, BLOCK_AT - 0.01));
  return {
    action: actionOf(confidence),
    confidence,
    reason: `근거 패턴 없음(T1190 의심): Jev 확신도 ${round(answer)}${answer >= BLOCK_AT ? ' → 패턴 근거가 없어 alert로 낮춤' : ''}`,
  };
}
