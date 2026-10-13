// ALEPH SDP 엔진이 확인한 요청만 받는 학생 판정기 시작점입니다.
// 6단계부터 규칙을 하나씩 추가합니다. 이 기본 응답은 모든 요청을 거부합니다.
// 요청 본문의 userId, role, 기기 키, 토큰을 별도로 믿거나 저장하지 마세요.
// 6단계 device_registered: 계약(docs/DECIDER_REQUEST.md)의 request.deviceRegistered가 true일 때만 허용합니다.
// 미등록(false)이거나 값이 없으면 device_not_registered로 거부합니다. request.device 같은 계약 밖 값은 쓰지 않습니다.
// 7단계 step_up_required: 엔진이 넘긴 가상 사건에서 평소와 다른 시각 + 처음 보는 네트워크 + 짧은 시간 많은 읽기가
// 겹치면 추가 본인 확인(step_up)을 요청합니다. 지역 하나만으로는 판정하지 않고, 영구 차단(deny)하지 않습니다.
// 8단계 resource_zone: 엔진이 확인한 사용자(subjectId)·기기(deviceId)·메서드·정확한 경로로 자원 구역을 나눕니다.
// 허용 목록에 없는 경로, 쿼리로 기능을 고르는 요청, :id 자리의 기능 이름(export 등)은 거부합니다.
// 강사 공지 수정은 계약에 강사 역할이 아직 없으므로(docs/DECIDER_REQUEST.md) 누구든 거부합니다.
// 메모 소유자(A/B) 비교는 판정 요청에 소유자 정보가 없어 자료 API(api/notes/[id].js)가 저장된 owner_id로 합니다.
export const RULE_IDS = Object.freeze(['starter.deny', 'device_registered', 'step_up_required', 'resource_zone']);

// 엔진 경로 모양(route)과 실제 경로(path) 쌍. /api 접두어가 있는 모양과 없는 모양을 모두 받되 서로 섞이면 거부합니다.
const ZONES = Object.freeze([
  { route: 'GET /notes', zone: 'own_notes' },
  { route: 'POST /notes', zone: 'own_notes' },
  { route: 'GET /notes/:id', zone: 'own_notes' },
  { route: 'PUT /notes/:id', zone: 'own_notes' },
  { route: 'DELETE /notes/:id', zone: 'own_notes' },
  // 공지 구역은 읽기·수정 모두 강사 전용입니다. 계약에 강사 역할이 없으므로 판정기에서는 누구든 거부합니다.
  { route: 'GET /notices', zone: 'notices', instructorOnly: true },
  { route: 'GET /notices/:id', zone: 'notices', instructorOnly: true },
  { route: 'PUT /notices/:id', zone: 'notices', instructorOnly: true },
  { route: 'POST /auth/login', zone: 'session' },
  { route: 'POST /auth/refresh', zone: 'session' },
  { route: 'POST /auth/logout', zone: 'session' },
]);
// :id 자리에는 자료 ID만 옵니다. 기능 이름은 같은 깊이에 두지 않으므로 ID로도 받지 않습니다.
const RESOURCE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/u;
const RESERVED_SEGMENTS = new Set(['export', 'import', 'download', 'backup', 'dump', 'bulk', 'batch', 'all',
  'admin', 'search', 'list', 'new', 'edit', 'update', 'delete', 'raw', 'share', 'restore']);
const DEVICE_ID = /^[0-9a-f]{16}$/u;
// 엔진이 확인한 service로도 구역을 나눕니다. 서비스와 경로가 서로 다른 구역을 가리키면 거부합니다.
const ZONE_SERVICES = Object.freeze({
  own_notes: new Set(['notes']),
  notices: new Set(['notes', 'notices']),
  session: new Set(['notes', 'auth']),
});

