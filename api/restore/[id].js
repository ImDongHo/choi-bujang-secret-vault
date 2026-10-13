// POST /api/restore/:id — 10단계 만들기 3: 비공개 가상 메모 사본(public.notes_backup)에서 지정한 메모 한 건만 되살립니다.
// - 로그인은 src/verify-login.mjs로 검사하고, 사본의 소유자가 검증된 사용자일 때만 복원합니다(아니면 404, 존재를 알리지 않음).
// - ID·소유자·내용 해시를 대조합니다: 사본 행의 해시가 내용과 맞아야 하고, 복원 뒤 메모의 ID·소유자·해시가 사본과 같아야 합니다.
// - 그 한 건만 넣거나 고칩니다. 다른 메모, 사본, 감사 기록은 바꾸지 않고 감사 기록에 한 줄을 추가합니다.
// - 메모 내용은 응답·로그에 넣지 않습니다. 응답은 {id, action, contentSha256}입니다.
// - 8단계 규칙에 맞춰 /api/notes/:id와 같은 깊이에 기능 경로를 두지 않고 별도 경로를 씁니다.
import { contentHash, isUuid, logDenied, notesTable, rejectUnexpectedQuery, requireApprovedDevice, requireLogin, resourceId, restTable, unavailable } from '../../src/notes-api.mjs';

const notFound = response => response.status(404).json({ error: 'BACKUP_NOT_FOUND' });

function readBody(request) {
  let body = request.body;
  if (typeof body === 'string' && body) {
    try { body = JSON.parse(body); } catch { return null; }
  }
  return body && typeof body === 'object' && !Array.isArray(body) ? body : {};
}

export default async function handler(request, response) {
  const ctx = await requireLogin(request, response, ['POST']);
  if (!ctx) return;
  if (rejectUnexpectedQuery(request, response, ['id'])) return;
  if (!await requireApprovedDevice(ctx, request, response)) return; // 11단계: 승인된 기기만

  const rawId = request.query?.id;
  if (!isUuid(rawId)) return notFound(response);
  const id = rawId.toLowerCase();
  const resource = resourceId('notes', id);
  const body = readBody(request);
  if (!body) return response.status(400).json({ error: 'INVALID_BODY' });
  const expectedHash = body.contentSha256;
  if (expectedHash !== undefined && (typeof expectedHash !== 'string' || !/^[0-9a-f]{64}$/u.test(expectedHash))) {
    return response.status(400).json({ error: 'INVALID_HASH' });
  }

  try {
    // 1) 사본 한 건: ID와 소유자(검증된 사용자)가 모두 맞아야 합니다.
    const backup = await restTable(ctx, 'notes_backup', { query: {
      id: `eq.${id}`, owner_id: `eq.${ctx.userId}`, select: 'id,owner_id,title,content,content_sha256',
    } });
    if (!backup.ok || !Array.isArray(backup.data)) return unavailable(response);
    if (!backup.data.length) { logDenied(resource, 'restore_not_owner_or_missing'); return notFound(response); }
    const copy = backup.data[0];

    // 2) 사본 자체가 온전한지(내용 해시) 확인하고, 요청이 해시를 보냈다면 그것과도 맞아야 합니다.
    if (contentHash(copy.content) !== copy.content_sha256) {
      logDenied(resource, 'backup_hash_mismatch');
      return response.status(409).json({ error: 'BACKUP_INTEGRITY_FAILED' });
    }
    if (expectedHash !== undefined && expectedHash !== copy.content_sha256) {
      return response.status(409).json({ error: 'HASH_MISMATCH' });
    }

    // 3) 지금 메모 상태: 같은 ID가 다른 사람 것이면 덮어쓰지 않습니다.
    const current = await notesTable(ctx, { query: { id: `eq.${id}`, select: 'id,owner_id' } });
    if (!current.ok || !Array.isArray(current.data)) return unavailable(response);
    if (current.data.length && current.data[0].owner_id !== ctx.userId) {
      logDenied(resource, 'restore_owner_conflict');
      return response.status(409).json({ error: 'OWNER_CONFLICT' });
    }

    // 4) 그 한 건만 넣거나 고칩니다.
    const action = current.data.length ? 'updated' : 'inserted';
    const write = action === 'updated'
      ? await notesTable(ctx, { method: 'PATCH', query: { id: `eq.${id}`, owner_id: `eq.${ctx.userId}` }, prefer: 'return=minimal',
        body: { title: copy.title, content: copy.content } })
      : await notesTable(ctx, { method: 'POST', prefer: 'return=minimal',
        body: { id, owner_id: ctx.userId, title: copy.title, content: copy.content } });
    if (!write.ok) return unavailable(response);

    // 5) 복원 뒤 ID·소유자·내용 해시가 사본과 같은지 다시 읽어 대조합니다.
    const after = await notesTable(ctx, { query: { id: `eq.${id}`, select: 'id,owner_id,content' } });
    const row = after.ok && Array.isArray(after.data) ? after.data[0] : null;
    if (!row || row.id !== copy.id || row.owner_id !== copy.owner_id || contentHash(row.content) !== copy.content_sha256) {
      console.error('restore: 복원 뒤 대조가 맞지 않습니다.');
      return response.status(500).json({ error: 'RESTORE_VERIFY_FAILED' });
    }

    // 6) 감사 기록은 추가만 합니다.
    const audit = await restTable(ctx, 'notes_restore_audit', { method: 'POST', prefer: 'return=minimal',
      body: { note_id: id, restored_by: ctx.userId, content_sha256: copy.content_sha256, action } });
    if (!audit.ok) console.error('restore: 감사 기록을 남기지 못했습니다.');

    return response.status(200).json({ id, action, contentSha256: copy.content_sha256 });
  } catch {
    console.error('restore: Supabase 요청 중 오류가 났습니다.');
    return unavailable(response);
  }
}
