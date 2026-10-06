# BYTE BACK 방어전 시작 틀 R5

이 저장소는 1단계에서 학생 본인이 GitHub 저장소와 Vercel 배포를 만드는 출발점입니다. 포함된 메모 네 건은 가상 자료입니다. 실제 학생 자료, 토큰, 비밀키를 넣지 마세요.

## 학생이 하는 일: 세 걸음

1. GitHub 계정을 만듭니다.
2. 방어전 1단계 카드의 **Deploy** 버튼을 누릅니다. Vercel에 GitHub로 로그인하고, 새 저장소가 **본인 계정의 Public 저장소**인지 확인한 뒤 Deploy를 누릅니다.
3. 배포가 끝나면 화면에 나온 `https://…vercel.app` 주소를 방어전 1단계 카드에 붙여넣고 제출합니다. 저장소 주소나 설정 파일은 적지 않습니다.

배포가 끝나면 `/`에서 점령된 가상 자료실을 볼 수 있습니다. `/data.json`에는 같은 가상 메모가 공개됩니다. 이 공개 상태를 확인하는 것이 1단계의 출발점입니다. 1단계 접수와 심판 판정은 포털에서 확인합니다.

## 시작 틀의 자동 처리

`vercel.json`은 정적 결과물 `public`을 배포합니다. 빌드 명령 `npm run build`는 Vercel이 제공하는 GitHub 저장소 소유자·이름, 커밋 SHA, 배포 URL을 검증하고 `public/aleph.json`을 생성합니다. 이 값이 없으면 빌드가 실패하므로, 성공한 것처럼 빈 주소를 내보내지 않습니다. `aleph.json`의 내용만으로 저장소 소유권이나 방어 성공을 인정하지 않습니다. 심판이 공개 저장소의 실제 커밋과 배포된 자료를 따로 대조해야 합니다.

`aleph.config.json`의 `repoUrl`과 `publicAppUrl`은 이전 제출 묶음 방식의 자리표시자입니다. 1단계에서는 학생이 편집하지 않습니다. 2단계 이후 코딩 도구가 필요한 설정과 보호 기능을 단계별로 작성합니다. `npm run bundle`과 `bundle-notes.json`도 1단계의 세 걸음에는 포함되지 않습니다.

로컬에서 가상 화면만 확인할 때는 `npm run build -- --local`을 사용합니다. 로컬 실행은 Vercel 배포나 심판 접수를 증명하지 않습니다. 저장소의 `src/attack-check.mjs`는 실제 배포가 된 뒤 `/data.json`을 비로그인으로 요청해 공개 가상 메모의 확인 표시를 읽습니다.

## 현재 상태: 2단계 저장점

- 지금 작동하는 기능: `/` 화면이 `/api/notes` 서버 함수로 학습용 Supabase의 가상 메모 네 건을 읽어 카드로 보여 줍니다. `/data.json`은 파일을 지워 404가 나고, `/aleph.json`은 빌드 때 배포 저장소·커밋·주소로 자동 생성됩니다. 모든 응답에 `X-Content-Type-Options: nosniff` 등 보안 헤더가 붙습니다(`vercel.json`).
- 빌드: `aleph.config.json`의 `step`이 2 이상이면 `data.json`을 복사하지 않고, 공개 data.json에 메모가 다시 들어가면 빌드를 멈춥니다.
- 다시 실행하는 방법: GitHub `main`에 푸시하면 Vercel이 자동 배포합니다. 로컬 확인은 `npm run build -- --local`, 테스트는 `npm run test:r5`, 제출 묶음은 `npm run bundle`(커밋 후, `bundle-notes.json` 필요)입니다.
- 필요한 Vercel 환경변수: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`(서버 전용, Vercel 설정 화면에만 입력).

## 2단계: 자료를 코드 밖으로 옮겼습니다

- 가상 메모 네 건은 학습용 Supabase 테이블 `public.notes`로 옮겼습니다. 테이블은 RLS가 켜져 있고 정책이 없으며, `anon`·`authenticated`에는 읽기 권한이 없습니다. `owner_id uuid` 칸은 3단계 로그인 연결을 위해 미리 두었습니다(외래키 없음).
- `data.json`과 `public/data.json`은 삭제했습니다. `/data.json`은 404이며, 1단계 확인 표시(`sampleMarker`)도 정적 응답에 남기지 않습니다(`aleph.json`에도 2단계부터 넣지 않음). 테이블을 만드는 SQL은 메모 문장이 들어 있어 `*.local.sql`로 Git에서 제외했습니다.
- 화면(`/`)은 Vercel 서버 함수 `api/notes.js`(`/api/notes`)를 통해 메모를 읽습니다. 함수는 Vercel 환경변수 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`를 서버에서만 읽고, 키를 응답·로그·브라우저 파일에 넣지 않습니다. 값은 Vercel → Settings → Environment Variables에 학생이 직접 넣습니다.

### 아직 남은 약점

