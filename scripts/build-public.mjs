import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { deploymentIdentity } from './deployment-identity.mjs';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'data.json');
const output = resolve(root, 'public', 'data.json');
const config = JSON.parse(await readFile(resolve(root, 'aleph.config.json'), 'utf8'));
await mkdir(resolve(root, 'public'), { recursive: true });

if (config.step === 1) {
  const data = JSON.parse(await readFile(source, 'utf8'));
  if (!Array.isArray(data.notes)) {
    throw new Error('실습용 공개 자료 형식을 확인하세요. 실제 학생 자료를 넣으면 안 됩니다.');
  }
  await copyFile(source, output);
  console.log('실습용 공개 자료를 public/data.json에 복사했습니다.');
} else {
  // 2단계부터 메모는 학습용 DB에 있고 화면은 /api/notes로 읽습니다.
  // 공개 정적 파일에 메모가 다시 들어가면 빌드를 멈춥니다.
  for (const file of [source, output]) {
    let data;
    try {
      data = JSON.parse(await readFile(file, 'utf8'));
    } catch {
      continue; // 파일이 없으면 /data.json은 404가 되므로 괜찮습니다.
    }
    if (Array.isArray(data.notes) && data.notes.length > 0) {
      throw new Error(`${file.slice(root.length + 1)}에 메모가 남아 있습니다. 2단계부터는 공개 파일에 메모를 두지 마세요.`);
    }
  }
  console.log('공개 data.json에 메모가 없음을 확인했습니다(메모는 /api/notes로 서버에서 읽음).');
}

if (!process.argv.includes('--local')) {
  const identity = deploymentIdentity(process.env, config);
  await writeFile(resolve(root, 'public', 'aleph.json'),
    `${JSON.stringify(identity, null, 2)}\n`, 'utf8');
  console.log('배포 저장소·커밋·주소를 public/aleph.json에 기록했습니다.');
}