// 메모 자원(notes:<id>)을 처음 허용받은 사용자(subjectId)와 묶어 둡니다. 다른 사용자가 같은 메모를 요청하면 거부합니다.
// 판정 요청에 소유자 정보가 없으므로, 엔진이 확인한 subjectId와 정확한 경로의 자료 ID만으로 구역을 나눕니다.
const NOTE_OWNERS = new Map();
const MAX_BINDINGS = 10000;
function noteKeyOf(request, zone) {
  if (zone.zone !== 'own_notes') return null;
  const id = request.path.split('/').at(-1);
  return zone.route.endsWith('/:id') ? `notes:${id}` : null;
}
function bindNoteOwner(key, subjectId) {
  if (!key || NOTE_OWNERS.has(key)) return;
  if (NOTE_OWNERS.size >= MAX_BINDINGS) NOTE_OWNERS.delete(NOTE_OWNERS.keys().next().value);
  NOTE_OWNERS.set(key, subjectId);
}

export function matchZone(request) {
  const { method, path, route, queryLength } = request ?? {};
  if (typeof method !== 'string' || typeof path !== 'string' || typeof route !== 'string') return null;
  if (queryLength !== 0) return null;                       // 쿼리로 기능을 고르지 않습니다.
  if (path.includes('?') || path.includes('#') || path.includes('%') || path.includes('//')) return null;
  const [routeMethod, routePath, extra] = route.split(' ');
  if (extra !== undefined || routeMethod !== method) return null;
  const prefixed = routePath?.startsWith('/api/');
  if (prefixed !== path.startsWith('/api/')) return null;    // 접두어가 섞이면 거부
  const shape = prefixed ? routePath.slice(4) : routePath;
  const actual = prefixed ? path.slice(4) : path;
  const zone = ZONES.find(item => item.route === `${method} ${shape}`);
  if (!zone) return null;
  const shapeParts = shape.split('/');
  const pathParts = actual.split('/');
  if (shapeParts.length !== pathParts.length) return null;
  for (let index = 0; index < shapeParts.length; index += 1) {
    if (shapeParts[index] === ':id') {
      const id = pathParts[index];
      if (!RESOURCE_ID.test(id) || RESERVED_SEGMENTS.has(id.toLowerCase())) return null;
    } else if (shapeParts[index] !== pathParts[index]) {
      return null;
    }
  }
  return zone;
}


// 7단계 만들기 1: 접속 정보의 출처 구분.
// 엔진이 정한 출처만 받습니다. 'none'은 실제 경로(접속 정보 없음), 'judge_fixture'는 엔진이 검증해 넘긴 가상 사건입니다.
// 그 밖의 출처(브라우저·클라이언트 헤더 등)는 신뢰하지 않으며, 빠진 값은 정상값으로 채우지 않고 null로 둡니다.
// judge_fixture 신호는 가상 사건 규칙에만 쓰고 실제 위치 증거로 취급하지 않습니다.
const SIGNAL_KEYS = 'hour,network,region,source';
const EVENT_KEYS = 'ageSeconds,count,kind';
const TRUSTED_VIRTUAL_SOURCE = 'judge_fixture';

export function readSignals(request) {
  const signals = request?.signals;
  const empty = { trusted: false, source: 'untrusted', region: null, network: null, hour: null };
  if (!signals || typeof signals !== 'object' || Array.isArray(signals)
      || Object.keys(signals).sort().join(',') !== SIGNAL_KEYS) return empty;
  if (signals.source === 'none') return { ...empty, source: 'none' };
  if (signals.source !== TRUSTED_VIRTUAL_SOURCE) return empty;
  const text = value => (typeof value === 'string' && value && value !== 'unknown' && value.length <= 32 ? value : null);
  return {
    trusted: true,
    source: TRUSTED_VIRTUAL_SOURCE,
    region: text(signals.region),
    network: text(signals.network),
    hour: Number.isInteger(signals.hour) && signals.hour >= 0 && signals.hour <= 23 ? signals.hour : null,
  };
}

export function readRecentEvents(request) {
  const events = request?.recentEvents;
  if (!Array.isArray(events) || events.length > 12) return [];
  return events.filter(event => event && typeof event === 'object' && !Array.isArray(event)
    && Object.keys(event).sort().join(',') === EVENT_KEYS
    && typeof event.kind === 'string' && /^[a-z][a-z0-9_]{0,31}$/u.test(event.kind)
    && Number.isInteger(event.ageSeconds) && event.ageSeconds >= 0
    && Number.isInteger(event.count) && event.count >= 0);
}

