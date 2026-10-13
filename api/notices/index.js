// /api/notices — 강사 공지 목록(GET). 공지 구역은 저장된 강사(public.instructors)만 열 수 있습니다.
// 학생은 자기 메모 구역만 쓰므로 공지 구역 읽기도 403으로 거부합니다(8단계 구역 규칙).
// 8단계: 메모(notes:<id>)와 다른 자원(notices:<id>)입니다. 공지는 이 주소에서 추가·삭제하지 않습니다.
import { isInstructor, logDenied, rejectUnexpectedQuery, requireLogin, resourceId, restTable, toNote, unavailable } from '../../src/notes-api.mjs';

export default async function handler(request, response) {
  const ctx = await requireLogin(request, response, ['GET']);
  if (!ctx) return;
  if (rejectUnexpectedQuery(request, response, [])) return;
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
