// 9단계에서 학생이 채우는 탐지 함수입니다(docs/DETECT_EVENTS.md 계약).
// 반 엔진이 검증한 사건만 전달해야 하며, 브라우저가 보낸 사용자 번호는 받지 않습니다.
// 9단계 만들기 1: 사건에서 가명 사용자(identity.sub)·요청 종류(method)·시각(at)만 읽습니다.
//   메모 내용·토큰·실명 같은 다른 값은 읽지도, 저장하거나 출력하지도 않습니다.
// 규칙 burst_read: 같은 사용자의 GET 사건이 어느 10분 구간에서든 120건을 넘을 때만 회수를 제안합니다.
//   정확히 120건은 제안하지 않고, 다른 사용자의 사건을 합치거나 10분 밖 사건을 같은 묶음으로 세지 않습니다.
// 이 함수는 제안만 돌려줍니다. 실제 회수는 반 엔진이 집행하며 여기서 권한을 바꾸지 않습니다.

const WINDOW_MS = 10 * 60 * 1000;
const BURST_LIMIT = 120;
const SUBJECT = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/u;

// 사건 하나에서 필요한 세 값만 꺼냅니다. 형식이 맞지 않으면 버립니다.
export function readEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) return null;
  const sub = event.identity && typeof event.identity === 'object' ? event.identity.sub : undefined;
  const at = typeof event.at === 'string' ? Date.parse(event.at) : Number.NaN;
  if (typeof sub !== 'string' || !SUBJECT.test(sub) || !Number.isFinite(at)
      || typeof event.method !== 'string') return null;
  return { subject: sub, method: event.method.toUpperCase(), at };
}

export function detect(events) {
  if (!Array.isArray(events)) throw new TypeError('invalid_detection_events');

  const readsBySubject = new Map();
  for (const event of events) {
    const item = readEvent(event);
    if (!item || item.method !== 'GET') continue;
    const times = readsBySubject.get(item.subject) ?? [];
    times.push(item.at);
    readsBySubject.set(item.subject, times);
  }

  for (const [subject, times] of readsBySubject) {
    times.sort((a, b) => a - b);
    let start = 0;
    for (let end = 0; end < times.length; end += 1) {
      while (times[end] - times[start] >= WINDOW_MS) start += 1;
      if (end - start + 1 > BURST_LIMIT) {
        return { action: 'propose_revocation', reasonCode: 'burst_read', subject };
      }
    }
  }
  return { action: 'observe' };
}
