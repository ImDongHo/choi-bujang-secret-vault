// /api/notices/:id — 강사 공지 한 건 읽기(GET)·수정(PUT).
// 8단계: 공지 구역(읽기·수정)은 DB public.instructors에 저장된 강사만 허용합니다. 학생은 403입니다.
// 화면 메뉴나 요청 본문의 role·isInstructor 같은 값은 믿지 않고, 검증된 사용자 ID로만 강사 여부를 대조합니다.
// 거부할 때는 자원 ID와 짧은 사유만 기록합니다.
import { isInstructor, isUuid, logDenied, readNoteInput, rejectUnexpectedQuery, requireLogin, resourceId, restTable, toNote, unavailable } from '../../src/notes-api.mjs';

const notFound = response => response.status(404).json({ error: 'NOTICE_NOT_FOUND' });

export default async function handler(request, response) {
  const ctx = await requireLogin(request, response, ['GET', 'PUT']);
  if (!ctx) return;
  if (rejectUnexpectedQuery(request, response, ['id'])) return;

  const rawId = Array.isArray(request.query?.id) ? request.query.id[0] : request.query?.id;
  if (!isUuid(rawId)) return notFound(response);
  const id = rawId.toLowerCase();
  const resource = resourceId('notices', id);
  const byId = { id: `eq.${id}`, select: 'id,title,content' };

  try {
    if (!await isInstructor(ctx)) {
      logDenied(resource, 'instructor_required');
      return response.status(403).json({ error: 'INSTRUCTOR_REQUIRED' });
    }
    if (request.method === 'GET') {
      const result = await restTable(ctx, 'notices', { query: byId });
      if (!result.ok || !Array.isArray(result.data)) return unavailable(response);
      return result.data.length ? response.status(200).json(toNote(result.data[0])) : notFound(response);
    }

    const note = readNoteInput(request);
    if (!note) return response.status(400).json({ error: 'INVALID_NOTICE' });
    const result = await restTable(ctx, 'notices', {
      method: 'PATCH', query: byId, prefer: 'return=representation',
      body: { title: note.title, content: note.body, updated_by: ctx.userId, updated_at: new Date().toISOString() },
    });
    if (result.status === 400) return response.status(400).json({ error: 'INVALID_NOTICE' });
    if (!result.ok || !Array.isArray(result.data)) return unavailable(response);
    return result.data.length ? response.status(200).json(toNote(result.data[0])) : notFound(response);
  } catch {
    console.error('notices: Supabase 요청 중 오류가 났습니다.');
    return unavailable(response);
  }
}
