// /api/notes/:id — 메모 한 건 읽기(GET)·수정(PUT)·삭제(DELETE).
// 3단계: 로그인 여부는 src/verify-login.mjs가 확인한 사용자 ID로 검사합니다.
// 남은 약점(의도된 것): 아직 owner_id 비교가 없어 로그인한 B가 A의 메모를 읽고·고치고·지울 수 있습니다.
// 4단계에서 소유자 검사를 붙입니다.
import { isUuid, notesTable, readNoteInput, requireLogin, toNote, unavailable } from '../../src/notes-api.mjs';

const notFound = response => response.status(404).json({ error: 'NOTE_NOT_FOUND' });

export default async function handler(request, response) {
  const ctx = await requireLogin(request, response, ['GET', 'PUT', 'DELETE']);
  if (!ctx) return;

  const rawId = Array.isArray(request.query?.id) ? request.query.id[0] : request.query?.id;
  if (!isUuid(rawId)) return notFound(response);
  const id = rawId.toLowerCase();
  const byId = { id: `eq.${id}`, select: 'id,title,content' };

  try {
    if (request.method === 'GET') {
      const result = await notesTable(ctx, { query: byId });
      if (!result.ok || !Array.isArray(result.data)) return unavailable(response);
      return result.data.length ? response.status(200).json(toNote(result.data[0])) : notFound(response);
    }

    if (request.method === 'PUT') {
      const note = readNoteInput(request);
      if (!note) return response.status(400).json({ error: 'INVALID_NOTE' });
      const result = await notesTable(ctx, {
        method: 'PATCH', query: byId, prefer: 'return=representation',
        body: { title: note.title, content: note.body },
      });
      if (result.status === 400) return response.status(400).json({ error: 'INVALID_NOTE' });
      if (!result.ok || !Array.isArray(result.data)) return unavailable(response);
      return result.data.length ? response.status(200).json(toNote(result.data[0])) : notFound(response);
    }

    const result = await notesTable(ctx, {
      method: 'DELETE', query: { id: `eq.${id}`, select: 'id' }, prefer: 'return=representation',
    });
    if (!result.ok || !Array.isArray(result.data)) return unavailable(response);
    return result.data.length ? response.status(204).end() : notFound(response);
  } catch {
    console.error('notes: Supabase 요청 중 오류가 났습니다.');
    return unavailable(response);
  }
}
