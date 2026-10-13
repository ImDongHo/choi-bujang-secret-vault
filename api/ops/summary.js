// GET /api/ops/summary — 12단계 탈환 작전실 요약.
// - 로그인한 사용자 본인 기록만 요약합니다(다른 사람의 사건·기기·복원 기록은 고르지 않음). 학생 토큰은 승인된 기기에서만 엽니다.
// - 판정기 규칙(src/decider.mjs RULE_IDS)·탐지 사건(public.ops_events, 최근 24시간)·회수 상태(public.device_registrations)·
//   복구 버전(policy/safe-policy.json 해시 검증, public.notes_backup·notes_restore_audit)을 항목별로 돌려줍니다.
// - 각 항목은 실제로 읽은 값이면 status: 'confirmed', 읽지 못했으면 status: 'not_run'과 이유만 돌려줍니다(추정값을 채우지 않음).
// - 메모 제목·본문, 사용자 ID, 기기 번호·해시, 토큰은 응답과 로그에 넣지 않습니다.
// - 서버 로그에는 같은 수치를 사용자 ID를 가린 한 줄로 남겨 화면 수치와 대조할 수 있게 합니다.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { RULE_IDS } from '../../src/decider.mjs';
import { detect } from '../../src/detect.mjs';
import { deviceStatus, rejectUnexpectedQuery, requireApprovedDevice, requireLogin, restTable } from '../../src/notes-api.mjs';
import { maskSubject, withOpsEvents } from '../../src/ops-events.mjs';

const WINDOW_HOURS = 24;
const EVENT_LIMIT = 1000;
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

async function eventsSection(ctx) {
  const since = new Date(Date.now() - WINDOW_HOURS * 3600 * 1000).toISOString();
  const result = await restTable(ctx, 'ops_events', { query: {
    select: 'request_id,at,method,route,status,outcome,reason',
    owner_id: `eq.${ctx.userId}`, at: `gte.${since}`, order: 'at.desc', limit: String(EVENT_LIMIT),
  } });
  if (!result.ok || !Array.isArray(result.data)) return notRun(result.code === '42P01' || result.status === 404 ? 'OPS_EVENTS_TABLE_MISSING' : 'OPS_EVENTS_UNREADABLE');
  const rows = result.data;
  const counts = { allowed: 0, denied: 0, error: 0 };
  for (const row of rows) if (Object.hasOwn(counts, row.outcome)) counts[row.outcome] += 1;
  const reasons = {};
  for (const row of rows) if (row.outcome !== 'allowed' && row.reason) reasons[row.reason] = (reasons[row.reason] ?? 0) + 1;
  const detection = detect(rows.map(row => ({ identity: { sub: ctx.userId }, method: row.method, at: row.at })));
  return {
    status: 'confirmed', windowHours: WINDOW_HOURS, total: rows.length, truncated: rows.length >= EVENT_LIMIT, ...counts,
    reasons,
    detection: { action: detection.action, reasonCode: detection.reasonCode ?? null, rules: DETECT_RULE_IDS },
    recentDenied: rows.filter(row => row.outcome !== 'allowed').slice(0, 10).map(row => ({
      requestId: row.request_id, at: row.at, method: row.method, route: row.route, status: row.status, reason: row.reason,
    })),
  };
}

async function devicesSection(ctx, request) {
  const result = await restTable(ctx, 'device_registrations', { query: { select: 'status', owner_id: `eq.${ctx.userId}` } });
  if (!result.ok || !Array.isArray(result.data)) return notRun('DEVICES_UNREADABLE');
  const counts = { approved: 0, pending: 0, revoked: 0 };
  for (const row of result.data) if (Object.hasOwn(counts, row.status)) counts[row.status] += 1;
  let current = 'unknown';
  try { current = (await deviceStatus(ctx, request)).status; } catch { /* 목록 수치는 그대로 둡니다 */ }
  return { status: 'confirmed', currentDevice: ctx.kind === 'student' ? current : 'engine_checked', ...counts };
}

async function recoverySection(ctx) {
  const policy = safePolicy();
  const backups = await restTable(ctx, 'notes_backup', { query: { select: 'backed_up_at', owner_id: `eq.${ctx.userId}`, order: 'backed_up_at.desc' } });
  const audits = await restTable(ctx, 'notes_restore_audit', { query: {
    select: 'action,restored_at', restored_by: `eq.${ctx.userId}`, order: 'restored_at.desc', limit: '100',
  } });
  return {
    policy,
    backups: backups.ok && Array.isArray(backups.data)
      ? { status: 'confirmed', count: backups.data.length, latestAt: backups.data[0]?.backed_up_at ?? null }
      : notRun('BACKUP_UNREADABLE'),
    restores: audits.ok && Array.isArray(audits.data)
      ? { status: 'confirmed', count: audits.data.length, latestAt: audits.data[0]?.restored_at ?? null, latestAction: audits.data[0]?.action ?? null }
      : notRun('RESTORE_AUDIT_UNREADABLE'),
  };
}

async function handler(request, response) {
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
    requestId: response.getHeader('X-Request-Id') ?? null,
    checkedAt: new Date().toISOString(),
    rules: { status: 'confirmed', decider: [...RULE_IDS], detect: [...DETECT_RULE_IDS] },
    events, devices, recovery,
  };
  const n = section => (section?.status === 'confirmed' ? section : null);
  const e = n(events);
  const d = n(devices);
  const b = n(recovery?.backups);
  const r = n(recovery?.restores);
  const p = n(recovery?.policy);
  console.info(`ops summary req=${summary.requestId} sub=${maskSubject(ctx.userId)} rules=${RULE_IDS.length}+${DETECT_RULE_IDS.length}`
    + ` events=${e ? `${e.total}(allowed=${e.allowed},denied=${e.denied},error=${e.error})` : 'not_run'}`
    + ` detect=${e ? e.detection.action : 'not_run'}`
    + ` devices=${d ? `approved=${d.approved},pending=${d.pending},revoked=${d.revoked}` : 'not_run'}`
    + ` backups=${b ? b.count : 'not_run'} restores=${r ? r.count : 'not_run'} policy=${p ? p.version : 'not_run'}`);
  return response.status(200).json(summary);
}

export default withOpsEvents('ops', 'GET /api/ops/summary', handler);
