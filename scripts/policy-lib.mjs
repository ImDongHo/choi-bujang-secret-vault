// 10단계: 안전 정책 사본과 시험 정책을 다루는 공통 코드입니다.
// 운영 정책(src/decider.mjs, api/*)은 읽지도 고치지도 않고, policy/ 아래 시험 정책 파일만 다룹니다.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export const ROOT = resolve(import.meta.dirname, '..');
export const SAFE_PATH = join(ROOT, 'policy', 'safe-policy.json');
export const SAFE_HASH_PATH = join(ROOT, 'policy', 'safe-policy.sha256');
export const TEST_PATH = join(ROOT, 'policy', 'test-policy.json');
export const AUDIT_PATH = join(ROOT, 'policy', 'audit.log');

// 키 순서와 상관없이 같은 내용이면 같은 해시가 나오도록 정렬해서 직렬화합니다.
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
export const sha256 = value => createHash('sha256').update(canonical(value)).digest('hex');

function assertPolicy(policy, label) {
  if (policy?.schema !== 'aleph.policy.v1' || typeof policy.version !== 'string'
      || !policy.services || typeof policy.services !== 'object' || Array.isArray(policy.services)) {
    throw new Error(`${label} 형식이 aleph.policy.v1이 아닙니다.`);
  }
  for (const [service, rules] of Object.entries(policy.services)) {
    if (!Array.isArray(rules) || rules.some(rule => typeof rule?.route !== 'string' || typeof rule?.allow !== 'string')) {
      throw new Error(`${label}의 ${service} 서비스 규칙 형식이 맞지 않습니다.`);
    }
  }
  return policy;
}

// 안전 사본을 읽고 저장된 해시와 대조합니다. 사본이 없거나 해시가 다르면 오류로 중단합니다.
export async function loadVerifiedSafe() {
  let text;
  let expected;
  try { text = await readFile(SAFE_PATH, 'utf8'); } catch { throw new Error('안전 정책 사본(policy/safe-policy.json)이 없습니다. 중단합니다.'); }
  try { expected = (await readFile(SAFE_HASH_PATH, 'utf8')).trim().split(/\s+/u)[0]; } catch { throw new Error('안전 정책 해시(policy/safe-policy.sha256)가 없습니다. 중단합니다.'); }
  let safe;
  try { safe = assertPolicy(JSON.parse(text), '안전 정책 사본'); } catch (error) { throw new Error(`안전 정책 사본 검증 실패: ${error.message} 중단합니다.`); }
  const actual = sha256(safe);
  if (!/^[0-9a-f]{64}$/u.test(expected ?? '') || actual !== expected) {
    throw new Error('안전 정책 사본의 해시가 저장된 값과 다릅니다(검증 실패). 중단합니다.');
  }
  return { safe, hash: actual };
}

export async function loadTest(path = TEST_PATH) {
  return assertPolicy(JSON.parse(await readFile(path, 'utf8')), '시험 정책');
}

// 안전 사본에 있는 서비스만 비교합니다. 사본에 없는 다른 서비스는 '보존' 대상으로 따로 보여 줍니다.
export function diffPolicies(safe, test) {
  const changes = [];
  for (const [service, safeRules] of Object.entries(safe.services)) {
    const testRules = test.services[service] ?? [];
    const safeBy = new Map(safeRules.map(rule => [rule.route, rule]));
    const testBy = new Map(testRules.map(rule => [rule.route, rule]));
    for (const [route, rule] of safeBy) {
      const now = testBy.get(route);
      if (!now) changes.push({ service, route, change: '되살림(시험 정책에서 빠짐)', from: null, to: rule.allow });
      else if (canonical(now) !== canonical(rule)) changes.push({ service, route, change: '되돌림(값이 다름)', from: now.allow, to: rule.allow });
    }
    for (const [route, rule] of testBy) {
      if (!safeBy.has(route)) changes.push({ service, route, change: '지움(안전 사본에 없음)', from: rule.allow, to: null });
    }
  }
  const preserved = Object.keys(test.services).filter(service => !Object.hasOwn(safe.services, service));
  return { changes, preserved };
}

export function printPlan({ safe, hash, test, diff }) {
  console.log(`복원할 버전: ${safe.version} (해시 ${hash.slice(0, 12)}…, 검증 통과)`);
  console.log(`현재 시험 정책: ${test.version} (해시 ${sha256(test).slice(0, 12)}…)`);
  if (!diff.changes.length) console.log('변경 범위: 차이 없음');
  else {
    console.log(`변경 범위: ${diff.changes.length}건`);
    for (const item of diff.changes) console.log(`  - [${item.service}] ${item.route}: ${item.change} ${item.from ?? '(없음)'} → ${item.to ?? '(지움)'}`);
  }
  console.log(`보존할 다른 서비스: ${diff.preserved.length ? diff.preserved.join(', ') : '없음'}`);
}

// 시험 정책으로 가상 요청 하나를 판정해 봅니다(복원 뒤 확인용). 정책에 없는 경로는 거부합니다.
export function evaluateRequest(policy, { route, subject, owner = null, instructor = false }) {
  for (const rules of Object.values(policy.services)) {
    const rule = rules.find(item => item.route === route);
    if (!rule) continue;
    if (rule.allow === 'session') return 'allow';
    if (rule.allow === 'owner') return owner === null || owner === subject ? 'allow' : 'deny';
    if (rule.allow === 'instructor') return instructor ? 'allow' : 'deny';
    if (rule.allow === 'any') return 'allow';
    return 'deny';
  }
  return 'deny';
}
