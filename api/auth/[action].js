// /api/auth/login · /api/auth/refresh · /api/auth/logout
// 5단계: 화면 코드에 Supabase 키를 두지 않도록 로그인(Auth) 요청도 서버 함수가 대신 보냅니다.
// SUPABASE_URL, SUPABASE_SECRET_KEY는 Vercel 환경변수에서만 읽고 응답·로그에 넣지 않습니다.
// 비밀번호와 토큰은 로그에 남기지 않습니다. 비밀번호나 JWT를 직접 만들지 않고 Supabase Auth가 발급한 세션만 전달합니다.

const ACTIONS = new Set(['login', 'refresh', 'logout']);
const BEARER = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/u;

function readBody(request) {
  let body = request.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return null; }
  }
  return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
}

function reason(status, data) {
  const code = data?.error_code ?? data?.code ?? data?.error;
  if (code === 'invalid_credentials' || code === 'invalid_grant') return 'INVALID_CREDENTIALS';
  if (code === 'email_not_confirmed') return 'EMAIL_NOT_CONFIRMED';
  if (status === 429 || String(code ?? '').startsWith('over_')) return 'TOO_MANY_REQUESTS';
  return 'LOGIN_FAILED';
}

function sessionResponse(data) {
  if (typeof data?.access_token !== 'string' || typeof data?.refresh_token !== 'string') return null;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Number.isSafeInteger(data.expires_at) ? data.expires_at
      : Math.floor(Date.now() / 1000) + (Number(data.expires_in) || 3600),
    email: typeof data.user?.email === 'string' ? data.user.email : null,
  };
}

async function authRequest(path, { url, key }, { body, token } = {}) {
  const headers = { apikey: key, 'Content-Type': 'application/json', Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const upstream = await fetch(new URL(path, url), {
    method: 'POST', headers, body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  let data = null;
  try { data = await upstream.json(); } catch { /* 본문 없음 */ }
  return { status: upstream.status, ok: upstream.ok, data };
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  const action = Array.isArray(request.query?.action) ? request.query.action[0] : request.query?.action;
  if (!ACTIONS.has(action)) return response.status(404).json({ error: 'NOT_FOUND' });
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error('auth: SUPABASE_URL 또는 SUPABASE_SECRET_KEY 환경변수가 없습니다.');
    return response.status(500).json({ error: 'SERVER_NOT_CONFIGURED' });
  }
  const env = { url, key };

  try {
    if (action === 'logout') {
      const match = BEARER.exec(request.headers.authorization ?? '');
      if (match) await authRequest('/auth/v1/logout?scope=local', env, { token: match[1] });
      return response.status(204).end();
    }

    const body = readBody(request);
    if (action === 'login') {
      const email = typeof body?.email === 'string' ? body.email.trim() : '';
      const password = typeof body?.password === 'string' ? body.password : '';
      if (!email || email.length > 320 || !password || password.length > 1024) {
        return response.status(400).json({ error: 'INVALID_LOGIN_INPUT' });
      }
      const result = await authRequest('/auth/v1/token?grant_type=password', env, { body: { email, password } });
      const session = result.ok && sessionResponse(result.data);
      if (!session) {
        console.error(`auth: 로그인 실패 상태 ${result.status}`);
        return response.status(result.status === 429 ? 429 : 401).json({ error: reason(result.status, result.data) });
      }
      return response.status(200).json(session);
    }

    const refreshToken = typeof body?.refreshToken === 'string' ? body.refreshToken : '';
    if (!refreshToken || refreshToken.length > 2048) return response.status(400).json({ error: 'INVALID_REFRESH_TOKEN' });
    const result = await authRequest('/auth/v1/token?grant_type=refresh_token', env, { body: { refresh_token: refreshToken } });
    const session = result.ok && sessionResponse(result.data);
    if (!session) return response.status(401).json({ error: 'LOGIN_REQUIRED' });
    return response.status(200).json(session);
  } catch {
    console.error(`auth: ${action} 요청 중 오류가 났습니다.`);
    return response.status(502).json({ error: 'AUTH_UNAVAILABLE' });
  }
}
