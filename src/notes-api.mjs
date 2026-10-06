// 3단계: /api/notes와 /api/notes/:id 서버 함수가 함께 쓰는 코드입니다.
// 로그인 검사는 시작 틀의 src/verify-login.mjs를 그대로 부르고, 결과의 userId만 믿습니다.
// 브라우저가 보낸 userId·role·owner_id는 읽지 않습니다.
// SUPABASE_URL, SUPABASE_SECRET_KEY는 Vercel 환경변수에서만 읽고 응답·로그에 넣지 않습니다.
// 남은 약점: 소유자 검사가 없어 로그인한 B가 A의 메모 id로 읽기·수정·삭제할 수 있습니다(4단계에서 막음).
import { readFileSync } from 'node:fs';
import { createLoginVerifier } from './verify-login.mjs';

const config = JSON.parse(readFileSync(new URL('../aleph.config.json', import.meta.url), 'utf8'));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
let verifyLogin;

export const isUuid = value => typeof value === 'string' && UUID.test(value);

export function toNote(row) {
  return { id: row.id, title: row.title, body: row.content };
}

// 서버 설정과 로그인을 확인합니다. 실패하면 응답을 보내고 null을 돌려줍니다.
export async function requireLogin(request, response, allow) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Vary', 'Authorization');
  if (!allow.includes(request.method)) {
    response.setHeader('Allow', allow.join(', '));
    response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return null;
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error('notes: SUPABASE_URL 또는 SUPABASE_SECRET_KEY 환경변수가 없습니다.');
    response.status(500).json({ error: 'SERVER_NOT_CONFIGURED' });
    return null;
  }
  let login;
  try {
    verifyLogin ??= createLoginVerifier({ config, supabaseSecretKey: key });
    login = await verifyLogin(request.headers.authorization);
  } catch {
    console.error('notes: 로그인 검사기를 준비하지 못했습니다. aleph.config.json을 확인하세요.');
    response.status(500).json({ error: 'LOGIN_NOT_CONFIGURED' });
    return null;
  }
  if (!login || !isUuid(login.userId)) {
    response.setHeader('WWW-Authenticate', 'Bearer');
    response.status(401).json({ error: 'LOGIN_REQUIRED' });
    return null;
  }
  return { userId: login.userId, url, key };
}

// 요청 본문에서 title·body만 꺼내 검사합니다. 잘못되면 null.
export function readNoteInput(request) {
  let input = request.body;
  if (typeof input === 'string') {
    try { input = JSON.parse(input); } catch { return null; }
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const { title, body } = input;
  if (typeof title !== 'string' || typeof body !== 'string') return null;
  const cleanTitle = title.trim();
  if (!cleanTitle || cleanTitle.length > 200 || body.length > 5000) return null;
  return { input, title: cleanTitle, body };
}

// Supabase REST(PostgREST)를 서버 전용 키로 부릅니다.
export async function notesTable(ctx, { method = 'GET', query = {}, body, prefer } = {}) {
  const endpoint = new URL('/rest/v1/notes', ctx.url);
  for (const [name, value] of Object.entries(query)) endpoint.searchParams.set(name, value);
  const headers = { apikey: ctx.key, Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (prefer) headers.Prefer = prefer;
  const upstream = await fetch(endpoint, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await upstream.json(); } catch { /* 본문이 없는 응답 */ }
  if (!upstream.ok) {
    // 상태 코드와 DB 오류 번호만 남기고 키·토큰·메모 내용은 기록하지 않습니다.
    console.error(`notes: Supabase 응답 상태 ${upstream.status} ${data?.code ?? ''}`.trim());
  }
  return { ok: upstream.ok, status: upstream.status, code: data?.code, data };
}

export function unavailable(response) {
  return response.status(502).json({ error: 'NOTES_UNAVAILABLE' });
}
