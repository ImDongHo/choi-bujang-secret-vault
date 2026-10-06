// /api/notes/:id — 메모 한 건 읽기(GET)·수정(PUT)·삭제(DELETE).
// 3단계: 로그인 여부는 src/verify-login.mjs가 확인한 사용자 ID로 검사합니다.
// 4단계: DB 조회·수정·삭제 조건에 owner_id = 검증된 사용자 ID를 항상 붙입니다.
// URL·본문의 owner_id는 믿지 않으며, 남의 메모나 없는 메모는 똑같이 404로 거부합니다(존재 여부를 알리지 않음).
import { claimsOtherOwner, isUuid, notesTable, readNoteInput, requireLogin, toNote, unavailable } from '../../src/notes-api.mjs';

const notFound = response => response.status(404).json({ error: 'NOTE_NOT_FOUND' });

export default async function handler(request, response) {
  const ctx = await requireLogin(request, response, ['GET', 'PUT', 'DELETE']);
  if (!ctx) return;

  const rawId = Array.isArray(request.query?.id) ? request.query.id[0] : request.query?.id;
  if (!isUuid(rawId)) return notFound(response);
  const id = rawId.toLowerCase();
  // 기존 행 조건: 이 id이면서 주인이 본인인 행만.
  const mine = { id: `eq.${id}`, owner_id: `eq.${ctx.userId}` };

  try {
    if (request.method === 'GET') {
      const result = await notesTable(ctx, { query: { ...mine, select: 'id,title,content' } });
      if (!result.ok || !Array.isArray(result.data)) return unavailable(response);
      return result.data.length ? response.status(200).json(toNote(result.data[0])) : notFound(response);
    }

    if (request.method === 'PUT') {
      const note = readNoteInput(request);
      if (!note) return response.status(400).json({ error: 'INVALID_NOTE' });
      // 새 행 조건: 소유자를 다른 사람으로 바꾸려는 요청은 DB에 가기 전에 거부합니다.
      if (claimsOtherOwner(note.input, ctx.userId)) return response.status(403).json({ error: 'OWNER_CHANGE_FORBIDDEN' });
      const result = await notesTable(ctx, {
        method: 'PATCH', query: { ...mine, select: 'id,title,content,owner_id' }, prefer: 'return=representation',
        body: { title: note.title, content: note.body, owner_id: ctx.userId },
      });
      if (result.status === 400) return response.status(400).json({ error: 'INVALID_NOTE' });
      if (!result.ok || !Array.isArray(result.data)) return unavailable(response);
      if (!result.data.length) return notFound(response);
      const updated = result.data[0];
      if (updated.owner_id !== ctx.userId) {
        console.error('notes: 수정 뒤 소유자가 요청한 사용자와 다릅니다.');
        return unavailable(response);
      }
      return response.status(200).json(toNote(updated));
    }

    const result = await notesTable(ctx, {
      method: 'DELETE', query: { ...mine, select: 'id' }, prefer: 'return=representation',
    });
    if (!result.ok || !Array.isArray(result.data)) return unavailable(response);
    return result.data.length ? response.status(204).end() : notFound(response);
  } catch {
    console.error('notes: Supabase 요청 중 오류가 났습니다.');
    return unavailable(response);
  }
}
