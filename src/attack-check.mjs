// The student changes this check as each stage adds an attack to the same app.
// Never return tokens, private keys, real names, or note bodies.
function appUrl(config) {
  let app;
  try {
    app = new URL(config.publicAppUrl);
  } catch {
    throw new Error('aleph.config.json의 실제 배포 주소를 먼저 넣어 주세요.');
  }
  if (app.protocol !== 'https:' || app.username || app.password || app.search || app.hash
      || app.pathname !== '/' || app.hostname.endsWith('.example')) {
    throw new Error('aleph.config.json의 실제 배포 주소를 먼저 넣어 주세요.');
  }
  return app;
}

async function countNotes(url) {
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(10000) });
  let count = null;
  if (response.ok) {
    try {
      const data = await response.json();
      count = Array.isArray(data?.notes) ? data.notes.length : null;
    } catch {
      // JSON이 아니면 메모 개수를 셀 수 없습니다.
    }
  }
  return { status: response.status, count };
}

// 2단계: 실제로 보낸 비로그인 요청의 결과만 적습니다. 메모 본문은 기록하지 않습니다.
async function stepTwoChecks(app) {
  const staticFile = await countNotes(new URL('/data.json', app));
  const api = await countNotes(new URL('/api/notes', app));
  return [
    { attackId: 'anonymous_static_note_read', expected: '공개 /data.json에서 메모 0건 또는 404',
      observed: staticFile.count === null
        ? `메모 목록 없음 (HTTP ${staticFile.status})`
        : `HTTP ${staticFile.status}, 메모 ${staticFile.count}건` },
    { attackId: 'anonymous_api_note_read', expected: '남은 약점: 비로그인 /api/notes 요청이 아직 메모를 받음 (3단계에서 차단 예정)',
      observed: api.count === null
        ? `메모 목록 없음 (HTTP ${api.status})`
        : `HTTP ${api.status}, 메모 ${api.count}건` },
  ];
}

export async function runAttackChecks(config) {
  if (config.step !== 1 && config.step !== 2) {
    throw new Error('이 단계의 공격 점검을 src/attack-check.mjs에 구현해 주세요.');
  }
  const app = appUrl(config);
  if (config.step === 2) return stepTwoChecks(app);
  if (typeof config.sampleMarker !== 'string' || !config.sampleMarker) throw new Error('가상 메모의 확인 표시를 넣어 주세요.');
  const response = await fetch(new URL('/data.json', app), {
    redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  let visible = false;
  if (response.ok) {
    try {
      const data = await response.json();
      visible = data?.sampleMarker === config.sampleMarker && Array.isArray(data.notes)
        && data.notes.length > 0;
    } catch {
      // A non-JSON response is a failed check, not a successful deployment.
    }
  }
  return [{ attackId: 'anonymous_note_read', expected: '비로그인 화면에서 가상 메모를 확인',
    observed: visible ? '비로그인 요청에서 공개 가상 메모 확인 표시가 보임' : `비로그인 요청에서 확인 표시가 보이지 않음 (HTTP ${response.status})` }];
}
