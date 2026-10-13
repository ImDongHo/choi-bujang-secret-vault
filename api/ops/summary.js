// GET /api/ops/summary — 12단계 탈환 작전실 요약.
// - 로그인한 사용자 본인 기록만 요약합니다(다른 사람의 사건·기기·복원 기록은 고르지 않음). 학생 토큰은 승인된 기기에서만 엽니다.
// - Authorization 헤더가 없는 요청에는 '로그인 없는 요청'의 가린 서버 기록만 돌려줍니다(scope: anonymous).
//   그 기록에는 사용자 ID가 처음부터 없고(로그인 검사를 통과하지 못한 요청), 경로 모양·상태·오류 코드·요청 ID·점검 이름만 있습니다.
//   위조·만료 토큰처럼 Authorization이 있는데 검증에 실패하면 지금처럼 401입니다.
// - 판정기 규칙(src/decider.mjs RULE_IDS)·탐지 사건(public.ops_events, 최근 24시간)·회수 상태(public.device_registrations)·
//   복구 버전(policy/safe-policy.json 해시 검증, public.notes_backup·notes_restore_audit)을 항목별로 돌려줍니다.
// - 각 항목은 실제로 읽은 값이면 status: 'confirmed', 읽지 못했으면 status: 'not_run'과 이유만 돌려줍니다(추정값을 채우지 않음).
// - 메모 제목·본문, 사용자 ID, 기기 번호·해시, 토큰은 응답과 로그에 넣지 않습니다.
// - 서버 로그에는 같은 수치를 사용자 ID를 가린 한 줄로 남겨 화면 수치와 대조할 수 있게 합니다.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { RULE_IDS } from '../../src/decider.mjs';
import { deviceStatus, rejectUnexpectedQuery, requireApprovedDevice, requireLogin, restTable } from '../../src/notes-api.mjs';
import { maskSubject, withOpsEvents } from '../../src/ops-events.mjs';

const WINDOW_HOURS = 24;
const EVENT_LIMIT = 200;
// src/detect.mjs가 돌려주는 탐지 규칙 이름(reasonCode)입니다.
const DETECT_RULE_IDS = Object.freeze(['burst_read']);

const notRun = reason => ({ status: 'not_run', reason });

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

// 안전 정책 사본을 해시 파일과 대조합니다(scripts/policy-lib.mjs와 같은 방식). 값이 다르면 버전을 확인됨으로 쓰지 않습니다.
function safePolicy() {
  try {
    const policy = JSON.parse(readFileSync(new URL('../../policy/safe-policy.json', import.meta.url), 'utf8'));
    const expected = readFileSync(new URL('../../policy/safe-policy.sha256', import.meta.url), 'utf8').trim().split(/\s+/u)[0];
    const actual = createHash('sha256').update(canonical(policy)).digest('hex');
    if (actual !== expected) return notRun('SAFE_POLICY_HASH_MISMATCH');
    return { status: 'confirmed', version: typeof policy.version === 'string' ? policy.version : '', sha256Prefix: actual.slice(0, 12) };
  } catch {
    return notRun('SAFE_POLICY_UNREADABLE');
  }
}

// 각 항목은 가린 서버 기록(records)과 그 기록에서 센 수치만 돌려줍니다. 수치는 언제나 records 길이·분류와 같습니다.
// 기록에 없는 값(엔진의 판정·회수 결과, 추정 상태)은 계산해서 채우지 않습니다.
async function eventsSection(ctx, owner = `eq.${ctx.userId}`) {
  const since = new Date(Date.now() - WINDOW_HOURS * 3600 * 1000).toISOString();
  const result = await restTable(ctx, 'ops_events', { query: {
    select: 'request_id,at,route,status,outcome,reason,attack_id',
    owner_id: owner, at: `gte.${since}`, order: 'at.desc', limit: String(EVENT_LIMIT),
  } });
  if (!result.ok || !Array.isArray(result.data)) return notRun(result.status === 404 ? 'OPS_EVENTS_TABLE_MISSING' : 'OPS_EVENTS_UNREADABLE');
  const records = result.data.map(row => ({
    requestId: row.request_id, at: row.at, route: row.route, status: row.status, outcome: row.outcome, reason: row.reason || '',
    attackId: row.attack_id ?? null,
  }));
  const count = outcome => records.filter(row => row.outcome === outcome).length;
  const reasons = {};
  for (const row of records) if (row.outcome !== 'allowed' && row.reason) reasons[row.reason] = (reasons[row.reason] ?? 0) + 1;
  return {
    status: 'confirmed', source: 'public.ops_events', windowHours: WINDOW_HOURS, limit: EVENT_LIMIT,
    truncated: records.length >= EVENT_LIMIT,
    total: records.length, allowed: count('allowed'), denied: count('denied'), error: count('error'), reasons, records,
  };
}

// 회수 상태는 학습 DB의 기기 승인 기록만 셉니다. 심판 토큰처럼 이 서버가 기기를 등록하지 않은 요청은 기록이 없으므로 미실행입니다.
async function devicesSection(ctx, request) {
  if (ctx.kind !== 'student') return notRun('DEVICE_CHECKED_BY_ENGINE');
  const result = await restTable(ctx, 'device_registrations', { query: {
    select: 'status,requested_at,approved_at', owner_id: `eq.${ctx.userId}`, order: 'requested_at.desc',
  } });
  if (!result.ok || !Array.isArray(result.data)) return notRun('DEVICES_UNREADABLE');
  const records = result.data.map(row => ({ status: row.status, requestedAt: row.requested_at, approvedAt: row.approved_at ?? null }));
  const count = status => records.filter(row => row.status === status).length;
  const current = (await deviceStatus(ctx, request)).status;
  return { status: 'confirmed', source: 'public.device_registrations', currentDevice: current,
    total: records.length, approved: count('approved'), pending: count('pending'), revoked: count('revoked'), records };
}

