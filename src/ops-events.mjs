// 12단계: 탈환 작전실이 읽는 서버 기록(public.ops_events)을 남깁니다.
// - 모든 자료·세션 API 응답에 요청 ID(X-Request-Id)를 붙이고, 응답을 보내기 전에 한 줄을 기록합니다.
// - 기록하는 값: 요청 ID·시각·검증된 사용자 ID(로그인 검사를 통과했을 때만)·서비스·요청 종류·경로 모양·상태 코드·결과·오류 코드,
//   그리고 점검 요청이 X-Aleph-Attack-Id 헤더로 보낸 점검 이름(attackId, 형식이 맞을 때만).
// - 메모 제목·본문·토큰·비밀번호·이메일·기기 번호·쿼리 원문은 기록하지 않습니다.
// - 서버 로그(Vercel Logs)에는 사용자 ID 대신 SHA-256 앞 8자리만 남깁니다(가린 서버 기록).
// - 기록이 실패해도 원래 응답은 바뀌지 않습니다(기록 실패는 로그에만 남김).
import { createHash, randomUUID } from 'node:crypto';
import { OPS_USER } from './notes-api.mjs';

const REASON = /^[A-Z0-9_]{1,40}$/u;
const SERVICE = /^[a-z]{1,20}$/u;
const ATTACK_ID = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/u;
export const ATTACK_HEADER = 'x-aleph-attack-id';
const RECORD_TIMEOUT_MS = 1500;

export const maskSubject = userId => (userId ? createHash('sha256').update(`ops:${userId}`, 'utf8').digest('hex').slice(0, 8) : '-');
export const outcomeOf = status => (status < 400 ? 'allowed' : status < 500 ? 'denied' : 'error');

async function insertEvent(event) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return false;
  try {
    const upstream = await fetch(new URL('/rest/v1/ops_events', url), {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(RECORD_TIMEOUT_MS),
    });
    return upstream.ok;
  } catch {
    return false;
  }
}

// route: 'GET /api/notes/:id'처럼 경로 모양 문자열, 또는 request를 받아 경로 모양을 돌려주는 함수
// options.record === false: 작전실 요약처럼 기록을 '읽기만' 하는 경로는 ops_events에 줄을 더하지 않습니다.
//   보기만 해도 수치가 바뀌면 화면 수치와 가린 서버 기록을 대조할 수 없기 때문입니다(요청 ID와 로그 한 줄은 그대로 남김).
export function withOpsEvents(service, route, handler, { record = true } = {}) {
  if (!SERVICE.test(service)) throw new TypeError('invalid_ops_service');
  return async function opsHandler(request, response) {
    const requestId = randomUUID();
    response.setHeader('X-Request-Id', requestId);
    response.setHeader('Access-Control-Expose-Headers', 'X-Request-Id');
    let status = null;
    let body;
    let ended = false;
    const finish = { json(value) { body = value; ended = 'json'; }, end() { ended = 'end'; } };
    const proxy = {
      setHeader: (name, value) => response.setHeader(name, value),
      getHeader: name => response.getHeader?.(name),
      status(code) { status = code; return finish; },
    };
    try {
      await handler(request, proxy);
    } catch {
      console.error('ops: 처리 중 예기치 않은 오류');
      status = 500; body = { error: 'INTERNAL_ERROR' }; ended = 'json';
    }
    if (!ended || !Number.isInteger(status)) { status = 500; body = { error: 'NO_RESPONSE' }; ended = 'json'; }

    const userId = request[OPS_USER] ?? null;
    const shape = String(typeof route === 'function' ? route(request) : route).slice(0, 60);
    const method = typeof request.method === 'string' && /^[A-Z]{3,7}$/u.test(request.method) ? request.method : 'OTHER';
    const reason = REASON.test(body?.error ?? '') ? body.error : '';
    const rawAttack = request.headers?.[ATTACK_HEADER];
    const attackId = typeof rawAttack === 'string' && ATTACK_ID.test(rawAttack) ? rawAttack : null;
    const recorded = !record ? 'skipped' : await insertEvent({
      request_id: requestId, owner_id: userId, service, method, route: shape,
      status, outcome: outcomeOf(status), reason, attack_id: attackId,
    });
    console.info(`ops event req=${requestId} sub=${maskSubject(userId)} ${shape} status=${status} reason=${reason || '-'} attack=${attackId ?? '-'}${recorded === 'skipped' ? ' record=skipped' : recorded ? '' : ' record=failed'}`);

    response.status(status);
    if (ended === 'json') response.json(body);
    else response.end();
  };
}
