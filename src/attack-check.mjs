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
  // 12단계: 서버가 붙인 요청 ID(X-Request-Id)와 확인 시각을 함께 적어 작전실 서버 기록과 대조할 수 있게 합니다.
  const requestId = response.headers?.get?.('x-request-id');
  const trace = requestId ? `, 요청 ID ${requestId}, ${new Date().toISOString()}` : '';
  return `HTTP ${response.status}${count === null ? '' : `, 메모 ${count}건`}${trace}`;
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
// 11단계: 키 값은 코드·Git에 두지 않고, npm run bundle을 실행할 때 환경변수 SUPABASE_PUBLISHABLE_KEY로만 받습니다.
// 값이 없으면 이 점검은 보내지 않고 미실행으로 남깁니다. 서버 전용 키는 쓰지 않습니다.
const PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? '';

async function sendDataApi(config, { method = 'GET', body } = {}) {
  if (!PUBLISHABLE_KEY) return '미실행: SUPABASE_PUBLISHABLE_KEY 환경변수가 없어 보내지 않음';
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

// 12단계: 제출 묶음은 점검 20개까지만 받으므로 1~11단계의 비로그인 거부 요청을 다시 보내고(실측),
// 로그인·승인 기기가 필요한 정상·금지 요청은 화면 '실측 표 만들기'의 결과로 남기며 여기서는 미실행으로 적습니다.
// 심판의 41종 시험은 이 점검이 실행하지 않으므로 통과로 적지 않습니다.
async function stepTwelveChecks(app, config) {
  const notes = new URL('/api/notes', app);
  const item = new URL('/api/notes/00000000-0000-4000-8000-000000000000', app);
  const notice = new URL('/api/notices/c0000000-0000-4000-8000-000000000001', app);
  const probe = { title: '자기 점검', body: '비로그인 요청 시도' };
  const staticFile = await countNotes(new URL('/data.json', app));
  return [
    { attackId: 'anonymous_static_note_read', expected: '2단계: 공개 /data.json에서 메모 0건 또는 404',
      observed: staticFile.count === null ? `메모 목록 없음 (HTTP ${staticFile.status})` : `HTTP ${staticFile.status}, 메모 ${staticFile.count}건` },
    { attackId: 'anonymous_api_list_read', expected: '3단계: 토큰 없는 GET /api/notes는 401', observed: await sendRequest(notes) },
    { attackId: 'forged_token_list_read', expected: '3단계: 서명 없는 가짜 토큰의 GET /api/notes는 401',
      observed: await sendRequest(notes, { authorization: `Bearer ${unsignedToken(config)}` }) },
    { attackId: 'anonymous_api_note_create', expected: '3단계: 토큰 없는 POST /api/notes는 401', observed: await sendRequest(notes, { method: 'POST', body: probe }) },
    { attackId: 'anonymous_api_note_update', expected: '3단계: 토큰 없는 PUT /api/notes/:id는 401', observed: await sendRequest(item, { method: 'PUT', body: probe }) },
    { attackId: 'anonymous_api_note_delete', expected: '3단계: 토큰 없는 DELETE /api/notes/:id는 401', observed: await sendRequest(item, { method: 'DELETE' }) },
    { attackId: 'anon_data_api_note_read', expected: '5단계: 공개 키로 원본 Data API 메모 직접 조회는 거부', observed: await sendDataApi(config) },
    { attackId: 'anonymous_notice_update', expected: '8단계: 토큰 없는 PUT /api/notices/:id는 401',
      observed: await sendRequest(notice, { method: 'PUT', body: { title: '자기 점검', body: '비로그인 공지 수정 시도', role: 'instructor' } }) },
    { attackId: 'anonymous_note_restore', expected: '10단계: 토큰 없는 POST /api/restore/:id는 401',
      observed: await sendRequest(new URL('/api/restore/b0000000-0000-4000-8000-000000000001', app), { method: 'POST', body: {} }) },
    { attackId: 'anonymous_device_request', expected: '11단계: 토큰 없는 POST /api/device/request는 401',
      observed: await sendRequest(new URL('/api/device/request', app), { method: 'POST', body: {} }) },
    { attackId: 'anonymous_ops_summary', expected: '12단계: 토큰 없는 GET /api/ops/summary는 401', observed: await sendRequest(new URL('/api/ops/summary', app)) },
    { attackId: 'login_trials_table', expected: '1~11단계 로그인 정상 요청 허용·금지 요청 거부를 요청 ID·시각과 함께 표로 남김',
      observed: '미실행: A 로그인·승인 기기가 필요해 화면 탈환 작전실의 「실측 표 만들기」로 학생이 직접 실행' },
    { attackId: 'ops_summary_matches_log', expected: '작전실 요약 수치가 같은 요청 ID의 가린 서버 로그(ops summary) 줄과 같음',
      observed: '미실행: 로그인 토큰이 필요해 화면과 Vercel Logs에서 학생이 직접 대조' },
    { attackId: 'engine_path_decisions', expected: '6·7·9단계: 미등록 기기 deny, 복합 이상 step_up, 다량 조회 회수 제안',
      observed: '미실행: 반 엔진이 보내는 요청(로컬 npm run decider:test·detect:test는 가상 연습)' },
    { attackId: 'judge_trials_41', expected: '심판의 41종 시험',
      observed: '미실행: 심판이 실행하며 이 점검은 결과를 받지 않음' },
  ];
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
