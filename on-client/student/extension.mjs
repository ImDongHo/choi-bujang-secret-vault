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
  const actions = Array.isArray(event.supportedActions) ? event.supportedActions : [];
  box.append(textNode('p', actions.length === 0
    ? '지원 조치: 없음 (조치 버튼을 만들지 않습니다)'
    : `지원 조치(이 화면에서 실행하지 않음): ${actions.map(shown).join(', ')}`, { 'data-field': 'supportedActions' }));
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
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
