// 10단계 만들기 1: 침해 전에 검증한 안전 정책 사본과 현재 시험 정책의 차이만 보여 줍니다(읽기만).
// 실행: npm run policy:diff  (다른 시험 정책 파일: npm run policy:diff -- 경로)
import { diffPolicies, loadTest, loadVerifiedSafe, printPlan, TEST_PATH } from './policy-lib.mjs';

try {
  const { safe, hash } = await loadVerifiedSafe();
  const test = await loadTest(process.argv[2] ?? TEST_PATH);
  printPlan({ safe, hash, test, diff: diffPolicies(safe, test) });
} catch (error) {
  console.error(`정책 비교 중단: ${error.message}`);
  process.exitCode = 1;
}
