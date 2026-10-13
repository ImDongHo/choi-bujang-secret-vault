// 3단계: /api/notes와 /api/notes/:id 서버 함수가 함께 쓰는 코드입니다.
// 로그인 검사는 시작 틀의 src/verify-login.mjs를 그대로 부르고, 결과의 userId만 믿습니다.
// 브라우저가 보낸 userId·role·owner_id는 읽지 않습니다.
// SUPABASE_URL, SUPABASE_SECRET_KEY는 Vercel 환경변수에서만 읽고 응답·로그에 넣지 않습니다.
// 4단계: 모든 읽기·추가·수정·삭제를 검증된 사용자 ID와 DB의 owner_id가 같을 때만 허용합니다.
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createLoginVerifier } from './verify-login.mjs';

const config = JSON.parse(readFileSync(new URL('../aleph.config.json', import.meta.url), 'utf8'));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
let verifyLogin;

export const isUuid = value => typeof value === 'string' && UUID.test(value);

export function toNote(row) {
  return { id: row.id, title: row.title, body: row.content };
}

// 8단계: 메모와 강사 공지를 서버가 구별하는 자원 ID. 응답 모양({id,title,body})은 바꾸지 않고 판단·기록에만 씁니다.
export const RESOURCE_KINDS = Object.freeze({ notes: 'notes', notices: 'notices' });
export function resourceId(kind, id) {
  if (!Object.hasOwn(RESOURCE_KINDS, kind)) throw new TypeError('unknown_resource_kind');
  return `${kind}:${id ?? '*'}`;
}

// 8단계: 쿼리로 기능·소유자·구역을 고르지 않습니다. 한 건 주소는 경로의 :id 하나만, 목록 주소는 쿼리 없이만 받습니다.
// 예상하지 않은 쿼리(owner_id, zone, 중복 id 등)가 붙으면 무시하지 않고 400으로 거부합니다.
export function rejectUnexpectedQuery(request, response, allowedKeys = []) {
  const query = request.query ?? {};
  const bad = Object.entries(query).some(([key, value]) => !allowedKeys.includes(key) || typeof value !== 'string');
  if (!bad) return false;
  logDenied('query', 'query_not_allowed');
  response.status(400).json({ error: 'QUERY_NOT_ALLOWED' });
  return true;
}

// 거부 사유를 짧게 남깁니다. 토큰·키·메모 내용·사용자 ID는 기록하지 않습니다.
export function logDenied(resource, reason) {
  console.warn(`deny ${resource} reason=${reason}`);
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
  return { userId: login.userId, kind: login.kind, url, key };
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

// 본문에 다른 사람을 소유자로 적었는지 봅니다. 소유자는 언제나 검증된 사용자 ID입니다.
const OWNER_FIELDS = ['owner_id', 'ownerId', 'owner', 'user_id', 'userId'];
export function claimsOtherOwner(input, userId) {
  return OWNER_FIELDS.some(field => Object.hasOwn(input, field)
    && String(input[field]).toLowerCase() !== userId.toLowerCase());
}

// Supabase REST(PostgREST)를 서버 전용 키로 부릅니다.
export function notesTable(ctx, options) {
  return restTable(ctx, 'notes', options);
}

const TABLES = new Set(['notes', 'notices', 'instructors', 'notes_backup', 'notes_restore_audit', 'device_registrations']);
export async function restTable(ctx, table, { method = 'GET', query = {}, body, prefer } = {}) {
  if (!TABLES.has(table)) throw new TypeError('unknown_table');
  const endpoint = new URL(`/rest/v1/${table}`, ctx.url);
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
    console.error(`api: Supabase 응답 상태 ${upstream.status} ${data?.code ?? ''}`.trim());
  }
  return { ok: upstream.ok, status: upstream.status, code: data?.code, data };
}

// 8단계: 강사 권한은 DB의 public.instructors에 저장된 검증된 사용자 ID로만 확인합니다.
// 화면 메뉴나 요청 본문의 role은 믿지 않습니다.
export async function isInstructor(ctx) {
  const result = await restTable(ctx, 'instructors', { query: { select: 'user_id', user_id: `eq.${ctx.userId}`, limit: '1' } });
  if (!result.ok || !Array.isArray(result.data)) throw new Error('instructor_lookup_failed');
  return result.data.length === 1;
}

// 10단계: 메모 내용 해시(UTF-8 SHA-256, 16진수). 학습 DB의 encode(sha256(convert_to(content,'UTF8')),'hex')와 같은 값입니다.
export function contentHash(text) {
  return createHash('sha256').update(String(text), 'utf8').digest('hex');
}

// 11단계: 기기 승인. 기기 번호는 서버가 만들어 HttpOnly 쿠키로만 줍니다(화면 스크립트가 읽을 수 없음).
// DB에는 '사용자 ID + 기기 번호'의 SHA-256만 저장하며, 승인(approved)은 학생이 Supabase에서 직접 바꿉니다.
export const DEVICE_COOKIE = 'bb_device';
const DEVICE_ID = /^[A-Za-z0-9_-]{43}$/u;

export function readDeviceCookie(request) {
  const header = typeof request.headers?.cookie === 'string' ? request.headers.cookie : '';
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === DEVICE_COOKIE) {
      const value = rest.join('=');
      return DEVICE_ID.test(value) ? value : null;
    }
  }
  return null;
}

export const newDeviceId = () => randomBytes(32).toString('base64url');
export const deviceHash = (userId, deviceId) => createHash('sha256').update(`${userId}:${deviceId}`, 'utf8').digest('hex');
export const deviceCookieHeader = deviceId =>
  `${DEVICE_COOKIE}=${deviceId}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=7776000`;

// 이 브라우저(쿠키)의 기기가 검증된 사용자에게 어떤 상태인지: none·pending·approved·revoked
export async function deviceStatus(ctx, request) {
  const deviceId = readDeviceCookie(request);
  if (!deviceId) return { status: 'none', deviceId: null };
  const result = await restTable(ctx, 'device_registrations', { query: {
    select: 'status,label', device_hash: `eq.${deviceHash(ctx.userId, deviceId)}`, owner_id: `eq.${ctx.userId}`, limit: '1',
  } });
  if (!result.ok || !Array.isArray(result.data)) throw new Error('device_lookup_failed');
  return result.data.length
    ? { status: result.data[0].status, label: result.data[0].label, deviceId }
    : { status: 'none', deviceId };
}

// 학생 토큰은 승인된 기기에서만 보호 자료를 엽니다. 심판 토큰은 반 엔진이 기기를 이미 확인해 넘기므로(deviceRegistered) 그대로 둡니다.
export async function requireApprovedDevice(ctx, request, response) {
  if (ctx.kind !== 'student') return true;
  let device;
  try { device = await deviceStatus(ctx, request); } catch { unavailable(response); return false; }
  if (device.status === 'approved') return true;
  logDenied('device', `device_${device.status}`);
  response.status(403).json({ error: 'DEVICE_NOT_APPROVED', deviceStatus: device.status });
  return false;
}

export function unavailable(response) {
  return response.status(502).json({ error: 'NOTES_UNAVAILABLE' });
}
