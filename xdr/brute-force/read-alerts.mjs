// 보너스 xdr-01 만들기 1: Wazuh 모양 경보에서 시각·출발 주소·계정·규칙 수준·설명만 뽑습니다.
// 원본 경보 파일은 읽기만 하고 고치지 않습니다.
// 비밀값처럼 보이는 문자열(토큰·키·비밀번호 표기)은 출력 전에 [가림]으로 바꿉니다.
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const FIXTURE_PATH = join(here, '..', 'fixtures', 'brute-force.json');

const SECRET_LIKE = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/gu,
  /\bBearer\s+[A-Za-z0-9._~+/-]{8,}/giu,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}/gu,
  /\b(?:sb_secret|sb_publishable|sk|pk|ghp|gho|xox[abp])[-_][A-Za-z0-9_-]{8,}/giu,
  /\b(?:password|passwd|pwd|secret|token|api[_-]?key)\s*[:=]\s*\S+/giu,
  /(?:비밀번호|암호|토큰)\s*[:=]\s*\S+/gu,
  /\b[A-Fa-f0-9]{32,}\b/gu,
];

export function redact(value) {
  if (typeof value !== 'string') return value;
  return SECRET_LIKE.reduce((text, pattern) => text.replace(pattern, '[가림]'), value);
}

function accountsOf(data) {
  if (typeof data?.accounts === 'string' && data.accounts.trim()) {
    return data.accounts.split(',').map(name => redact(name.trim())).filter(Boolean);
  }
  return typeof data?.srcuser === 'string' ? [redact(data.srcuser)] : [];
}

// 경보 한 건 → 다섯 항목(시각, 출발 주소, 계정, 규칙 수준, 설명) + 경보 번호
export function extractAlert(alert) {
  return {
    id: typeof alert?.id === 'string' ? alert.id : '',
    time: typeof alert?.timestamp === 'string' ? alert.timestamp : null,
    srcip: typeof alert?.data?.srcip === 'string' ? redact(alert.data.srcip) : null,
    accounts: accountsOf(alert?.data),
    level: Number.isFinite(alert?.rule?.level) ? alert.rule.level : null,
    description: typeof alert?.rule?.description === 'string' ? redact(alert.rule.description) : '',
  };
}

export async function readAlerts(path = FIXTURE_PATH) {
  const fixture = JSON.parse(await readFile(path, 'utf8'));
  if (fixture?.schema !== 'aleph.xdr.fixture.v1' || !Array.isArray(fixture.alerts)) {
    throw new Error('경보 묶음 형식이 아닙니다.');
  }
  return { total: fixture.alerts.length, rows: fixture.alerts.map(extractAlert) };
}

// 직접 실행: node xdr/brute-force/read-alerts.mjs
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { total, rows } = await readAlerts();
  for (const row of rows) {
    console.log([row.id, row.time, row.srcip, row.accounts.join(','), `level ${row.level}`, row.description].join(' | '));
  }
  console.log(`경보 ${total}건 · 뽑은 줄 ${rows.length}줄 · ${total === rows.length ? '일치' : '불일치'}`);
  if (total !== rows.length) process.exitCode = 1;
}
