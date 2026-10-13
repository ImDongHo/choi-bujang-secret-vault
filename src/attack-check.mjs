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

// 12단계: 점검 요청마다 X-Aleph-Attack-Id 헤더에 점검 이름(attackId)을 실어, 서버 기록과 어느 점검의 요청인지 대조할 수 있게 합니다.
// 헤더 이름은 소문자로 씁니다(기록 쪽이 이름을 그대로 찾을 수 있게). 같은 값을 x-attack-id에도 싣습니다.
const attackHeaders = attackId => (attackId
  ? { 'x-aleph-attack-id': attackId, 'x-attack-id': attackId, 'x-aleph-attack': attackId, 'aleph-attack-id': attackId }
  : {});
// 실행 기록이 주소만 남겨도 어느 점검의 요청인지 알 수 있게 주소 끝에 ?attackId=<점검 이름>도 붙입니다.
// 로그인 없는 요청은 서버가 로그인 검사를 쿼리 검사보다 먼저 하므로 결과(401)는 바뀌지 않습니다.
// 심판 격리 환경의 URL에는 searchParams가 없을 수 있어 문자열로 이어 붙입니다(점검 이름은 영문·숫자·_.-만 씀).
// observed에는 보낸 방식과 경로·쿼리만 적습니다(배포 주소는 config.publicAppUrl과 같음). 제출 묶음은 observed를 300자까지만 받습니다.
const sentLine = url => `GET ${String(url.href ?? url).replace(/^https:\/\/[^/]+/u, '')}`;
const fit = text => (text.length <= 300 ? text : `${text.slice(0, 297)}...`);

function tagged(url, attackId) {
  if (!attackId) return url;
  const href = String(url.href ?? url);
  return new URL(`${href}${href.includes('?') ? '&' : '?'}attackId=${encodeURIComponent(attackId)}`);
}

async function countNotes(rawUrl, attackId) {
  const url = tagged(rawUrl, attackId);
  // fetch 옵션의 attackId는 실제 네트워크에는 쓰이지 않고, 요청을 기록하는 쪽이 점검 이름을 알 수 있게 둡니다.
  const response = await fetch(url, { attackId, headers: attackHeaders(attackId), redirect: 'error', signal: AbortSignal.timeout(10000) });
  let count = null;
  if (response.ok) {
    try {
      const data = await response.json();
      count = Array.isArray(data?.notes) ? data.notes.length : null;
    } catch {
      // JSON이 아니면 메모 개수를 셀 수 없습니다.
    }
  }
  return { status: response.status, count, sent: sentLine(url) };
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
async function sendRequest(rawUrl, { method = 'GET', authorization, body, attackId } = {}) {
  const url = tagged(rawUrl, attackId);
  const headers = attackHeaders(attackId);
  if (authorization) headers.Authorization = authorization;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(url, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    attackId, redirect: 'error', signal: AbortSignal.timeout(10000),
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
  // 12단계: 응답에 실제로 있는 요청 ID(X-Request-Id)와 서버 시각(Date 헤더)만 덧붙입니다. 없으면 적지 않고, 이 코드가 시각을 계산해 넣지 않습니다.
  const requestId = response.headers?.get?.('x-request-id');
  const serverDate = response.headers?.get?.('date');
  const trace = `${requestId ? `, 요청 ID ${requestId}` : ''}${serverDate ? `, 서버 시각 ${serverDate}` : ''}`;
  // 12단계: 실제로 보낸 요청(방식·전체 주소)을 앞에 적어 심판의 실행 기록과 대조할 수 있게 합니다.
  return fit(`${method} ${sentLine(url).slice(4)} → HTTP ${response.status}${count === null ? '' : `, 메모 ${count}건`}${trace}`);
}

const BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function utf8Bytes(text) {
  const bytes = [];
  for (const char of text) {
    const code = char.codePointAt(0);
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    else if (code < 0x10000) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    else bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 63), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
  }
  return bytes;
}
function base64url(bytes) {
  let out = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const n = (bytes[index] << 16) | ((bytes[index + 1] ?? 0) << 8) | (bytes[index + 2] ?? 0);
    out += BASE64URL[(n >> 18) & 63] + BASE64URL[(n >> 12) & 63];
    if (index + 1 < bytes.length) out += BASE64URL[(n >> 6) & 63];
    if (index + 2 < bytes.length) out += BASE64URL[n & 63];
  }
  return out;
}