// 엔진이 확인한 재인증만 받습니다: verified가 true이고 나이가 0~900초 정수일 때.
export function readStepUp(request) {
  const stepUp = request?.stepUp;
  if (!stepUp || typeof stepUp !== 'object' || stepUp.verified !== true) return { verified: false, authAgeSeconds: null };
  const age = stepUp.authAgeSeconds;
  return Number.isInteger(age) && age >= 0 && age <= 900
    ? { verified: true, authAgeSeconds: age }
    : { verified: false, authAgeSeconds: null };
}

// 7단계 만들기 2: 복합 이상 사건의 기준
const UNUSUAL_HOURS = new Set([0, 1, 2, 3, 4, 5]);   // 새벽 0~5시
const UNFAMILIAR_NETWORK = 'unusual';               // 처음 보는 네트워크
const BURST_WINDOW_SECONDS = 600;                   // 최근 10분
const BURST_MIN_COUNT = 20;                          // 짧은 시간 많은 읽기
const BURST_KINDS = new Set(['risk_signal', 'read', 'bulk_read']);
const RECENT_STEP_UP_SECONDS = 300;                  // 5분 안에 다시 확인했으면 허용

// 가상 사건(judge_fixture)에서 빠진 시각·네트워크는 정상값으로 채우지 않고 '확인 안 됨'으로 봅니다.
export function isCompoundAnomaly(signals, events) {
  if (!signals.trusted) return false;
  const unusualHour = signals.hour === null || UNUSUAL_HOURS.has(signals.hour);
  const unfamiliarNetwork = signals.network === null || signals.network === UNFAMILIAR_NETWORK;
  const burst = events
    .filter(event => BURST_KINDS.has(event.kind) && event.ageSeconds <= BURST_WINDOW_SECONDS)
    .reduce((sum, event) => sum + event.count, 0) >= BURST_MIN_COUNT;
  return unusualHour && unfamiliarNetwork && burst;
}

const response = (request, decision, reasonCode, ruleId) => ({
  schema: 'aleph.decision.v1',
  requestId: request?.requestId,
  decision,
  reasonCode,
  ruleIds: [ruleId],
});

export async function decide(request) {
  if (request?.schema !== 'aleph.decision.v1') {
    return response(request, 'deny', 'starter_not_ready', RULE_IDS[0]);
  }
  if (request.deviceRegistered !== true) {
    return response(request, 'deny', 'device_not_registered', 'device_registered');
  }
  // 8단계: 엔진이 확인한 사용자·기기가 없으면 구역을 고를 수 없으므로 거부합니다.
  if (typeof request.subjectId !== 'string' || !request.subjectId || !DEVICE_ID.test(request.deviceId ?? '')) {
    return response(request, 'deny', 'subject_not_verified', 'resource_zone');
  }
  const zone = matchZone(request);
  if (!zone || !ZONE_SERVICES[zone.zone]?.has(request.service)) {
    return response(request, 'deny', 'route_not_allowed', 'resource_zone');
  }
  if (zone.instructorOnly) return response(request, 'deny', 'instructor_required', 'resource_zone');
  const noteKey = noteKeyOf(request, zone);
  const owner = noteKey ? NOTE_OWNERS.get(noteKey) : undefined;
  if (owner !== undefined && owner !== request.subjectId) {
    return response(request, 'deny', 'resource_owner_mismatch', 'resource_zone');
  }
  const signals = readSignals(request);
  const events = readRecentEvents(request);
  // 출처가 엔진 값(none·judge_fixture)이 아니거나 형식이 틀린 접속 정보는 믿지도, 정상으로 채우지도 않고 다시 확인합니다.
  const unverifiedSource = signals.source === 'untrusted';
  if (unverifiedSource || isCompoundAnomaly(signals, events)) {
    const stepUp = readStepUp(request);
    if (stepUp.verified && stepUp.authAgeSeconds <= RECENT_STEP_UP_SECONDS) {
      return response(request, 'allow', 'approved', 'step_up_required');
    }
    return response(request, 'step_up', 'step_up_required', 'step_up_required');
  }
  bindNoteOwner(noteKey, request.subjectId);
  return response(request, 'allow', 'approved', 'device_registered');
}
