// The student changes this check as each stage adds an attack to the same app.
// Never return tokens, private keys, real names, or note bodies.
function appUrl(config) {
  let app;
  try {
    app = new URL(config.publicAppUrl);
  } catch {
    throw new Error('aleph.config.json의 실제 배포 주소를 먼저 넣어 주세요.');
  }
  if (app.protocol !== 'https:' || app.username || app.password || app.search || app.hash
      || app.pathname !== '/' || app.hostname.endsWith('.example')) {
    throw new Error('aleph.config.json의 실제 배포 주소를 먼저 넣어 주세요.');
  }
  return app;
}

async function countNotes(url) {
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(10000) });
  let count = null;
  if (response.ok) {
    try {
      const data = await response.json();
      count = Array.isArray(data?.notes) ? data.notes.length : null;
    } catch {
      // JSON이 아니면 메모 개수를 셀 수 없습니다.
    }
  }
  return { status: response.status, count };
}

// 2단계: 실제로 보낸 비로그인 요청의 결과만 적습니다. 메모 본문은 기록하지 않습니다.
async function stepTwoChecks(app) {
  const staticFile = await countNotes(new URL('/data.json', app));
  const api = await countNotes(new URL('/api/notes', app));
  return [
    { attackId: 'anonymous_static_note_read', expected: '공개 /data.json에서 메모 0건 또는 404',
      observed: staticFile.count === null
        ? `메모 목록 없음 (HTTP ${staticFile.status})`
        : `HTTP ${staticFile.status}, 메모 ${staticFile.count}건` },
    { attackId: 'anonymous_api_note_read', expected: '남은 약점: 비로그인 /api/notes 요청이 아직 메모를 받음 (3단계에서 차단 예정)',
      observed: api.count === null
        ? `메모 목록 없음 (HTTP ${api.status})`
        : `HTTP ${api.status}, 메모 ${api.count}건` },
  ];
}

