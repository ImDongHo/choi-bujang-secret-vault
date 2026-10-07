// 보너스 xdr-01 만들기 3: 무차별 로그인 공격(MITRE ATT&CK T1110) 경보 판단.
// 1) 경보의 시각·출발 주소·계정·규칙 수준·설명과 수치를 아래 PATTERNS(= patterns.json과 같은 값)와 맞춰 봅니다.
// 2) 패턴은 안 맞지만 T1110 의심 신호가 있는 애매한 건만 Jev에게 확신도(0~1)를 묻습니다.
// 3) 확신도 0.85 이상 block, 0.5 이상 alert, 그 아래 record. Jev가 응답하지 않으면 alert.
// Jev 주소는 환경변수 JEV_URL로만 받습니다(없으면 응답 없음과 같음). 키·토큰은 코드에 두지 않습니다.
// 정상 사용자를 막지 않도록, 패턴 근거가 없는 경보는 Jev가 높게 답해도 block하지 않습니다.
// 판정자는 이 파일 하나만 격리 환경에서 실행할 수 있으므로 다른 파일을 import하거나 읽지 않습니다.

// patterns.json과 같은 값입니다(바꿀 때는 두 곳을 함께 바꿉니다).
export const PATTERNS = Object.freeze([
  { name: 'same-source-rapid-failures', technique: 'T1110.001',
    match: { sameSource: true, minFailures: 20, maxWindowMinutes: 5, noSuccessAfter: true } },
  { name: 'password-spraying', technique: 'T1110.003',
    match: { sameSource: true, samePassword: true, minAccounts: 5 } },
]);
const byName = Object.fromEntries(PATTERNS.map(pattern => [pattern.name, pattern]));

// 판단에 필요한 다섯 항목(시각·출발 주소·계정·규칙 수준·설명)만 꺼냅니다. read-alerts.mjs의 extractAlert와 같은 모양입니다.
function extractAlert(alert) {
  const data = alert?.data ?? {};
  const accounts = typeof data.accounts === 'string' && data.accounts.trim()
    ? data.accounts.split(',').map(name => name.trim()).filter(Boolean)
    : typeof data.srcuser === 'string' ? [data.srcuser] : [];
  return {
    id: typeof alert?.id === 'string' ? alert.id : '',
    time: typeof alert?.timestamp === 'string' ? alert.timestamp : null,
    srcip: typeof data.srcip === 'string' ? data.srcip : null,
    accounts,
    level: Number.isFinite(alert?.rule?.level) ? alert.rule.level : null,
    description: typeof alert?.rule?.description === 'string' ? alert.rule.description : '',
  };
}

export const BLOCK_AT = 0.85;
export const ALERT_AT = 0.5;
const JEV_TIMEOUT_MS = 3000;

// 경보에서 판단에 쓰는 수치만 꺼냅니다(원본은 고치지 않음).
export function signalsOf(alert) {
  const row = extractAlert(alert);
  const text = row.description;
  const countField = Number.parseInt(alert?.data?.count, 10);
  const textCount = /실패\s*(\d+)\s*건/u.exec(text);
  const failures = Number.isFinite(countField) ? countField : textCount ? Number(textCount[1]) : 0;
  const windowMatch = /(\d+)\s*분/u.exec(text);
  const accountMatch = /계정\s*(\d+)\s*개/u.exec(text);
  const accountsCount = Math.max(row.accounts.length, accountMatch ? Number(accountMatch[1]) : 0);
  const successAfter = /성공/u.test(text) && !/성공은\s*없/u.test(text);
  return {
    row,
    failures,
    windowMinutes: windowMatch ? Number(windowMatch[1]) : null,
    accountsCount,
    samePassword: /같은\s*비밀번호/u.test(text),
    successAfter,
    t1110: Array.isArray(alert?.rule?.mitre) && alert.rule.mitre.some(id => String(id).startsWith('T1110')),
  };
}

export function matchPatterns(signals) {
  const matched = [];
  const rapid = byName['same-source-rapid-failures']?.match;
  if (rapid && signals.row.srcip && signals.failures >= rapid.minFailures
      && (signals.windowMinutes === null || signals.windowMinutes <= rapid.maxWindowMinutes)
      && (!rapid.noSuccessAfter || !signals.successAfter)) {
    matched.push('same-source-rapid-failures');
  }
  const spray = byName['password-spraying']?.match;
  if (spray && signals.row.srcip && signals.samePassword && signals.accountsCount >= spray.minAccounts) {
    matched.push('password-spraying');
  }
  return matched;
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
        task: 'brute-force-triage',
        technique: 'T1110',
        question: '이 로그인 경보가 무차별 대입 공격일 확신도를 0~1 숫자 confidence로만 답해 주세요.',
        alert: {
          level: signals.row.level,
          description: signals.row.description,
          failures: signals.failures,
          windowMinutes: signals.windowMinutes,
          accountsCount: signals.accountsCount,
          successAfter: signals.successAfter,
        },
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
    const detail = [
      signals.failures ? `실패 ${signals.failures}건${signals.windowMinutes ? `/${signals.windowMinutes}분` : ''}` : '',
      signals.accountsCount > 1 ? `계정 ${signals.accountsCount}개` : '',
    ].filter(Boolean).join(', ');
    return {
      action: actionOf(confidence),
      confidence,
      reason: `${matched.map(name => `${name}(${byName[name].technique})`).join('+')}: ${detail}`,
    };
  }

  const ambiguous = signals.t1110 || signals.failures >= 2;
  if (!ambiguous) {
    return { action: 'record', confidence: 0.05, reason: '근거 패턴 없음: 로그인 실패가 몰리지 않은 정상 이벤트' };
  }

  const answer = await jev(signals);
  if (answer === null) {
    return { action: 'alert', confidence: 0.6, reason: '근거 패턴 없음(T1110 의심): Jev 응답 없음 → 사람 확인 필요' };
  }
  // 패턴 근거 없이 Jev 답만으로는 막지 않습니다(정상 사용자 보호).
  const confidence = round(Math.min(answer, BLOCK_AT - 0.01));
  return {
    action: actionOf(confidence),
    confidence,
    reason: `근거 패턴 없음(T1110 의심): Jev 확신도 ${round(answer)}${answer >= BLOCK_AT ? ' → 패턴 근거가 없어 alert로 낮춤' : ''}`,
  };
}