- **`/api/notes`는 공개 주소입니다.** 로그인 확인이 없어 누구나 이 주소를 불러 메모 네 건을 받을 수 있습니다. 키는 숨겼지만 자료 자체는 아직 보호되지 않았으므로 3단계에서 로그인 확인을 붙이기 전까지 가상 메모만 둡니다.

### 메모 문장 검색 확인 절차

가상 메모 네 건의 본문은 모두 같은 접두어(`실습용 가[상]` 패턴으로 찾음)로 시작합니다. 아래 명령은 이 README 자체가 검색에 걸리지 않도록 `'실습용 가[상]'` 패턴을 씁니다. `<배포주소>`는 Vercel Domains의 짧은 `https://…vercel.app` 주소입니다.

1. **현재 작업 파일(Git이 추적하는 파일)**: `git grep -n '실습용 가[상]'` → 0건이어야 합니다. (`supabase/*.local.sql`은 `.gitignore`로 제외되어 검색·커밋 대상이 아닙니다.)
2. **로컬 빌드 결과물**: `npm run build -- --local` 뒤 `grep -rn '실습용 가[상]' public/` → 0건이어야 합니다.
3. **GitHub 최신 파일**: `git fetch origin && git grep -n '실습용 가[상]' origin/main` → 0건이어야 합니다. 브라우저로는 `https://github.com/ImDongHo/choi-bujang-secret-vault/blob/main/data.json`과 `.../blob/main/public/data.json`에서 `"notes": []`인지 봅니다.
4. **현재 배포 파일**: 시크릿 창에서 `<배포주소>/data.json`을 열어 `"notes": []`(또는 404)인지, `<배포주소>/`의 페이지 소스(Ctrl+U)에 메모 문장이 없는지 봅니다. 명령으로는 `curl -s <배포주소>/data.json | grep -c '실습용 가[상]'` → 0이어야 합니다.
5. **공개 API(남은 약점 확인)**: `curl -s <배포주소>/api/notes` → 로그인 없이 메모 네 건이 나옵니다. 이것은 정상 동작이 아니라 3단계에서 막아야 할 약점입니다.

### 검색 결과 기록 (2026-10-06, 2단계 작업 중)

| 확인 대상 | 결과 | 비고 |
|---|---|---|
| 현재 작업 파일 | 0건 | `data.json`, `public/data.json` 삭제(이후 수정에서 404로 변경) |
| 로컬 빌드 결과물 `public/` | 0건 | `npm run build -- --local` 실행 결과 |
| GitHub 최신 `origin/main` | **8건** (두 파일 × 네 건) | 2단계 변경을 아직 푸시하지 않음. 푸시 뒤 3번을 다시 실행해 0건을 확인하고 이 표를 고칩니다 |
| 현재 배포 `/data.json` | 미실행 | 지금 배포는 1단계 버전이므로 메모가 보이는 상태. 푸시·재배포 뒤 4번을 실행합니다 |
| 공개 API `/api/notes` | 미실행 | 배포 뒤 5번을 실행합니다. 로그인 없이 메모가 나오면 약점이 남아 있는 것입니다 |

### 과거 노출은 해소되지 않았습니다

- **옛 공개 커밋**: `git log -G '실습용 가[상]' --oneline` 결과 `d6fb92d Initial commit`에 메모 네 건이 그대로 들어 있습니다. 공개 저장소이므로 이 커밋 주소로 누구나 볼 수 있고, 이미 복제(clone·fork)한 사본도 회수할 수 없습니다.
- **옛 배포**: Vercel은 이전 배포를 고유 주소로 보관합니다. 1단계 배포의 `/data.json`은 메모가 공개된 채로 남아 있을 수 있습니다.
- 따라서 최신 파일에서 메모를 지운 것은 **앞으로의 노출을 줄인 것**이지, 이미 일어난 노출을 없앤 것이 아닙니다. 실제 자료였다면 내용을 바꾸거나(키라면 즉시 교체) 이력 정리와 옛 배포 삭제를 따로 해야 합니다.

## 다음 단계의 코딩 도구에 전달할 규칙

[AGENTS.md](AGENTS.md)를 먼저 읽히고 한 번에 한 제작 단위만 요청하세요. 2단계부터는 자료 보호를 구현할 때 `public/data.json`을 복사하는 1단계 빌드 흐름도 함께 바꿔야 합니다. 3단계 이후의 로그인, 허용 경로, 5단계의 원본 API 주소, 6단계 이후 정책 규칙은 해당 단계 원고와 계약에 맞춰 추가합니다. 비밀번호·토큰·서버 전용 키·실제 학생 기록을 코드, Git, 제출 묶음에 넣지 않습니다.

`src/decider.mjs`와 `src/detect.mjs`의 로컬 시험은 반 엔진이나 운영 심판의 결과가 아닙니다. 1단계 이후 제출 묶음 계약 `aleph.defense.submission.v2`는 `scripts/bundle.mjs`에 남아 있으며, 코딩 도구가 해당 단계의 최신 배포 주소와 Git 원격을 맞춘 뒤 사용합니다.
