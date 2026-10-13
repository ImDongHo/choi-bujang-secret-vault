// /api/device/status (GET) · /api/device/request (POST) — 11단계 기기 승인 요청과 결과.
// - 로그인(검증된 사용자)이 필요합니다.
// - request는 이 브라우저용 기기 번호를 서버가 만들어 HttpOnly 쿠키로 주고, '승인 대기(pending)'만 기록합니다.
//   버튼을 눌러도 권한은 생기지 않습니다. 승인(approved)은 학생이 Supabase에서 직접 바꿉니다(supabase/step11-device-registrations.sql).
// - 기기 번호 원문은 응답 본문·로그·DB에 넣지 않고, DB에는 해시만 저장합니다.
import { deviceCookieHeader, deviceHash, deviceStatus, newDeviceId, rejectUnexpectedQuery, requireLogin, restTable, unavailable } from '../../src/notes-api.mjs';
import { withOpsEvents } from '../../src/ops-events.mjs';

const ACTIONS = { status: 'GET', request: 'POST' };

function labelOf(request) {
  let body = request.body;
  if (typeof body === 'string' && body) { try { body = JSON.parse(body); } catch { body = {}; } }
  const label = typeof body?.label === 'string' ? body.label.trim().slice(0, 60) : '';
  return label.replace(/[^\p{L}\p{N} ._-]/gu, '') || '이 브라우저';
}

async function handler(request, response) {
  const action = Array.isArray(request.query?.action) ? null : request.query?.action;
  const method = ACTIONS[action];
  if (!method) return response.status(404).json({ error: 'NOT_FOUND' });
  const ctx = await requireLogin(request, response, [method]);
  if (!ctx) return;
  if (rejectUnexpectedQuery(request, response, ['action'])) return;

  try {
    const current = await deviceStatus(ctx, request);
    if (action === 'status') return response.status(200).json({ deviceStatus: current.status });

    // 이미 대기 중이거나 승인된 기기면 그대로 알려 줍니다.
    if (current.status === 'pending' || current.status === 'approved') {
      return response.status(200).json({ deviceStatus: current.status });
    }
    // 처음이거나 회수된 기기면 새 기기 번호로 승인 대기를 만듭니다.
    const deviceId = newDeviceId();
    const result = await restTable(ctx, 'device_registrations', {
      method: 'POST', prefer: 'return=minimal',
      body: { owner_id: ctx.userId, device_hash: deviceHash(ctx.userId, deviceId), label: labelOf(request), status: 'pending' },
    });
    if (!result.ok) return unavailable(response);
    response.setHeader('Set-Cookie', deviceCookieHeader(deviceId));
    return response.status(202).json({ deviceStatus: 'pending' });
  } catch {
    console.error('device: Supabase 요청 중 오류가 났습니다.');
    return unavailable(response);
  }
}

// 12단계: 응답마다 요청 ID를 붙이고 작전실 서버 기록(public.ops_events)에 한 줄 남깁니다.
export default withOpsEvents('device', request => `${request.method} /api/device/${Object.hasOwn(ACTIONS, request.query?.action) ? request.query.action : ':action'}`, handler);