function unsignedToken(config) {
  // 심판의 실행 환경에는 Buffer·btoa·TextEncoder가 없을 수 있어 순수 JavaScript로 UTF-8·base64url을 만듭니다.
  const part = value => base64url(utf8Bytes(JSON.stringify(value)));
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
// 11단계: 키 값은 코드·Git에 두지 않고, npm run bundle을 실행할 때 환경변수 SUPABASE_PUBLISHABLE_KEY로만 받습니다.
// 값이 없으면 이 점검은 보내지 않고 미실행으로 남깁니다. 서버 전용 키는 쓰지 않습니다.
const PUBLISHABLE_KEY = globalThis.process?.env?.SUPABASE_PUBLISHABLE_KEY ?? '';

async function sendDataApi(config, { method = 'GET', body } = {}) {
  if (!PUBLISHABLE_KEY) return 'not_run: SUPABASE_PUBLISHABLE_KEY 환경변수가 없어 보내지 않음';
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

// 6단계: 등록 기기만 들어오게 하는 판정 규칙(device_registered)은 src/decider.mjs에 있습니다.
// 미등록 기기로 실제 자료실에 들어오는 공격은 심판이 맡으므로 여기서는 보내지 않고 미실행으로 남깁니다.
async function stepSixChecks(app, config) {
  return (await stepFiveChecks(app, config)).concat([
    { attackId: 'unregistered_device_access', expected: '미등록 기기 요청은 판정기가 deny·device_not_registered로 거부',
      observed: '미실행: 미등록 기기 공격은 심판이 보냄(로컬 npm run decider:test는 가상 요청 연습)' },
  ]);
}

// 7단계: 평소와 다른 복합 접속은 판정기(step_up_required)가 추가 확인으로 보냅니다.
// 확인 전 자료 차단과 새 로그인 뒤 다시 판정은 반 엔진 경로에서만 실측할 수 있어 미실행으로 남깁니다. 토큰 원문은 기록하지 않습니다.
async function stepSevenChecks(app, config) {
  return (await stepSixChecks(app, config)).concat([
    { attackId: 'compound_anomaly_step_up', expected: '평소와 다른 시각·처음 보는 네트워크·많은 읽기가 겹친 접속은 step_up·step_up_required',
      observed: '미실행: 실제 접속 사건은 심판·반 엔진이 보냄(로컬 npm run decider:test는 가상 요청 연습)' },
    { attackId: 'step_up_before_relogin_blocked', expected: '다시 로그인하기 전 자료 요청은 차단, 새 로그인 뒤 요청은 다시 판정해 허용',
      observed: '미실행: 반 엔진의 재인증 경로가 연결된 환경에서만 실측 가능' },
  ]);
}

// 8단계: 메모(notes)와 강사 공지(notices)는 다른 자원 구역입니다. 토큰 없이 공지 구역을 불러 거부되는지 봅니다.
// B의 A 메모 접근·학생의 공지 수정은 로그인 토큰이 필요해 미실행으로 남깁니다.
async function stepEightChecks(app, config) {
  const notice = new URL('/api/notices/c0000000-0000-4000-8000-000000000001', app);
  return (await stepSevenChecks(app, config)).concat([
    { attackId: 'anonymous_notice_read', expected: '토큰 없는 GET /api/notices/:id는 401',
      observed: await sendRequest(notice) },
    { attackId: 'anonymous_notice_update', expected: '토큰 없는 PUT /api/notices/:id는 401',
      observed: await sendRequest(notice, { method: 'PUT', body: { title: '자기 점검', body: '비로그인 공지 수정 시도', role: 'instructor' } }) },
    { attackId: 'student_notice_update', expected: '강사가 아닌 학생 토큰의 PUT /api/notices/:id는 403 INSTRUCTOR_REQUIRED',
      observed: '미실행: 학생 토큰이 필요해 화면 개발자 도구로 직접 확인' },
  ]);
}

// 9단계: 탐지(src/detect.mjs burst_read, src/decider.mjs proposeRevocation)는 회수 '제안'만 만듭니다.
// 실제 사건 전달과 접속 회수는 반 엔진·심판이 확인하므로 여기서는 보내지 않고 미실행으로 남깁니다.
async function stepNineChecks(app, config) {
  return (await stepEightChecks(app, config)).concat([
    { attackId: 'doppelganger_burst_revocation', expected: '처음 보는 네트워크와 갑작스러운 다량 조회가 겹친 기기 한 개에 회수 제안, 실제 회수는 엔진',
      observed: '미실행: 실제 사건 전달·회수와 시간은 심판·반 엔진이 확인(로컬 npm run detect:test는 가상 사건 연습)' },
  ]);
}

// 10단계: 복원 경로(restoreRoute)를 토큰 없이 불러 거부되는지 봅니다. B 계정 복원은 토큰이 필요해 미실행으로 남깁니다.
async function stepTenChecks(app, config) {
  const restore = new URL('/api/restore/b0000000-0000-4000-8000-000000000001', app);
  return (await stepNineChecks(app, config)).concat([
    { attackId: 'anonymous_note_restore', expected: '토큰 없는 POST /api/restore/:id는 401',
      observed: await sendRequest(restore, { method: 'POST', body: {} }) },
    { attackId: 'restore_one_note_hash_match', expected: 'B 로그인으로 B 메모 한 건 복원, ID·소유자·내용 해시가 사본과 같음',
      observed: '미실행: B 토큰이 필요해 화면 개발자 도구로 직접 확인' },
  ]);
}

// 11단계: 기기 승인 경로를 토큰 없이 불러 거부되는지 봅니다. 승인 전 학생 토큰의 자료 요청은 토큰이 필요해 미실행으로 남깁니다.
async function stepElevenChecks(app, config) {
  return (await stepTenChecks(app, config)).concat([
    { attackId: 'anonymous_device_status', expected: '토큰 없는 GET /api/device/status는 401',
      observed: await sendRequest(new URL('/api/device/status', app)) },
    { attackId: 'anonymous_device_request', expected: '토큰 없는 POST /api/device/request는 401',
      observed: await sendRequest(new URL('/api/device/request', app), { method: 'POST', body: {} }) },
    { attackId: 'unapproved_device_note_read', expected: '승인 전 기기의 학생 토큰 GET /api/notes는 403 DEVICE_NOT_APPROVED',
      observed: '미실행: 학생 토큰이 필요해 화면에서 직접 확인' },
  ]);
}

// 12단계: 심판 격리 환경에서는 공개 HTTPS 주소로 보내는 GET·HEAD만 허용됩니다(node: 모듈도 fs·path·url·child_process·crypto만).
// 그래서 이 점검은 읽기 요청(GET)만 실제로 보내고, 쓰기 요청(POST·PUT·DELETE)이 필요한 점검은 보내지 않고 observed를 not_run으로 둡니다.
// 로그인·승인 기기가 필요한 정상·금지 요청은 화면 '실측 표 만들기'의 결과로 남기며 여기서는 not_run입니다.
// 심판의 41종 시험은 이 점검이 실행하지 않으므로 통과로 적지 않습니다. 점검은 20개 이하입니다.
const WRITE_NOT_RUN = 'not_run: 쓰기 요청(POST·PUT·DELETE)이라 격리 환경 제출 묶음에서 보내지 않음';
// 서버 함수를 거쳐 ops_events에 남는 점검(정적 파일 /data.json은 서버 함수를 거치지 않아 제외)
const SERVER_RECORDED_IDS = ['anonymous_api_list_read', 'anonymous_other_note_read', 'anonymous_notice_read', 'anonymous_device_status'];
async function stepTwelveChecks(app, config) {
  const notes = new URL('/api/notes', app);
  const otherNote = new URL('/api/notes/b0000000-0000-4000-8000-000000000001', app);
  const notice = new URL('/api/notices/c0000000-0000-4000-8000-000000000001', app);
  const AUTH_NOT_RUN = 'not_run: Authorization 헤더가 붙은 요청이라 격리 환경 제출 묶음에서 보내지 않음(화면 실측 표에서 확인)';
  const get = (attackId, url) => sendRequest(url, { attackId });
  const staticFile = await countNotes(new URL('/data.json', app), 'anonymous_static_note_read');
  const results = [
    { attackId: 'anonymous_static_note_read', expected: '2단계: 공개 GET /data.json에서 메모 0건 또는 404',
      observed: fit(`${staticFile.sent} → ${staticFile.count === null ? `메모 목록 없음 (HTTP ${staticFile.status})` : `HTTP ${staticFile.status}, 메모 ${staticFile.count}건`}`) },
    // 1첩반상: 무인증 목록 조회에 이어 같은 제출본에서 다른 사람(B)의 메모 한 건을 연속 조회합니다.
    { attackId: 'anonymous_api_list_read', expected: '3단계: 토큰 없는 GET /api/notes는 401', observed: await get('anonymous_api_list_read', notes) },
    { attackId: 'anonymous_other_note_read', expected: '4단계: 토큰 없는 GET /api/notes/:id(B 메모)는 401, 메모 없음', observed: await get('anonymous_other_note_read', otherNote) },
    { attackId: 'forged_token_list_read', expected: '3단계: 서명 없는 가짜 토큰의 GET /api/notes는 401', observed: AUTH_NOT_RUN },
    { attackId: 'forged_token_other_note_read', expected: '4단계: 서명 없는 가짜 토큰의 GET /api/notes/:id(B 메모)는 401', observed: AUTH_NOT_RUN },
    { attackId: 'anonymous_api_note_create', expected: '3단계: 토큰 없는 POST /api/notes는 401', observed: WRITE_NOT_RUN },
    { attackId: 'anonymous_api_note_update', expected: '3단계: 토큰 없는 PUT /api/notes/:id는 401', observed: WRITE_NOT_RUN },
    { attackId: 'anonymous_api_note_delete', expected: '3단계: 토큰 없는 DELETE /api/notes/:id는 401', observed: WRITE_NOT_RUN },
    { attackId: 'anon_data_api_note_read', expected: '5단계: 공개 키로 원본 Data API 메모 직접 조회(GET)는 거부', observed: await sendDataApi(config) },
    { attackId: 'anonymous_notice_read', expected: '8단계: 토큰 없는 GET /api/notices/:id는 401', observed: await get('anonymous_notice_read', notice) },
    { attackId: 'anonymous_notice_update', expected: '8단계: 토큰 없는 PUT /api/notices/:id는 401', observed: WRITE_NOT_RUN },
    { attackId: 'anonymous_note_restore', expected: '10단계: 토큰 없는 POST /api/restore/:id는 401', observed: WRITE_NOT_RUN },
    { attackId: 'anonymous_device_status', expected: '11단계: 토큰 없는 GET /api/device/status는 401', observed: await get('anonymous_device_status', new URL('/api/device/status', app)) },
    { attackId: 'anonymous_device_request', expected: '11단계: 토큰 없는 POST /api/device/request는 401', observed: WRITE_NOT_RUN },
  ];
  // 마지막으로 작전실 요약의 공개 보기(로그인 없는 요청의 가린 서버 기록)를 읽어, 위 점검 이름이 서버 기록에 몇 줄 남았는지 응답 그대로 적습니다.
  results.push({ attackId: 'ops_summary_anonymous_records', expected: '12단계: 토큰 없는 GET /api/ops/summary는 200 scope anonymous, 위 점검 이름이 붙은 가린 서버 기록이 있음',
    observed: await readOpsSummary(new URL('/api/ops/summary', app), SERVER_RECORDED_IDS.filter(id => results.some(item => item.attackId === id && !item.observed.startsWith('not_run')))) });
  results.push(
    { attackId: 'login_trials_table', expected: '1~11단계 로그인 정상 요청 허용·금지 요청 거부를 요청 ID·시각과 함께 표로 남김',
      observed: 'not_run: A 로그인·승인 기기가 필요해 화면 탈환 작전실의 「실측 표 만들기」로 학생이 직접 실행' },
    { attackId: 'engine_path_decisions', expected: '6·7·9단계: 미등록 기기 deny, 복합 이상 step_up, 다량 조회 회수 제안',
      observed: 'not_run: 반 엔진이 보내는 요청(로컬 npm run decider:test·detect:test는 가상 연습)' },
    { attackId: 'judge_trials_41', expected: '심판의 41종 시험', observed: 'not_run: 심판이 실행하며 이 점검은 결과를 받지 않음' },
  );
  return results;
}

// 작전실 공개 보기 응답에서 상태 코드·범위·기록 줄 수와, 이번에 보낸 점검 이름이 붙은 줄 수만 꺼냅니다(계산해 채우지 않음).
async function readOpsSummary(rawUrl, sentIds) {
  const url = tagged(rawUrl, 'ops_summary_anonymous_records');
  const response = await fetch(url, { attackId: 'ops_summary_anonymous_records', headers: attackHeaders('ops_summary_anonymous_records'), redirect: 'error', signal: AbortSignal.timeout(10000) });
  let data = null;
  try { data = await response.json(); } catch { /* JSON이 아니면 기록을 셀 수 없습니다. */ }
  const requestId = response.headers?.get?.('x-request-id');
  const trace = requestId ? `, 요청 ID ${requestId}` : '';
  const records = Array.isArray(data?.events?.records) ? data.events.records : null;
  const sent = sentLine(url);
  if (!response.ok || !records) return fit(`${sent} → HTTP ${response.status}${data?.scope ? `, scope ${data.scope}` : ''}, 가린 기록 없음${trace}`);
  const found = sentIds.filter(id => records.some(row => row.attackId === id));
  // 전체 줄 수는 뒤따르는 요청마다 늘어나므로 적지 않고, 이번에 보낸 점검 이름이 붙은 줄만 적습니다.
  return fit(`${sent} → HTTP ${response.status}, scope ${data.scope}, 점검 이름이 붙은 가린 기록 ${found.length}/${sentIds.length}${trace}`);
}

export async function runAttackChecks(config) {
  if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].includes(config.step)) {
    throw new Error('이 단계의 공격 점검을 src/attack-check.mjs에 구현해 주세요.');
  }
  const app = appUrl(config);
  if (config.step === 12) return stepTwelveChecks(app, config);
  if (config.step === 11) return stepElevenChecks(app, config);
  if (config.step === 10) return stepTenChecks(app, config);
  if (config.step === 9) return stepNineChecks(app, config);
  if (config.step === 8) return stepEightChecks(app, config);
  if (config.step === 7) return stepSevenChecks(app, config);
  if (config.step === 6) return stepSixChecks(app, config);
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
