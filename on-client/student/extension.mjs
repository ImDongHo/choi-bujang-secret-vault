// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.

// 13단계: 로그인 사용자·현재 기기·세션 표시(renderIdentity).
// - 입력 { me, devices, sessions } 는 각각 { status, mode, data?, error? } 입니다.
// - 호출될 때마다 새 DOM을 만들어 돌려줍니다. 제공 화면이 학생 칸을 통째로 바꾸므로 이전 값이 남지 않습니다.
// - 오류일 때는 사용자·기기·세션 값을 그리지 않고, 서버 message만 글자로 보여 줍니다.
// - 받은 값이 비어 있거나 모르는 상태값이면 지어내지 않고 「확인 불가」로 표시합니다.
// - document.createElement 와 textContent 만 씁니다(HTML 문자열은 해석하지 않음).
// - 기기 보안 상태 표시는 악성코드 검사나 치료 기능이 아닙니다.
const MODE_TEXT = { demo: '예제 자료', disconnected: '연결 없음', unknown: '확인 불가' };
const DEVICE_STATUS_TEXT = { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' };
const SESSION_STATUS_TEXT = { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' };
// 정상으로 보여도 되는 상태는 이 둘뿐입니다. 나머지(미충족·만료·철회됨·확인 불가)는 글자로 「주의」를 붙입니다.
const NORMAL_STATUS = { device: 'compliant', session: 'active' };

function textNode(tag, text, attrs = {}) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

const isText = (value) => typeof value === 'string' && value.trim() !== '';
const shown = (value) => (isText(value) ? value : '확인 불가');

// 데이터 출처 안내: connected 가 아니면 어느 상태(loading·ok·error)에서도 함께 보여 줍니다.
function modeNotice(mode) {
  if (mode === 'connected') return null;
  const text = MODE_TEXT[mode] ?? MODE_TEXT.unknown;
  return textNode('p', `데이터 출처: ${text}`, { 'data-mode': mode ?? 'unknown', class: 'student-mode' });
}

// 상태값 한 개를 「한국어 (원래 값)」으로 보여 주고, 정상이 아니면 글자로 주의를 붙입니다.
function statusLine(label, kind, status) {
  const table = kind === 'device' ? DEVICE_STATUS_TEXT : SESSION_STATUS_TEXT;
  const known = Object.hasOwn(table, status);
  const value = known ? status : 'unknown';
  const normal = value === NORMAL_STATUS[kind];
  const text = `${label}: ${table[value]} (${known ? status : '알 수 없는 값'})${normal ? '' : ' ⚠ 주의'}`;
  return textNode('p', text, { 'data-status': value, class: normal ? 'student-status-normal' : 'student-status-warning' });
}

// loading·error·기타 상태를 글자로 보여 줍니다. ok 가 아니면 이전 값은 그리지 않습니다.
function notOkLine(resource) {
  if (resource?.status === 'loading') return textNode('p', '불러오는 중', { 'data-state': 'loading' });
  if (resource?.status === 'error') {
    const message = isText(resource.error?.message) ? resource.error.message : '서버 메시지 없음';
    const prefix = resource.error?.code === 'CONTRACT_MISMATCH' ? '확인 불가' : '연결 실패';
    return textNode('p', `${prefix}: ${message}`, { 'data-state': 'error', role: 'alert' });
  }
  return textNode('p', '확인 불가', { 'data-state': 'unknown' });
}

function section(title, resource, fillOk) {
  const box = textNode('section', undefined, { 'data-resource': title });
  box.append(textNode('h3', title));
  const notice = modeNotice(resource?.mode ?? null);
  if (notice) box.append(notice);
  if (resource?.status === 'ok') fillOk(box, resource.data);
  else box.append(notOkLine(resource));
  return box;
}

function fillMe(box, data) {
  const user = data?.user;
  const device = data?.device;
  const session = data?.session;
  if (!user || !device || !session) {
    box.append(textNode('p', '확인 불가: 로그인 정보 형식이 올바르지 않습니다.', { 'data-state': 'unknown' }));
    return;
  }
  box.append(
    textNode('p', `사용자: ${shown(user.label)} (ID ${shown(user.id)})`, { 'data-field': 'user' }),
    textNode('p', `현재 기기: ${shown(device.label)} (ID ${shown(device.id)})`, { 'data-field': 'device' }),
    statusLine('기기 보안 상태', 'device', device.status),
    textNode('p', `현재 세션: ID ${shown(session.id)}`, { 'data-field': 'session' }),
    statusLine('세션 상태', 'session', session.status),
  );
}

function fillList(kind) {
  return (box, data) => {
    if (!Array.isArray(data)) {
      box.append(textNode('p', '확인 불가: 목록 형식이 올바르지 않습니다.', { 'data-state': 'unknown' }));
      return;
    }
    if (data.length === 0) {
      box.append(textNode('p', kind === 'device' ? '등록된 기기 없음' : '세션 없음', { 'data-state': 'empty' }));
      return;
    }
    const list = textNode('ul');
    for (const entry of data) {
      const item = textNode('li');
      const name = kind === 'device' ? `${shown(entry?.label)} (ID ${shown(entry?.id)})` : `세션 ID ${shown(entry?.id)}`;
      item.append(textNode('span', name), statusLine(kind === 'device' ? '보안 상태' : '상태', kind, entry?.status));
      list.append(item);
    }
    box.append(list);
  };
}

// 14단계: 선택한 업무 앱 한 개의 접근 판정 표시(renderDecision).
// - 입력 { status, mode, data?, error?, appId }. status 는 idle·loading·ok·error, data 는 { appId, decision, reason, checkedAt }.
// - 판정은 「한국어(원래 값)」으로 쓰고, 목록에 없는 값은 확인 불가(unknown)로 바꿔 허용처럼 보이지 않게 합니다.
// - 요청 실패(error)는 판정을 받지 못한 것이며 접근 거부 판정과 다르게 표시합니다.
// - allow 는 정책상 허용일 뿐 실제 앱 접속 성공을 보장하지 않고, challenge 는 이 화면이 추가 인증을 대신하지 않습니다.
const DECISION_TEXT = {
  allow: { label: '허용', note: '정책상 이 앱 접근이 허용되었습니다. 실제 앱 접속 성공을 보장하지는 않습니다.' },
  deny: { label: '거부', note: '정책상 이 앱 접근이 거부되었습니다.' },
  challenge: { label: '추가 확인 필요', note: '추가 인증 또는 확인이 필요합니다. 이 화면은 확인 절차를 대신 수행하지 않습니다.' },
  unknown: { label: '확인 불가', note: '판정을 확인할 수 없습니다. 허용되지 않은 것으로 취급하세요.' },
};
const UNVERIFIED_CODES = ['CONTRACT_MISMATCH', 'ENGINE_RESULT_UNVERIFIED'];

function timeText(value) {
  if (!isText(value)) return '확인 불가';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? `확인 불가 (${value})` : `${date.toLocaleString('ko-KR')} (${value})`;
}

function decisionBox(state, attrs = {}) {
  return textNode('div', undefined, { 'data-testid': 'student-decision-view', 'data-state': state, ...attrs });
}

function renderDecisionView({ status, mode, data, error, appId } = {}) {
  const requested = isText(appId) ? appId : null;
  const appLine = () => textNode('p', `업무 앱: ${requested ?? '확인 불가'}`, { 'data-field': 'app' });
  const withNotice = (box) => {
    const notice = modeNotice(mode ?? null);
    if (notice) box.append(notice);
    return box;
  };

  if (status === 'idle') {
    const box = decisionBox('idle', { 'data-decision': 'none' });
    box.append(textNode('p', '요청 전: 업무 앱을 하나 골라 접속을 요청하세요.'));
    return box;
  }
  if (status === 'loading') {
    const box = withNotice(decisionBox('loading', { 'data-decision': 'pending' }));
    box.append(appLine(), textNode('p', '요청 중: 판정 확인 중', { role: 'status' }));
    return box;
  }
  if (status === 'error') {
    const unverified = UNVERIFIED_CODES.includes(error?.code);
    const box = withNotice(decisionBox('error', { 'data-decision': unverified ? 'unknown' : 'request-failed' }));
    const message = isText(error?.message) ? error.message : '서버 메시지 없음';
    box.append(
      appLine(),
      textNode('p', unverified ? `판정: 확인 불가(unknown) · 응답 확인 실패: ${message}` : `요청 실패: ${message}`, { role: 'alert' }),
      textNode('p', unverified
        ? '서버 응답을 판정으로 확인할 수 없습니다. 허용되지 않은 것으로 취급하며, 접근 거부 판정도 아닙니다.'
        : '판정을 받지 못했습니다. 이것은 접근 거부 판정이 아니며 허용도 아닙니다. 필요하면 직접 다시 요청하세요.'),
    );
    return box;
  }
  if (status !== 'ok') {
    const box = withNotice(decisionBox('unknown', { 'data-decision': 'unknown' }));
    box.append(appLine(), textNode('p', '판정: 확인 불가(unknown) · 화면 상태를 확인할 수 없습니다. 허용되지 않은 것으로 취급하세요.'));
    return box;
  }

  const raw = data?.decision;
  const sameApp = requested === null || data?.appId === requested;
  const known = sameApp && typeof raw === 'string' && Object.hasOwn(DECISION_TEXT, raw);
  const decision = known ? raw : 'unknown';
  const info = DECISION_TEXT[decision];
  const box = withNotice(decisionBox('ok', { 'data-decision': decision }));
  box.append(
    textNode('p', `업무 앱: ${shown(data?.appId)}`, { 'data-field': 'app' }),
    textNode('p', `판정: ${info.label}(${decision})`, {
      'data-field': 'decision',
      class: decision === 'allow' ? 'student-status-normal' : 'student-status-warning',
    }),
  );
  if (!sameApp) box.append(textNode('p', `요청한 앱(${requested})과 판정 대상 앱이 달라 판정을 확인할 수 없습니다.`, { role: 'alert' }));
  else if (!known) box.append(textNode('p', `받은 값: ${typeof raw === 'string' && raw ? raw : '없음'} (목록에 없는 값)`, { 'data-field': 'raw-decision' }));
  box.append(
    textNode('p', info.note),
    textNode('p', `판정 이유: ${isText(data?.reason) ? data.reason : '확인 불가 (사유 정보 없음)'}`, { 'data-field': 'reason' }),
    textNode('p', `판정 시각: ${timeText(data?.checkedAt)}`, { 'data-field': 'checkedAt' }),
  );
  return box;
}

// 15단계: 내 접속 기록·저장된 XDR 경보 목록과 상세(renderEvents).
// - 입력 { status, mode, data?, error? }. data 는 서버가 내 SDP 감사 기록에서 현재 등록 정보와 맞춰 본 내 기록(최근 40건까지)입니다.
//   전체 직원 이력이나 실시간 전체 위협 탐지가 아니며, 화면을 열 때 새로 탐지하지 않습니다.
// - 받은 배열은 복사해서 at 기준 최신순으로 정렬합니다. 원본 배열은 바꾸지 않습니다.
// - 필터 세 개(기록 종류·업무 앱·접속 상태)는 전체 값 all, 나머지는 받은 원래 값이며 받은 배열 안에서만 거릅니다.
// - 「<event.id> 상세」 버튼으로 근거·규칙·세 상태를 따로 보여 줍니다. 조치 버튼은 만들지 않습니다.
// - 다시 불러오기(loading)·오류·새 자료가 오면 이전 목록과 상세 선택을 지웁니다.
const EVENT_KIND_TEXT = { access: '접속 기록', xdr: 'XDR 경보' };
const ACCESS_STATE_TEXT = { allowed: '허용됨', denied: '거부됨', unknown: '확인 불가' };
const EVENT_STATE_ROWS = [
  { key: 'access', label: '접속 상태(state.access)', table: ACCESS_STATE_TEXT, normal: 'allowed' },
  { key: 'session', label: '세션 상태(state.session)', table: SESSION_STATUS_TEXT, normal: 'active' },
  { key: 'device', label: '기기 상태(state.device)', table: DEVICE_STATUS_TEXT, normal: 'compliant' },
];
const ALL = 'all';
const NO_APP = '';

const kindText = (kind) => (Object.hasOwn(EVENT_KIND_TEXT, kind) ? `${EVENT_KIND_TEXT[kind]}(${kind})` : `확인 불가(${shown(kind)})`);
const appText = (appId) => (isText(appId) ? appId : '앱 확인 불가(appId 없음)');
const accessText = (value) => (Object.hasOwn(ACCESS_STATE_TEXT, value) ? `${ACCESS_STATE_TEXT[value]}(${value})` : `확인 불가(${shown(value)})`);
const appValue = (appId) => (isText(appId) ? appId : NO_APP);
const timeValue = (at) => {
  const t = isText(at) ? Date.parse(at) : NaN;
  return Number.isFinite(t) ? t : -Infinity;
};

// 세 상태 중 하나를 「라벨: 한국어(원래 값)」으로 씁니다. 모르는 값과 unknown 은 확인 불가(unknown)입니다.
function eventStateLine({ key, label, table, normal }, value) {
  const known = typeof value === 'string' && Object.hasOwn(table, value);
  const shownValue = known ? value : 'unknown';
  const isNormal = shownValue === normal;
  const extra = known ? '' : ` · 받은 값: ${typeof value === 'string' && value ? value : '없음'}`;
  return textNode('p', `${label}: ${table[shownValue]}(${shownValue})${extra}${isNormal ? '' : ' ⚠ 주의'}`, {
    'data-state-key': key,
    'data-status': shownValue,
    class: isNormal ? 'student-status-normal' : 'student-status-warning',
  });
}

function textRows(title, rows, field) {
  const block = textNode('div', undefined, { 'data-field': field });
  block.append(textNode('h5', title));
  if (!Array.isArray(rows) || rows.length === 0) {
    block.append(textNode('p', '없음'));
    return block;
  }
  const list = textNode('ul');
  for (const row of rows) list.append(textNode('li', `${shown(row?.id)}: ${shown(row?.text)}`));
  block.append(list);
  return block;
}

function eventDetail(event) {
  const box = textNode('section', undefined, { 'data-student-event-detail': String(event.id), 'aria-label': `${event.id} 상세 내용` });
  box.append(
    textNode('h4', `${event.id} 상세`),
    textNode('p', `사건 ID: ${shown(event.id)}`),
    textNode('p', `종류: ${kindText(event.kind)}`),
    textNode('p', `업무 앱: ${appText(event.appId)}`),
    textNode('p', `시각: ${timeText(event.at)}`),
    textRows('근거(evidence)', event.evidence, 'evidence'),
    textRows('규칙(rules)', event.rules, 'rules'),
  );
  const states = textNode('div', undefined, { 'data-field': 'state' });
  states.append(textNode('h5', '상태(state)'));
  for (const row of EVENT_STATE_ROWS) states.append(eventStateLine(row, event.state?.[row.key]));
  box.append(states);
  // 16단계: 조치가 넘어온 경우에만 「<action> 미지원」 비활성 버튼을 둡니다. 클릭 처리기가 없고 어떤 요청도 보내지 않습니다.
  const actions = Array.isArray(event.supportedActions) ? event.supportedActions : [];
  if (actions.length === 0) {
    box.append(textNode('p', '지원 조치: 없음 (조치 버튼을 만들지 않습니다)', { 'data-field': 'supportedActions' }));
    return box;
  }
  const actionBox = textNode('div', undefined, { 'data-field': 'supportedActions', 'data-actions': 'unsupported' });
  actionBox.append(textNode('h5', '조치(아직 지원하지 않음)'));
  for (const action of actions) {
    const name = `${shown(action)} 미지원`;
    actionBox.append(textNode('button', name, { type: 'button', disabled: '', 'aria-disabled': 'true', 'aria-label': name, 'data-unsupported-action': shown(action) }));
  }
  actionBox.append(textNode('p', '아직 지원하지 않는 조치입니다. 조치 실행 연결은 준비 중이며, 이 버튼은 어떤 요청도 보내지 않고 조치도 실행하지 않습니다.'));
  box.append(actionBox);
  return box;
}

function filterSelect(id, label, current, options, onChange) {
  const wrap = textNode('div', undefined, { class: 'student-filter' });
  const labelNode = textNode('label', label, { for: id });
  const select = textNode('select', undefined, { id, 'aria-label': label, 'data-filter': id });
  select.append(textNode('option', '전체', { value: ALL }));
  for (const { value, text } of options) select.append(textNode('option', text, { value }));
  select.value = options.some((o) => o.value === current) ? current : ALL;
  select.addEventListener('change', () => onChange(select.value));
  wrap.append(labelNode, select);
  return wrap;
}

function distinctOptions(events, pick, toText) {
  const seen = new Map();
  for (const event of events) {
    const value = pick(event);
    if (!seen.has(value)) seen.set(value, toText(event));
  }
  return [...seen].map(([value, text]) => ({ value, text }));
}

// 16단계: 기기·세션·알림·도움정보 상태(renderStatus).
// - 입력 { devices, sessions, notifications, diagnostics, mode }. devices·sessions·diagnostics 는 { status, mode, data?, error? }.
// - loading·빈 목록·실패를 서로 다른 문장으로 보여 줍니다. 다시 시도는 사용자가 직접 누르는 버튼으로만 하며 자동 재요청은 없습니다.
// - 제공 화면이 상태가 바뀔 때마다 다시 부르므로 매번 새로 그립니다. 다시 불러와 성공하면 이전 실패 안내는 남지 않습니다.
// - 도움정보는 제공 화면이 조회해 넘긴 값만 씁니다(학생 코드는 /api/diagnostics 를 부르지 않음).
//   requestId·component·version·checkedAt·engine.mode·engine.code 여섯 값만 표시하고, 「도움정보 복사」를 누를 때만 이 값을 복사합니다.
const RESOURCE_TEXT = {
  me: '로그인 정보', apps: '업무 앱', events: '보안 기록', devices: '등록 기기', sessions: '현재 연결 세션',
  access: '접속 판정', diagnostics: '도움정보', vulnerabilities: '설치 패키지 조회',
};
const DIAGNOSTIC_FIELDS = [
  { label: 'requestId', pick: (d) => d?.requestId },
  { label: 'component', pick: (d) => d?.component },
  { label: 'version', pick: (d) => d?.version },
  { label: 'checkedAt', pick: (d) => d?.checkedAt },
  { label: 'engine.mode', pick: (d) => d?.engine?.mode },
  { label: 'engine.code', pick: (d) => d?.engine?.code },
];
// 비밀처럼 보이는 값은 화면에도 복사본에도 넣지 않습니다.
const SECRET_LIKE = /(?:bearer\s+\S+|sk-[A-Za-z0-9_-]{8,}|eyJ[A-Za-z0-9_-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|passw(?:or)?d|secret|token|비밀번호|토큰)\s*[:=])/i;
const safeValue = (value) => (typeof value === 'string' && value.trim() !== '' && value.length <= 200 && !SECRET_LIKE.test(value) ? value : null);
const RETRY_TEXT = '다시 시도는 위쪽 「다시 불러오기」 버튼을 직접 누르세요. 자동으로 다시 요청하지 않습니다.';

function resourceName(resource) {
  return Object.hasOwn(RESOURCE_TEXT, resource) ? `${RESOURCE_TEXT[resource]}(${resource})` : `확인 불가(${shown(resource)})`;
}

// 실패 안내: 무엇을 불러오지 못했는지, 시간 초과 여부, message, 사용자가 누를 다시 시도 버튼.
function failureLines(what, error, retryText) {
  const code = isText(error?.code) ? error.code : 'UNKNOWN';
  const message = isText(error?.message) ? error.message : '서버 메시지 없음';
  let head = `불러오기 실패(${what}): ${message}`;
  if (code === 'TIMEOUT') head = `시간 초과(${what}): 서버 응답 시간이 초과돼 불러오지 못했습니다. (${message})`;
  else if (code === 'CONTRACT_MISMATCH') head = `확인 불가(${what}): 응답 형식을 확인할 수 없어 표시하지 않습니다. (${message})`;
  return [
    textNode('p', `${head} [code: ${code}]`, { role: 'alert', 'data-state': 'error', 'data-error-code': code }),
    textNode('p', retryText, { 'data-field': 'retry' }),
  ];
}

function statusListSection({ title, scope, resource, emptyText, item }) {
  const box = textNode('section', undefined, { 'data-status-resource': title });
  box.append(textNode('h3', title), textNode('p', scope, { 'data-field': 'scope' }));
  const notice = modeNotice(resource?.mode ?? null);
  if (notice) box.append(notice);
  const status = resource?.status;
  if (status === 'loading') box.append(textNode('p', '불러오는 중', { role: 'status', 'data-state': 'loading' }));
  else if (status === 'error') box.append(...failureLines(title, resource.error, RETRY_TEXT));
  else if (status !== 'ok') box.append(textNode('p', '확인 불가: 상태를 확인할 수 없습니다.', { 'data-state': 'unknown' }));
  else if (!Array.isArray(resource.data)) box.append(textNode('p', '확인 불가: 목록 형식이 올바르지 않습니다.', { 'data-state': 'unknown' }));
  else if (resource.data.length === 0) box.append(textNode('p', emptyText, { 'data-state': 'empty' }));
  else {
    const list = textNode('ul');
    for (const entry of resource.data) list.append(item(entry));
    box.append(textNode('p', `${resource.data.length}건`, { 'data-field': 'count' }), list);
  }
  return box;
}

function notificationsSection(notifications) {
  const box = textNode('section', undefined, { 'data-status-resource': 'notifications' });
  box.append(textNode('h3', '알림'));
  if (!Array.isArray(notifications)) {
    box.append(textNode('p', '확인 불가: 알림 형식이 올바르지 않습니다.', { 'data-state': 'unknown' }));
    return box;
  }
  if (notifications.length === 0) {
    box.append(textNode('p', '주의할 알림이 없습니다.', { 'data-state': 'empty' }));
    return box;
  }
  const list = textNode('ul');
  for (const n of notifications) {
    const code = safeValue(n?.code) ?? '확인 불가';
    const message = safeValue(n?.message) ?? '메시지를 표시할 수 없음';
    list.append(textNode('li', `자료: ${resourceName(n?.resource)} · 코드: ${code} · 내용: ${message}`, { 'data-notification-resource': shown(n?.resource) }));
  }
  box.append(textNode('p', `알림 ${notifications.length}건`, { 'data-field': 'count' }), list);
  return box;
}

function diagnosticsSection(diagnostics) {
  const box = textNode('section', undefined, { 'data-status-resource': 'diagnostics' });
  box.append(textNode('h3', '도움정보'));
  const status = diagnostics?.status;
  let safe = null;
  if (status === 'idle' || status == null) {
    box.append(textNode('p', '도움정보를 아직 불러오지 않았습니다. 제공 화면의 「도움정보 불러오기」 버튼을 직접 누르세요.', { 'data-state': 'idle' }));
  } else if (status === 'loading') {
    box.append(textNode('p', '도움정보 불러오는 중', { role: 'status', 'data-state': 'loading' }));
  } else if (status === 'error') {
    box.append(...failureLines('도움정보', diagnostics.error, '다시 시도는 제공 화면의 「도움정보 불러오기」 버튼을 직접 누르세요. 자동으로 다시 요청하지 않습니다.'));
  } else if (status === 'ok') {
    safe = {};
    const dl = textNode('dl', undefined, { 'data-field': 'diagnostics' });
    for (const { label, pick } of DIAGNOSTIC_FIELDS) {
      const value = safeValue(pick(diagnostics.data));
      safe[label] = value ?? '확인 불가';
      dl.append(textNode('dt', label), textNode('dd', value ?? '확인 불가'));
    }
    box.append(dl);
  } else {
    box.append(textNode('p', '확인 불가: 도움정보 상태를 확인할 수 없습니다.', { 'data-state': 'unknown' }));
  }

  const result = textNode('p', '', { role: 'status', 'data-field': 'copy-result' });
  const button = textNode('button', '도움정보 복사', { type: 'button', 'aria-label': '도움정보 복사' });
  if (!safe) button.setAttribute('disabled', '');
  button.addEventListener('click', async () => {
    if (!safe) return;
    const text = JSON.stringify(safe, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      result.textContent = '위 여섯 값만 클립보드에 복사했습니다. 붙여 넣기 전에 비밀번호·토큰·API 키가 없는지 직접 확인하세요.';
    } catch {
      result.textContent = '자동 복사를 사용할 수 없습니다. 위 값을 직접 선택해 Ctrl+C로 복사하세요.';
    }
  });
  box.append(
    textNode('p', '「도움정보 복사」는 도움 요청에 쓸 위 여섯 값만 클립보드에 복사합니다. 누를 때만 복사하며 어디에도 전송하지 않습니다.'),
    button,
    result,
  );
  return box;
}

function renderStatusView({ devices, sessions, notifications, diagnostics, mode } = {}) {
  const root = textNode('div', undefined, { 'data-testid': 'student-status-view' });
  const notice = modeNotice(mode ?? null);
  if (notice) root.append(notice);
  root.append(
    statusListSection({
      title: '등록 기기',
      scope: '범위: 내 이름으로 등록되고 회수되지 않은 기기(최대 100개). 지금 쓰는 기기가 맨 앞에 옵니다.',
      resource: devices,
      emptyText: '등록된 기기가 없습니다.',
      item: (d) => {
        const li = textNode('li');
        li.append(textNode('span', `${shown(d?.label)} (ID ${shown(d?.id)})`), statusLine('보안 상태', 'device', d?.status));
        return li;
      },
    }),
    statusListSection({
      title: '현재 연결 세션',
      scope: '범위: 지금 검증된 연결 하나만 표시합니다. 지난 세션 목록이 아닙니다.',
      resource: sessions,
      emptyText: '현재 연결 없음',
      item: (s) => {
        const li = textNode('li');
        li.append(textNode('span', `세션 ID ${shown(s?.id)}`), statusLine('상태', 'session', s?.status));
        return li;
      },
    }),
    notificationsSection(notifications),
    diagnosticsSection(diagnostics),
  );
  return root;
}

// 17단계: 앱 내부 AI 연결 점검 표시(renderAiConnection)와 사건 설명 기초(renderExplanation).
// - AI 연결은 앱 서버를 통해서만 이뤄집니다. 학생 코드는 주소·열쇠를 받거나 요청을 보내지 않고, 받은 상태만 그립니다.
// - 모델 목록 응답(연결 점검)은 사건 설명 실행이 아닙니다. 사건 설명은 보안 기록에서 따로 요청하고 확인합니다.
// - 호출될 때마다 새로 그립니다. 다시 점검해 성공하거나 idle(계정 연결 다시 하기 등)이 오면 이전 결과·오류 안내는 남지 않습니다.
// - 자동으로 다시 점검하지 않습니다. 다시 점검은 사용자가 버튼을 직접 누릅니다.
const AI_RETRY_TEXT = '다시 점검은 「현재 API 연결 점검」(또는 「AI 연결 점검」) 버튼을 직접 누르세요. 자동으로 다시 점검하지 않습니다.';
const AI_ERROR_GROUPS = [
  { kind: 'provisioning', title: '권한 준비 중·확인 불가', codes: ['ON_AI_PROVISIONING_PENDING', 'ON_AI_AUTHORIZATION_CHANGED', 'AI_REQUEST_UNVERIFIED', 'SUBJECT_SCOPE_UNVERIFIED'],
    guide: '운영 측의 계정·앱 권한 준비가 끝나지 않았거나 확인할 수 없습니다. 학생 잘못으로 단정하지 않습니다. 담당자에게 계정 연결과 앱 권한 확인을 요청하세요.' },
  { kind: 'auth', title: '인증 실패', codes: ['WB_CLCO_AUTH_REQUIRED'],
    guide: '보호 현황의 계정 연결을 다시 확인하고, 해결되지 않으면 담당자에게 확인하세요. Workbench 열쇠나 다른 열쇠를 복사해 붙이지 마세요.' },
  { kind: 'access', title: '접근 제한', codes: ['WB_CLCO_ACCESS_BLOCKED'],
    guide: '이 앱의 AI 이용 권한이 제한됐습니다. 계정 연결을 다시 확인하고 담당자에게 앱 권한을 확인하세요.' },
  { kind: 'limit', title: '사용량·이용 한도', codes: ['WB_CLCO_COHORT_BUDGET_EXHAUSTED', 'WB_CLCO_LIMIT_REACHED'],
    guide: '반 사용량 또는 이용 한도에 도달했습니다. 담당자에게 확인하세요.' },
  { kind: 'session', title: '이용 시간 아님', codes: ['WB_CLCO_SESSION_CLOSED'],
    guide: '지금은 수업용 AI 이용 시간이 아닙니다. 이용 시간을 확인하세요.' },
  { kind: 'transient', title: '요청 제한·시간 초과·네트워크', codes: ['WB_CLCO_RATE_LIMITED', 'WB_CLCO_TIMEOUT', 'REQUEST_TIMEOUT', 'ENGINE_TIMEOUT', 'TIMEOUT', 'NETWORK_ERROR', 'SERVICE_UNAVAILABLE'],
    guide: '일시적인 제한이나 응답 지연입니다. 잠시 뒤 직접 다시 점검하세요.' },
  { kind: 'cancelled', title: '취소됨', codes: ['CANCELLED', 'WB_CLCO_CANCELLED', 'REQUEST_CANCELLED'],
    guide: '점검을 취소했습니다. 이전 결과는 현재 결과가 아닙니다.' },
  { kind: 'no-model', title: '쓸 수 있는 모델 없음', codes: ['ON_AI_MODEL_LIST_EMPTY', 'MODEL_NOT_CONFIGURED'],
    guide: '현재 앱 권한으로 쓸 수 있는 AI 모델이 없습니다. 담당자에게 모델 허용 설정 확인을 요청하세요.' },
  { kind: 'invalid', title: '응답 확인 불가', codes: ['ON_AI_INVALID_INPUT', 'ON_AI_INVALID_OUTPUT'],
    guide: 'AI 요청 또는 응답 형식을 확인할 수 없습니다. 기존 기록은 그대로입니다.' },
];
const AUDIENCE_TEXT = { test: '시험 연결 점검(test)', verified: '앱 권한 확인 후 점검(verified)' };
const safeCode = (code) => (typeof code === 'string' && /^[A-Z0-9_]{1,64}$/.test(code) ? code : 'UNKNOWN');

function aiErrorGroup(code) {
  return AI_ERROR_GROUPS.find((g) => g.codes.includes(code)) ?? AI_ERROR_GROUPS[0];
}

function aiBox(state, attrs = {}) {
  return textNode('div', undefined, { 'data-testid': 'student-ai-connection-view', 'data-state': state, ...attrs });
}

function renderAiConnectionView({ status, mode, data, error, checkedAt, explanationAccepted } = {}) {
  if (status === 'idle' || status == null) {
    const box = aiBox('idle');
    box.append(
      textNode('p', 'AI 연결 점검 전', { role: 'status' }),
      textNode('p', '아직 점검한 결과가 없습니다. 연결 완료 뒤 「현재 API 연결 점검」을 직접 누르세요.'),
    );
    return box;
  }
  const box = aiBox(status);
  const notice = modeNotice(mode ?? null);
  if (notice) box.append(notice);

  if (status === 'loading') {
    box.append(textNode('p', 'AI 연결 점검 중', { role: 'status' }), textNode('p', '점검을 멈추려면 「AI 연결 점검 취소」를 누르세요.'));
    return box;
  }
  if (status === 'error') {
    const code = safeCode(error?.code);
    const group = aiErrorGroup(code);
    const message = safeValue(error?.message) ?? '메시지를 표시할 수 없음';
    box.setAttribute('data-ai-error', group.kind);
    box.append(
      textNode('p', `AI 연결 점검 실패 · ${group.title}`, { role: 'alert' }),
      textNode('p', `오류 코드: ${code} · 내용: ${message}`, { 'data-field': 'error' }),
      textNode('p', group.guide, { 'data-field': 'guide' }),
      textNode('p', group.kind === 'cancelled' ? '다시 점검하려면 버튼을 직접 누르세요. 자동으로 다시 점검하지 않습니다.' : AI_RETRY_TEXT, { 'data-field': 'retry' }),
      textNode('p', '사건 설명은 실행하지 않았습니다.'),
    );
    return box;
  }
  if (status !== 'ok' || data?.transportChecked !== true || !Object.hasOwn(AUDIENCE_TEXT, data?.audienceAuthorization)) {
    box.setAttribute('data-state', 'unknown');
    box.append(textNode('p', '확인 불가: AI 연결 점검 결과를 확인할 수 없습니다. 연결 완료로 보지 않습니다.', { role: 'alert' }), textNode('p', AI_RETRY_TEXT));
    return box;
  }
  box.setAttribute('data-audience', data.audienceAuthorization);
  const count = Number.isInteger(data.modelCount) && data.modelCount >= 0 ? String(data.modelCount) : '확인 불가';
  box.append(
    textNode('p', `AI 연결 점검 결과: ${AUDIENCE_TEXT[data.audienceAuthorization]}`, { 'data-field': 'audience' }),
    textNode('p', data.audienceAuthorization === 'test'
      ? '시험 연결로 모델 응답만 확인했습니다. 앱 권한 발급이 확인된 것은 아닙니다.'
      : '점검 시각 기준으로 앱 권한 확인과 모델 응답을 확인했습니다.'),
    textNode('p', `응답 모델 수(modelCount): ${count}`, { 'data-field': 'modelCount' }),
    textNode('p', `점검 시각(checkedAt): ${timeText(checkedAt)}`, { 'data-field': 'checkedAt' }),
    textNode('p', `연결만 점검했습니다. 사건 설명은 아직 실행하지 않았습니다.${explanationAccepted === true ? '' : ' (사건 설명 결과 없음)'}`, { 'data-field': 'explanation-not-run' }),
    textNode('p', '사건 설명은 보안 기록에서 따로 요청하고 결과를 확인하세요. ' + AI_RETRY_TEXT),
  );
  return box;
}

// 18단계: 근거에 연결된 AI 사건 설명(renderExplanation).
// - 입력 { event, explanation, checkedAt }. event 는 보안 기록에서 고른 기록(15단계 모양) 또는 null 입니다.
// - 오류는 event 가 null 이어도 먼저 보여 줍니다. 오류 없이 event 만 없으면 기록을 먼저 고르라고 안내합니다.
// - 성공 표식(data-student-explanation-event)은 근거·규칙·실행 여부 대조를 모두 통과한 설명에만 붙입니다.
// - 근거 ID 를 event.evidence 와 대조하고, 없는 ID 는 지어내지 않고 설명 전체를 쓸 수 없다고 표시합니다.
// - unknown 상태는 확인 불가로 적고 정상·안전으로 바꾸지 않습니다. 제안은 사람 확인 전이며 실행되지 않았습니다.
// - 호출마다 새로 그리므로 다른 기록 선택·다시 불러오기·실패 때 이전 설명과 성공 표식이 남지 않습니다. 실행 버튼은 만들지 않습니다.
const EXPLAIN_STATE_ROWS = [
  { key: 'access', label: '접속' },
  { key: 'session', label: '세션' },
  { key: 'device', label: '기기' },
];
const safeText = (value, max) => (isText(value) && value.length <= max && !SECRET_LIKE.test(value) ? value : null);

function explanationBox(state, attrs = {}) {
  return textNode('div', undefined, { 'data-testid': 'student-explanation-view', 'data-state': state, ...attrs });
}

// 설명을 쓸 수 없는 까닭을 찾습니다. 문제가 없으면 null 입니다.
function explanationProblem(event, data) {
  if (!event || !isText(event.id)) return { code: 'ON_AI_INVALID_INPUT', reason: '선택한 기록 정보를 확인할 수 없습니다.' };
  if (!data || typeof data !== 'object') return { code: 'ON_AI_INVALID_OUTPUT', reason: '설명 응답 형식을 확인할 수 없습니다.' };
  if (data.executed !== false) return { code: 'ON_AI_INVALID_OUTPUT', reason: 'AI 가 조치를 이미 실행했다고 답한 설명은 쓸 수 없습니다.' };
  if (data.requiresHumanConfirmation !== true) return { code: 'ON_AI_INVALID_OUTPUT', reason: '사람 확인이 필요하다는 표시가 없어 설명을 쓸 수 없습니다.' };
  if (!safeText(data.summary, 1500)) return { code: 'ON_AI_INVALID_OUTPUT', reason: 'AI 요약을 확인할 수 없습니다.' };
  const evidence = Array.isArray(event.evidence) ? event.evidence : [];
  const known = new Set(evidence.map((e) => e?.id));
  const ids = data.evidenceIds;
  if (!Array.isArray(ids) || ids.length === 0) return { code: 'ON_AI_INVALID_OUTPUT', reason: '근거 부족: 설명이 인용한 근거가 없습니다.' };
  const missing = ids.filter((id) => !known.has(id));
  if (missing.length > 0) return { code: 'ON_AI_INVALID_OUTPUT', reason: `근거가 맞지 않음: 이 기록(${event.id})에 없는 근거 ID ${missing.map(shown).join(', ')}를 인용했습니다.` };
  if (new Set(ids).size !== ids.length || ids.length !== known.size) return { code: 'ON_AI_INVALID_OUTPUT', reason: '근거 부족: 이 기록의 근거를 빠짐없이 한 번씩 인용하지 않았습니다.' };
  const supported = Array.isArray(event.supportedActions) ? event.supportedActions : [];
  const proposals = data.proposals;
  if (!Array.isArray(proposals)) return { code: 'ON_AI_INVALID_OUTPUT', reason: '제안 형식을 확인할 수 없습니다.' };
  for (const p of proposals) {
    if (!supported.includes(p?.action)) return { code: 'ON_AI_INVALID_OUTPUT', reason: `연동 시스템이 지원하지 않는 조치(${shown(p?.action)})를 제안해 설명을 쓸 수 없습니다.` };
    if (!Array.isArray(p.evidenceIds) || p.evidenceIds.length === 0 || p.evidenceIds.some((id) => !known.has(id))) {
      return { code: 'ON_AI_INVALID_OUTPUT', reason: `근거가 맞지 않음: 제안(${shown(p.action)})의 근거 ID 가 이 기록에 없습니다.` };
    }
    if (!safeText(p.reason, 500)) return { code: 'ON_AI_INVALID_OUTPUT', reason: `제안(${shown(p.action)})의 이유를 확인할 수 없습니다.` };
  }
  return null;
}

function rejectedExplanation(event, problem) {
  // 근거 불일치·자료 부족 화면: 성공 표식을 붙이지 않고 요약·근거 내용도 보여 주지 않습니다.
  const box = explanationBox('rejected');
  box.append(
    textNode('p', `AI 설명을 쓸 수 없습니다 · 오류 코드: ${problem.code}`, { role: 'alert' }),
    textNode('p', `까닭: ${problem.reason}`, { 'data-field': 'reason' }),
    textNode('p', `대상 기록: ${event && isText(event.id) ? event.id : '확인 불가'}`),
    textNode('p', '설명 내용을 지어내거나 근거를 맞춰 넣지 않습니다. 기록은 그대로입니다.'),
  );
  return box;
}

function renderExplanationView({ event, explanation, checkedAt } = {}) {
  const status = explanation?.status;

  // 1) 오류가 먼저입니다(event 가 null 이어도).
  if (status === 'error') {
    const code = safeCode(explanation.error?.code);
    const message = safeValue(explanation.error?.message) ?? '메시지를 표시할 수 없음';
    const box = explanationBox('error');
    box.append(
      textNode('p', `AI 설명 실패: ${message}`, { role: 'alert' }),
      textNode('p', `오류 코드: ${code}`, { 'data-field': 'error-code' }),
    );
    if (code === 'ON_AI_INVALID_INPUT') box.append(textNode('p', '까닭: 근거 부족 — 설명에 필요한 기록의 근거·규칙을 확인할 수 없습니다.'));
    if (code === 'ON_AI_INVALID_OUTPUT') box.append(textNode('p', '까닭: 근거가 맞지 않음 — AI 설명의 근거·조치·응답 형식이 이 기록과 맞지 않습니다. AI 가 조치를 이미 실행했다고 답한 설명도 쓸 수 없어 여기에 해당합니다.'));
    box.append(
      textNode('p', '기록은 그대로입니다. AI 설명 실패는 과제 실패가 아니며, 업무 앱 판정과 보안 기록은 계속 사용할 수 있습니다.'),
      textNode('p', '필요하면 보안 기록에서 「AI 설명 요청」을 직접 다시 누르세요.'),
    );
    return box;
  }
  if (!event) {
    const box = explanationBox('no-event');
    box.append(textNode('p', '보안 기록에서 기록을 먼저 고르세요. 기록의 「AI 설명 요청」을 누르면 이곳에 설명이 표시됩니다.'));
    return box;
  }
  if (status === 'loading') {
    const box = explanationBox('loading');
    box.append(textNode('p', `설명 요청 중 (사건 ID: ${shown(event.id)})`, { role: 'status' }));
    return box;
  }
  if (status !== 'ok') {
    const box = explanationBox(status === 'idle' || status == null ? 'idle' : 'unknown');
    box.append(textNode('p', `선택한 기록: ${shown(event.id)} · 아직 표시할 AI 설명이 없습니다. 「AI 설명 요청」을 직접 누르세요.`));
    return box;
  }

  // 2) 성공 응답도 근거·실행 여부를 다시 대조합니다.
  const data = explanation.data;
  const problem = explanationProblem(event, data);
  if (problem) return rejectedExplanation(event, problem);

  const box = explanationBox('ok', { 'data-student-explanation-event': String(event.id) });
  const evidenceById = new Map(event.evidence.map((e) => [e.id, e]));
  box.append(
    textNode('p', `사건 ID: ${event.id}`, { 'data-field': 'event' }),
    textNode('h4', 'AI 설명(참고용)'),
    textNode('p', data.summary, { 'data-field': 'summary' }),
    textNode('p', `설명 시각: ${timeText(checkedAt)}`, { 'data-field': 'checkedAt' }),
    textNode('p', 'AI 설명은 해석입니다. 사실 판단은 아래 근거 글과 연동 시스템이 알려 준 상태로 하세요.'),
  );

  // 3) 인용한 근거와 규칙
  const evidenceBox = textNode('div', undefined, { 'data-field': 'cited-evidence' });
  evidenceBox.append(textNode('h5', '인용한 근거'));
  const evidenceList = textNode('ul');
  for (const id of data.evidenceIds) {
    evidenceList.append(textNode('li', `${id} — ${shown(evidenceById.get(id)?.text)}`, { 'data-evidence-id': String(id) }));
  }
  evidenceBox.append(evidenceList);
  const rulesBox = textNode('div', undefined, { 'data-field': 'rules' });
  rulesBox.append(textNode('h5', '규칙'));
  const rules = Array.isArray(event.rules) ? event.rules : [];
  if (rules.length === 0) rulesBox.append(textNode('p', '없음'));
  else {
    const list = textNode('ul');
    for (const r of rules) list.append(textNode('li', `${shown(r?.id)} — ${shown(r?.text)}`, { 'data-rule-id': shown(r?.id) }));
    rulesBox.append(list);
  }

  // 4) 확인 불가 상태(접속·세션·기기별)
  const unknownBox = textNode('div', undefined, { 'data-field': 'unknown-states' });
  unknownBox.append(textNode('h5', '확인 불가 상태'));
  const unknowns = EXPLAIN_STATE_ROWS.filter(({ key }) => {
    const v = event.state?.[key];
    const table = key === 'access' ? ACCESS_STATE_TEXT : key === 'session' ? SESSION_STATUS_TEXT : DEVICE_STATUS_TEXT;
    return v === 'unknown' || !Object.hasOwn(table, v);
  });
  if (unknowns.length === 0) unknownBox.append(textNode('p', '없음'));
  else {
    const list = textNode('ul');
    for (const { key, label } of unknowns) list.append(textNode('li', `${label}: 확인 불가(unknown)`, { 'data-state-key': key }));
    unknownBox.append(list, textNode('p', '확인 불가 상태는 정상이나 안전으로 보지 않습니다.'));
  }

  // 5)·6) 제안
  const proposalBox = textNode('div', undefined, { 'data-field': 'proposals' });
  proposalBox.append(textNode('h5', '제안'));
  const supported = Array.isArray(event.supportedActions) ? event.supportedActions : [];
  if (data.proposals.length === 0) {
    proposalBox.append(textNode('p', supported.length === 0
      ? '연동 시스템이 지원하는 조치가 없어 제안이 없습니다(정상).'
      : 'AI 가 제안한 조치가 없습니다.'));
  } else {
    const list = textNode('ul');
    for (const p of data.proposals) {
      list.append(textNode('li', `${p.action} — 이유: ${p.reason} (근거 ${p.evidenceIds.join(', ')}) · 사람 확인이 필요하며 실행되지 않았습니다.`, { 'data-proposal-action': String(p.action), 'data-executed': 'false' }));
    }
    proposalBox.append(list);
  }
  box.append(evidenceBox, rulesBox, unknownBox, proposalBox,
    textNode('p', '이 설명과 제안만으로는 보안 조치가 실행되지 않습니다. 이 칸에는 실행 버튼이 없습니다.'));
  return box;
}

function createEventsView() {
  // 화면 안 조작(필터 변경·상세 버튼)은 아래 draw 만 다시 그리고 이 상태를 이어 씁니다.
  const ui = { filters: { kind: ALL, app: ALL, access: ALL }, selectedId: null };
  const reset = () => {
    ui.filters = { kind: ALL, app: ALL, access: ALL };
    ui.selectedId = null;
  };

  // 제공 화면이 renderEvents 를 부르는 것은 새 자료 수신입니다(loading·ok·error 모두).
  // id·시각이 같아도 근거·규칙·상태가 바뀌었을 수 있으므로, 받을 때마다 이전 목록·필터·상세 선택을 모두 지우고 새로 그립니다.
  return function renderEventsView({ status, mode, data, error } = {}) {
    reset();
    const root = textNode('div', undefined, { 'data-testid': 'student-events-view', 'data-state': status ?? 'unknown' });
    const notice = modeNotice(mode ?? null);
    if (notice) root.append(notice);

    if (status !== 'ok') {
      if (status === 'loading') root.append(textNode('p', '기록 불러오는 중', { role: 'status', 'data-events': 'loading' }));
      else if (status === 'error') {
        const message = isText(error?.message) ? error.message : '서버 메시지 없음';
        root.append(error?.code === 'CONTRACT_MISMATCH'
          ? textNode('p', `확인 불가: 받은 기록 형식을 확인할 수 없어 이전 목록을 지웠습니다. (${message})`, { role: 'alert', 'data-events': 'unverified' })
          : textNode('p', `기록을 불러오지 못했습니다: ${message}`, { role: 'alert', 'data-events': 'error' }));
      } else root.append(textNode('p', '확인 불가: 기록 상태를 확인할 수 없습니다.', { 'data-events': 'unknown' }));
      return root;
    }
    if (!Array.isArray(data)) {
      root.append(textNode('p', '확인 불가: 기록 목록 형식이 올바르지 않습니다.', { role: 'alert', 'data-events': 'unverified' }));
      return root;
    }

    // 복사 후 최신순 정렬(원본 data 는 그대로 둡니다).
    const events = data.filter((e) => e && typeof e === 'object').slice().sort((a, b) => timeValue(b.at) - timeValue(a.at));

    root.append(textNode('p', '범위: 현재 등록 정보와 맞춰 본 본인 최근 기록(최대 40건). 전체 직원 이력·실시간 전체 탐지가 아닙니다.', { 'data-field': 'scope' }));
    if (events.length === 0) {
      root.append(textNode('p', '표시할 기록이 없습니다.', { role: 'status', 'data-events': 'empty' }));
      return root;
    }

    const body = textNode('div', undefined, { 'data-events': 'list' });
    root.append(body);

    const draw = (focusId) => {
      const { kind, app, access } = ui.filters;
      const visible = events.filter((e) => (kind === ALL || e.kind === kind)
        && (app === ALL || appValue(e.appId) === app)
        && (access === ALL || e.state?.access === access));
      if (ui.selectedId !== null && !visible.some((e) => e.id === ui.selectedId)) ui.selectedId = null;

      const filters = textNode('div', undefined, { class: 'student-filters', role: 'group', 'aria-label': '기록 필터' });
      const setFilter = (name, id) => (value) => { ui.filters[name] = value; draw(id); };
      filters.append(
        filterSelect('student-events-filter-kind', '기록 종류', kind,
          distinctOptions(events, (e) => String(e.kind), (e) => kindText(e.kind)), setFilter('kind', 'student-events-filter-kind')),
        filterSelect('student-events-filter-app', '업무 앱', app,
          distinctOptions(events, (e) => appValue(e.appId), (e) => appText(e.appId)), setFilter('app', 'student-events-filter-app')),
        filterSelect('student-events-filter-access', '접속 상태', access,
          distinctOptions(events, (e) => String(e.state?.access), (e) => accessText(e.state?.access)),
          setFilter('access', 'student-events-filter-access')),
      );

      const count = textNode('p', `표시 ${visible.length}건 / 받은 기록 ${events.length}건 (최신순)`, { 'data-field': 'count', role: 'status' });
      const children = [filters, count];
      if (visible.length === 0) children.push(textNode('p', '필터 조건에 맞는 기록이 없습니다.', { 'data-events': 'filtered-empty' }));
      else {
        const list = textNode('ul', undefined, { 'aria-label': '보안 기록 목록' });
        for (const event of visible) {
          const id = String(event.id);
          const item = textNode('li', undefined, { 'data-student-event-id': id });
          const selected = ui.selectedId === event.id;
          const button = textNode('button', `${id} 상세`, { type: 'button', 'aria-pressed': String(selected), 'aria-label': `${id} 상세`, 'data-detail-button': id });
          button.addEventListener('click', () => {
            ui.selectedId = selected ? null : event.id;
            draw(`detail:${id}`);
          });
          item.append(
            textNode('span', `사건 ID ${id} · 시각 ${timeText(event.at)} · 종류 ${kindText(event.kind)} · 앱 ${appText(event.appId)} · ${shown(event.summary)} `),
            button,
          );
          list.append(item);
        }
        children.push(list);
      }
      const chosen = visible.find((e) => e.id === ui.selectedId);
      children.push(chosen ? eventDetail(chosen) : textNode('p', '상세: 선택한 기록 없음', { 'data-field': 'detail-empty' }));
      body.replaceChildren(...children);

      if (focusId) {
        const target = focusId.startsWith('detail:')
          ? body.querySelector(`[data-detail-button="${CSS.escape(focusId.slice(7))}"]`)
          : body.querySelector(`#${focusId}`);
        if (target) target.focus();
      }
    };
    draw(null);
    return root;
  };
}

export function createStudentView() {
  const renderEventsView = createEventsView();
  return {
    renderIdentity({ me, devices, sessions } = {}) {
      const root = textNode('div', undefined, { 'data-testid': 'student-identity-view' });
      root.append(
        section('내 계정·현재 기기·세션', me, fillMe),
        section('내 기기 목록', devices, fillList('device')),
        section('내 세션 목록', sessions, fillList('session')),
      );
      return root;
    },
    renderDecision(input) {
      return renderDecisionView(input);
    },
    renderEvents(input) {
      return renderEventsView(input);
    },
    renderStatus(input) {
      return renderStatusView(input);
    },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection(input) {
      return renderAiConnectionView(input);
    },
    renderExplanation(input) {
      return renderExplanationView(input);
    },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