// 3단계: 토큰 없이, 또는 서명 없는 가짜 토큰으로 메모 API를 불러 거부되는지 봅니다.
// 응답 본문과 메모 내용은 기록하지 않고 HTTP 상태와 메모 개수만 적습니다.
async function sendRequest(url, { method = 'GET', authorization, body } = {}) {
  const headers = {};
  if (authorization) headers.Authorization = authorization;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(url, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  let count = null;
  if (response.ok) {
    try {
      const data = await response.json();
      count = Array.isArray(data) ? data.length : Array.isArray(data?.notes) ? data.notes.length : null;
    } catch {
      // JSON이 아니면 메모 개수를 셀 수 없습니다.
    }
  }
  return `HTTP ${response.status}${count === null ? '' : `, 메모 ${count}건`}`;
}

function unsignedToken(config) {
  const part = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  return `${part({ alg: 'none', typ: 'JWT' })}.${part({
    iss: config.identityProvider?.issuer, aud: config.identityProvider?.audience,
    role: 'authenticated', sub: '00000000-0000-4000-8000-000000000000', iat: now, exp: now + 300,
  })}.`;
}

async function stepThreeChecks(app, config) {
  const notes = new URL('/api/notes', app);
  const item = new URL('/api/notes/00000000-0000-4000-8000-000000000000', app);
  const probe = { title: '자기 점검', body: '비로그인 추가 시도' };
  const staticFile = await countNotes(new URL('/data.json', app));
  return [
    { attackId: 'anonymous_static_note_read', expected: '공개 /data.json에서 메모 0건 또는 404',
      observed: staticFile.count === null
        ? `메모 목록 없음 (HTTP ${staticFile.status})`
        : `HTTP ${staticFile.status}, 메모 ${staticFile.count}건` },
    { attackId: 'anonymous_api_list_read', expected: '토큰 없는 GET /api/notes는 401, 메모 없음',
      observed: await sendRequest(notes) },
    { attackId: 'forged_token_list_read', expected: '서명 없는 가짜 토큰의 GET /api/notes는 401, 메모 없음',
      observed: await sendRequest(notes, { authorization: `Bearer ${unsignedToken(config)}` }) },
    { attackId: 'anonymous_api_note_create', expected: '토큰 없는 POST /api/notes는 401',
      observed: await sendRequest(notes, { method: 'POST', body: probe }) },
    { attackId: 'anonymous_api_note_read', expected: '토큰 없는 GET /api/notes/:id는 401',
      observed: await sendRequest(item) },
    { attackId: 'anonymous_api_note_update', expected: '토큰 없는 PUT /api/notes/:id는 401',
      observed: await sendRequest(item, { method: 'PUT', body: probe }) },
    { attackId: 'anonymous_api_note_delete', expected: '토큰 없는 DELETE /api/notes/:id는 401',
      observed: await sendRequest(item, { method: 'DELETE' }) },
    { attackId: 'login_a_note_crud', expected: 'A 로그인 뒤 추가·수정·삭제 성공, 지운 뒤 GET은 404',
      observed: '미실행: A 비밀번호·토큰을 코드에 넣지 않으므로 화면에서 직접 확인' },
  ];
}

// 4단계: anon(공개) 키로 Supabase Data API를 직접 불러 메모 테이블이 막혔는지 봅니다.
// publishable key는 화면에도 들어 있는 공개용 값입니다. 서버 전용 키는 쓰지 않습니다.
const PUBLISHABLE_KEY = 'sb_publishable_3hpwOdynmaXDwv_r5tjF3Q_zcE7WQTg';

async function sendDataApi(config, { method = 'GET', body } = {}) {
  // 5단계부터는 aleph.config.json의 originalApiUrl(쿼리 없는 원본 자료 경로)을 그대로 씁니다.
  const endpoint = new URL(config.originalApiUrl
    ?? new URL('/rest/v1/notes', new URL(config.identityProvider.issuer).origin).href);
  endpoint.searchParams.set('select', 'id');
  if (method === 'GET') endpoint.searchParams.set('limit', '1');
  const headers = { apikey: PUBLISHABLE_KEY, Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(endpoint, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  let rows = null;
  if (response.ok) {
    try {
      const data = await response.json();
      rows = Array.isArray(data) ? data.length : null;
    } catch {
      // 본문이 없으면 행 수를 셀 수 없습니다.
    }
  }
  return `HTTP ${response.status}${rows === null ? '' : `, 행 ${rows}개`}`;
}

async function stepFourChecks(app, config) {
  const base = (await stepThreeChecks(app, config)).filter(item => item.attackId !== 'login_a_note_crud');
  return [
    ...base,
    { attackId: 'anon_data_api_note_read', expected: 'anon 키로 Data API /rest/v1/notes 직접 GET은 거부(401·403), 행 없음',
      observed: await sendDataApi(config) },
    { attackId: 'anon_data_api_note_insert', expected: 'anon 키로 Data API /rest/v1/notes 직접 POST는 거부(401·403)',
      observed: await sendDataApi(config, { method: 'POST', body: {
        owner_id: '00000000-0000-4000-8000-000000000000', title: '자기 점검', content: 'anon 직접 추가 시도',
      } }) },
    { attackId: 'login_owner_note_crud', expected: 'A·B 각자 자기 메모 읽기·추가·수정·삭제 성공',
      observed: '미실행: A·B 비밀번호·토큰을 코드에 넣지 않으므로 화면에서 직접 확인' },
    { attackId: 'login_b_reads_a_note', expected: 'B 토큰으로 A 메모 GET·PUT·DELETE /api/notes/:id는 404',
      observed: '미실행: B 토큰이 필요해 화면 개발자 도구로 직접 확인' },
    { attackId: 'login_owner_change', expected: '수정·추가 본문에 다른 owner_id를 넣으면 403',
      observed: '미실행: 로그인 토큰이 필요해 직접 확인' },
  ];
}

// 5단계: 메모 자료는 서버 함수로만 다룹니다. 원본(originalApiUrl)에 anon 키로 직접 보낸 요청이 거부되는지 봅니다.
async function stepFiveChecks(app, config) {
  const checks = await stepFourChecks(app, config);
  return checks.map(item => {
    if (item.attackId === 'anon_data_api_note_read') {
      return { ...item, expected: 'anon 키로 원본 originalApiUrl 직접 GET은 거부(401·403), 행 없음' };
    }
    if (item.attackId === 'anon_data_api_note_insert') {
      return { ...item, expected: 'anon 키로 원본 originalApiUrl 직접 POST는 거부(401·403)' };
    }
    return item;
  }).concat([
    { attackId: 'login_direct_original_api', expected: '로그인 토큰으로 원본 직접 요청도 권한 없음(401·403), 서버 함수로만 자료 접근',
      observed: '미실행: 로그인 토큰이 필요해 직접 확인' },
  ]);
}

export async function runAttackChecks(config) {
  if (![1, 2, 3, 4, 5].includes(config.step)) {
    throw new Error('이 단계의 공격 점검을 src/attack-check.mjs에 구현해 주세요.');
  }
  const app = appUrl(config);
  if (config.step === 5) return stepFiveChecks(app, config);
  if (config.step === 4) return stepFourChecks(app, config);
  if (config.step === 3) return stepThreeChecks(app, config);
  if (config.step === 2) return stepTwoChecks(app);
  if (typeof config.sampleMarker !== 'string' || !config.sampleMarker) throw new Error('가상 메모의 확인 표시를 넣어 주세요.');
  const response = await fetch(new URL('/data.json', app), {
    redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  let visible = false;
  if (response.ok) {
    try {
      const data = await response.json();
      visible = data?.sampleMarker === config.sampleMarker && Array.isArray(data.notes)
        && data.notes.length > 0;
    } catch {
      // A non-JSON response is a failed check, not a successful deployment.
    }
  }
  return [{ attackId: 'anonymous_note_read', expected: '비로그인 화면에서 가상 메모를 확인',
    observed: visible ? '비로그인 요청에서 공개 가상 메모 확인 표시가 보임' : `비로그인 요청에서 확인 표시가 보이지 않음 (HTTP ${response.status})` }];
}
