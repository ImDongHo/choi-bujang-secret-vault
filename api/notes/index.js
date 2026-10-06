// /api/notes — 로그인한 사용자의 메모 목록(GET)과 새 메모 추가(POST).
// 2단계: 메모는 학습용 Supabase 테이블에서 서버 쪽으로만 읽습니다(서버 전용 키는 환경변수에만).
// 3단계: src/verify-login.mjs가 확인한 사용자 ID로만 목록을 고르고 owner_id를 저장합니다.
// 브라우저가 보낸 owner_id·userId·role은 쓰지 않습니다.
import { randomUUID } from 'node:crypto';
import { isUuid, notesTable, readNoteInput, requireLogin, toNote, unavailable } from '../../src/notes-api.mjs';

export default async function handler(request, response) {
  const ctx = await requireLogin(request, response, ['GET', 'POST']);
  if (!ctx) return;

  try {
    if (request.method === 'GET') {
      const result = await notesTable(ctx, { query: {
        select: 'id,title,content', owner_id: `eq.${ctx.userId}`, order: 'created_at.asc,id.asc',
      } });
      if (!result.ok || !Array.isArray(result.data)) return unavailable(response);
      return response.status(200).json(result.data.map(toNote));
    }

    const note = readNoteInput(request);
    if (!note) return response.status(400).json({ error: 'INVALID_NOTE' });
    const { id: requestedId } = note.input;
    if (requestedId !== undefined && requestedId !== null && !isUuid(requestedId)) {
      return response.status(400).json({ error: 'INVALID_ID' });
    }
    const id = requestedId ? requestedId.toLowerCase() : randomUUID();
    const result = await notesTable(ctx, {
      method: 'POST', prefer: 'return=minimal',
      body: { id, owner_id: ctx.userId, title: note.title, content: note.body },
    });
    if (result.code === '23505') return response.status(409).json({ error: 'NOTE_ID_TAKEN' });
    if (result.status === 400) return response.status(400).json({ error: 'INVALID_NOTE' });
    if (!result.ok) return unavailable(response);
    return response.status(201).json({ id });
  } catch {
    console.error('notes: Supabase 요청 중 오류가 났습니다.');
    return unavailable(response);
  }
}