async function recoverySection(ctx) {
  const policy = safePolicy();
  const backups = await restTable(ctx, 'notes_backup', { query: { select: 'backed_up_at', owner_id: `eq.${ctx.userId}`, order: 'backed_up_at.desc' } });
  const audits = await restTable(ctx, 'notes_restore_audit', { query: {
    select: 'action,restored_at', restored_by: `eq.${ctx.userId}`, order: 'restored_at.desc', limit: '100',
  } });
  const backupRecords = backups.ok && Array.isArray(backups.data) ? backups.data.map(row => ({ backedUpAt: row.backed_up_at })) : null;
  const restoreRecords = audits.ok && Array.isArray(audits.data) ? audits.data.map(row => ({ action: row.action, restoredAt: row.restored_at })) : null;
  return {
    policy,
    backups: backupRecords
      ? { status: 'confirmed', source: 'public.notes_backup', count: backupRecords.length, records: backupRecords }
      : notRun('BACKUP_UNREADABLE'),
    restores: restoreRecords
      ? { status: 'confirmed', source: 'public.notes_restore_audit', count: restoreRecords.length, records: restoreRecords }
      : notRun('RESTORE_AUDIT_UNREADABLE'),
  };
}

// 로그인 없는 요청의 가린 기록만 보여 주는 공개 보기입니다. 기기·복원 기록처럼 사용자에게 묶인 항목은 not_run입니다.
async function anonymousView(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Vary', 'Authorization');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }
  if (rejectUnexpectedQuery(request, response, [])) return;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return response.status(500).json({ error: 'SERVER_NOT_CONFIGURED' });
  let events;
  try { events = await eventsSection({ url, key }, 'is.null'); } catch { events = notRun('OPS_EVENTS_UNREADABLE'); }
  const summary = {
    scope: 'anonymous',
    requestId: response.getHeader('X-Request-Id') ?? null,
    checkedAt: new Date().toISOString(),
    subject: '-',
    rules: { status: 'confirmed', source: 'src/decider.mjs RULE_IDS · src/detect.mjs', decider: [...RULE_IDS], detect: [...DETECT_RULE_IDS] },
    events,
    devices: notRun('LOGIN_REQUIRED_FOR_SECTION'),
    recovery: { policy: safePolicy(), backups: notRun('LOGIN_REQUIRED_FOR_SECTION'), restores: notRun('LOGIN_REQUIRED_FOR_SECTION') },
  };
  const e = events?.status === 'confirmed' ? events : null;
  console.info(`ops summary req=${summary.requestId} scope=anonymous rules=${RULE_IDS.length}+${DETECT_RULE_IDS.length}`
    + ` events=${e ? `${e.total}(allowed=${e.allowed},denied=${e.denied},error=${e.error})` : `not_run(${events?.reason})`}`
    + ` attacks=${e ? e.records.filter(row => row.attackId).length : 'not_run'} devices=not_run backups=not_run restores=not_run`);
  return response.status(200).json(summary);
}

async function handler(request, response) {
  if (!request.headers?.authorization) return anonymousView(request, response);
  const ctx = await requireLogin(request, response, ['GET']);
  if (!ctx) return;
  if (rejectUnexpectedQuery(request, response, [])) return;
  if (!await requireApprovedDevice(ctx, request, response)) return;

  const settle = async (task, reason) => { try { return await task(); } catch { return notRun(reason); } };
  const [events, devices, recovery] = await Promise.all([
    settle(() => eventsSection(ctx), 'OPS_EVENTS_UNREADABLE'),
    settle(() => devicesSection(ctx, request), 'DEVICES_UNREADABLE'),
    settle(() => recoverySection(ctx), 'RECOVERY_UNREADABLE'),
  ]);
  const summary = {
    scope: 'self',
    requestId: response.getHeader('X-Request-Id') ?? null,
    checkedAt: new Date().toISOString(),
    subject: maskSubject(ctx.userId),
    rules: { status: 'confirmed', source: 'src/decider.mjs RULE_IDS · src/detect.mjs', decider: [...RULE_IDS], detect: [...DETECT_RULE_IDS] },
    events, devices, recovery,
  };
  const n = section => (section?.status === 'confirmed' ? section : null);
  const e = n(events);
  const d = n(devices);
  const b = n(recovery?.backups);
  const r = n(recovery?.restores);
  const p = n(recovery?.policy);
  // 화면과 같은 수치를 사용자 ID를 가린 한 줄로 남깁니다(가린 서버 기록). 읽지 못한 항목은 not_run으로 적습니다.
  console.info(`ops summary req=${summary.requestId} sub=${summary.subject} rules=${RULE_IDS.length}+${DETECT_RULE_IDS.length}`
    + ` events=${e ? `${e.total}(allowed=${e.allowed},denied=${e.denied},error=${e.error})` : `not_run(${events.reason})`}`
    + ` devices=${d ? `${d.total}(approved=${d.approved},pending=${d.pending},revoked=${d.revoked})` : `not_run(${devices.reason})`}`
    + ` backups=${b ? b.count : 'not_run'} restores=${r ? r.count : 'not_run'} policy=${p ? p.version : 'not_run'}`);
  return response.status(200).json(summary);
}

export default withOpsEvents('ops', 'GET /api/ops/summary', handler);
