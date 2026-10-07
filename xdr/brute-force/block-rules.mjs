// 보너스 xdr-01 만들기 4: 차단 후보(block)만 ZTNA 판정기용 거부 규칙으로 만들고, 알림을 xdr/alerts.log에 쌓습니다.
// - 규칙은 출발 주소(srcip) 단위입니다. 공격받은 계정 이름으로 막으면 정상 사용자가 잠기므로 계정으로는 막지 않습니다.
// - 정상 이벤트(record)에 나온 주소는 규칙에 넣지 않습니다.
// - 규칙마다 만료 시각(expiresAt)과 근거 경보 번호(alertIds)를 붙입니다.
// - src/decider.mjs의 기존 규칙은 고치지 않습니다. 판정 요청 계약(docs/DECIDER_REQUEST.md)에 출발 주소가 없어
//   지금은 이 파일의 deny-rules.json과 isDenied()로만 확인합니다. 판정기 연결은 계약에 주소 신호가 생긴 뒤 합니다.
// 실행: npm run xdr:run -- brute-force 뒤에 node xdr/brute-force/block-rules.mjs
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readAlerts } from './read-alerts.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const RULES_PATH = join(here, 'deny-rules.json');
export const ALERT_LOG_PATH = join(here, '..', 'alerts.log');
export const TTL_MINUTES = 60;
const RULE_ID = /^[a-z][a-z0-9_.-]{0,79}$/u;

export function buildDenyRules(rows, decisions, { ttlMinutes = TTL_MINUTES } = {}) {
  const byId = new Map(rows.map(row => [row.id, row]));
  const normalSources = new Set(decisions
    .filter(item => item.action === 'record')
    .map(item => byId.get(item.alertId)?.srcip)
    .filter(Boolean));
  const grouped = new Map();
  for (const item of decisions) {
    if (item.action !== 'block') continue;
    const row = byId.get(item.alertId);
    if (!row?.srcip || !row.time || normalSources.has(row.srcip)) continue;
    const entry = grouped.get(row.srcip) ?? { srcip: row.srcip, alertIds: [], first: row.time, last: row.time };
    entry.alertIds.push(row.id);
    if (Date.parse(row.time) < Date.parse(entry.first)) entry.first = row.time;
    if (Date.parse(row.time) > Date.parse(entry.last)) entry.last = row.time;
    grouped.set(row.srcip, entry);
  }
  return [...grouped.values()].map(entry => {
    const ruleId = `xdr.brute_force.${entry.srcip.replaceAll('.', '_')}`;
    if (!RULE_ID.test(ruleId)) throw new Error('규칙 이름 형식이 맞지 않습니다.');
    return {
      ruleId,
      decision: 'deny',
      match: { srcip: entry.srcip },
      alertIds: entry.alertIds,
      createdAt: new Date(Date.parse(entry.first)).toISOString(),
      expiresAt: new Date(Date.parse(entry.last) + ttlMinutes * 60 * 1000).toISOString(),
    };
  });
}

// 한 요청(출발 주소, 시각)이 아직 만료되지 않은 거부 규칙에 걸리는지 봅니다.
export function isDenied({ srcip, at }, rules) {
  const time = Date.parse(at);
  return rules.find(rule => rule.match.srcip === srcip
    && time >= Date.parse(rule.createdAt) && time < Date.parse(rule.expiresAt)) ?? null;
}

export function alertLogLines(rows, decisions) {
  const byId = new Map(rows.map(row => [row.id, row]));
  return decisions
    .filter(item => item.action === 'block' || item.action === 'alert')
    .map(item => {
      const row = byId.get(item.alertId) ?? {};
      return [row.time ?? '-', item.action.toUpperCase(), item.alertId, row.srcip ?? '-',
        `confidence=${item.confidence}`, item.reason.replace(/\s+/gu, ' ')].join(' ');
    });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const result = JSON.parse(await readFile(join(here, 'result.json'), 'utf8'));
  const { rows } = await readAlerts();
  const rules = buildDenyRules(rows, result.decisions);
  await writeFile(RULES_PATH, `${JSON.stringify({ schema: 'aleph.xdr.deny-rules.v1', moduleKey: 'brute-force', ttlMinutes: TTL_MINUTES, rules }, null, 2)}\n`, 'utf8');
  const lines = alertLogLines(rows, result.decisions);
  if (lines.length) await appendFile(ALERT_LOG_PATH, `${lines.join('\n')}\n`, 'utf8');

  // 시험 경보를 다시 흘려 봅니다: 각 경보의 시각·주소로 요청이 왔다고 보고 규칙에 걸리는지 확인합니다.
  const actionOf = new Map(result.decisions.map(item => [item.alertId, item.action]));
  const blocked = rows.filter(row => isDenied({ srcip: row.srcip, at: row.time }, rules));
  const wronglyBlocked = blocked.filter(row => actionOf.get(row.id) !== 'block');
  const missed = rows.filter(row => actionOf.get(row.id) === 'block' && !blocked.includes(row));
  console.log(`거부 규칙 ${rules.length}개 → ${RULES_PATH.slice(here.length - 'xdr/brute-force'.length)}`);
  console.log(`알림 ${lines.length}줄을 xdr/alerts.log에 추가`);
  console.log(`다시 흘리기: 막힘 ${blocked.length}건, 통과 ${rows.length - blocked.length}건, 차단 후보가 아닌데 막힘 ${wronglyBlocked.length}건, 놓친 차단 후보 ${missed.length}건`);
  if (wronglyBlocked.length || missed.length) process.exitCode = 1;
}
