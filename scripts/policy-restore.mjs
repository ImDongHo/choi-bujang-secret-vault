// 10단계 만들기 2: 검증한 안전 정책 버전으로 시험 정책을 되돌립니다.
// - 먼저 안전 사본의 해시를 검증하고, 실패하면 아무것도 바꾸지 않고 중단합니다.
// - 기본은 미리보기입니다. 바뀔 항목을 보여 주고 끝냅니다. --yes를 붙여야 실제로 씁니다.
// - 안전 사본에 있는 서비스 규칙만 되돌리고, 사본에 없는 다른 서비스 규칙은 그대로 둡니다.
// - 감사 이력(policy/audit.log)은 지우거나 고치지 않고 한 줄씩 덧붙이기만 합니다.
// - 운영 정책(src/decider.mjs, api/*)은 건드리지 않습니다.
// 실행: npm run policy:restore        (미리보기)
//       npm run policy:restore -- --yes (실행)
import { appendFile, writeFile } from 'node:fs/promises';
import { AUDIT_PATH, diffPolicies, loadTest, loadVerifiedSafe, printPlan, sha256, TEST_PATH } from './policy-lib.mjs';

const args = process.argv.slice(2);
const confirm = args.includes('--yes');
const testPath = args.find(arg => !arg.startsWith('--')) ?? TEST_PATH;

try {
  const { safe, hash } = await loadVerifiedSafe();
  const test = await loadTest(testPath);
  const diff = diffPolicies(safe, test);
  printPlan({ safe, hash, test, diff });
  if (!diff.changes.length) {
    console.log('되돌릴 항목이 없어 아무것도 바꾸지 않았습니다.');
  } else if (!confirm) {
    console.log('미리보기만 했습니다. 위 항목을 확인한 뒤 --yes를 붙여 다시 실행하면 되돌립니다.');
  } else {
    const restored = {
      ...test,
      version: `restored-from-${safe.version}`,
      services: { ...test.services, ...structuredClone(safe.services) },
    };
    await writeFile(testPath, `${JSON.stringify(restored, null, 2)}\n`, 'utf8');
    const line = [new Date().toISOString(), 'policy_restore', `from=${sha256(test).slice(0, 12)}`,
      `to=${safe.version}`, `safeHash=${hash.slice(0, 12)}`, `changes=${diff.changes.length}`,
      `preserved=${diff.preserved.join('|') || '-'}`].join(' ');
    await appendFile(AUDIT_PATH, `${line}\n`, 'utf8');
    console.log(`되돌렸습니다. 감사 이력에 한 줄 추가: ${line}`);
  }
} catch (error) {
  console.error(`정책 복원 중단: ${error.message}`);
  process.exitCode = 1;
}
