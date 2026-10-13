// /api/notices — 강사 공지 목록(GET). 공지 구역은 저장된 강사(public.instructors)만 열 수 있습니다.
// 학생은 자기 메모 구역만 쓰므로 공지 구역 읽기도 403으로 거부합니다(8단계 구역 규칙).
// 8단계: 메모(notes:<id>)와 다른 자원(notices:<id>)입니다. 공지는 이 주소에서 추가·삭제하지 않습니다.
import { isInstructor, logDenied, rejectUnexpectedQuery, requireApprovedDevice, requireLogin, resourceId, restTable, toNote, unavailable } from '../../src/notes-api.mjs';
import { withOpsEvents } from '../../src/ops-events.mjs';

async function handler(request, response) {
  const ctx = await requireLogin(request, response, ['GET']);
  if (!ctx) return;
  if (rejectUnexpectedQuery(request, response, [])) return;
  if (!await requireApprovedDevice(ctx, request, response)) return; // 11단계: 승인된 기기만
  try {
    if (!await isInstructor(ctx)) {
      logDenied(resourceId('notices'), 'instructor_required');
      return response.status(403).json({ error: 'INSTRUCTOR_REQUIRED' });
    }
    const result = await restTable(ctx, 'notices', { query: { select: 'id,title,content', order: 'created_at.asc,id.asc' } });
    if (!result.ok || !Array.isArray(result.data)) return unavailable(response);
    return response.status(200).json(result.data.map(toNote));
  } catch {
    console.error('notices: Supabase 요청 중 오류가 났습니다.');
    return unavailable(response);
  }
}

// 12단계: 응답마다 요청 ID를 붙이고 작전실 서버 기록(public.ops_events)에 한 줄 남깁니다.
export default withOpsEvents('notices', request => `${request.method} /api/notices`, handler);
