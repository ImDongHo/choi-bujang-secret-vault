const OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/u;
const REPO = /^[A-Za-z0-9._-]{1,100}$/u;
const SHA = /^[a-f0-9]{40}$/iu;
const HOST = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.vercel\.app$/iu;

// 5단계부터 배포 설정(aleph.json)에 원본 자료 API 주소를 적습니다.
// 쿼리·조각·계정 정보가 없는 HTTPS 경로만 받으며, 키 같은 비밀값은 넣지 않습니다.
function originalApiUrl(value) {
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash
      || value.includes('?') || value.includes('#') || url.pathname === '/') return null;
  return url.href;
}

export function deploymentIdentity(env, config) {
  const owner = env.VERCEL_GIT_REPO_OWNER;
  const repo = env.VERCEL_GIT_REPO_SLUG;
  const commit = env.VERCEL_GIT_COMMIT_SHA;
  const host = env.VERCEL_URL;
  if (env.VERCEL_GIT_PROVIDER !== 'github' || !OWNER.test(owner || '')
      || !REPO.test(repo || '') || repo === '.' || repo === '..'
      || repo.toLowerCase().endsWith('.git') || !SHA.test(commit || '')
      || !HOST.test(host || '') || !Number.isInteger(config?.step)
      || config.step < 1 || config.step > 12
      || typeof config.judgeIssuer !== 'string'
      || !/^https:\/\/[a-z0-9-]+\.up\.railway\.app\/defense\/judge$/iu.test(config.judgeIssuer)
      || (config.step === 1 && (typeof config.sampleMarker !== 'string'
        || !/^[A-Z0-9_]{1,80}$/u.test(config.sampleMarker)))) {
    throw new Error('배포 식별 정보를 확인할 수 없습니다. Vercel 시스템 환경변수와 aleph.config.json의 단계를 확인하세요.');
  }
  // 시작 틀 확인 표시(sampleMarker)는 1단계 공개 자료에만 둡니다. 2단계부터 정적 응답에 넣지 않습니다.
  const identity = {
    schema: 'aleph.defense.deployment.v1',
    step: config.step,
    repoUrl: `https://github.com/${owner.toLowerCase()}/${repo.toLowerCase()}`,
    commit: commit.toLowerCase(),
    publicAppUrl: `https://${host.toLowerCase()}`,
    judgeIssuer: config.judgeIssuer,
  };
  if (config.step === 1) identity.sampleMarker = config.sampleMarker;
  if (config.step >= 5) {
    const original = originalApiUrl(config.originalApiUrl);
    if (!original) {
      throw new Error('5단계부터 aleph.config.json의 originalApiUrl에 쿼리 없는 원본 자료 HTTPS 주소가 필요합니다.');
    }
    identity.originalApiUrl = original;
  }
  return identity;
}
