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

로컬에서 가상 화면만 확인할 때는 `npm run build -- --local`을 사용합니다. 로컬 실행은 Vercel 배포나 심판 접수를 증명하지 않습니다. 저장소의 `src/attack-check.mjs`는 `npm run bundle` 때 실제 배포 주소로 요청을 보내 결과만 기록하는 학생 자기 점검입니다(심판 판정이 아님). 3단계에서는 토큰 없는 요청과 서명 없는 가짜 토큰 요청이 거부되는지 봅니다.

## 현재 상태: 3단계 저장점

- 지금 작동하는 기능: `/` 화면에서 Supabase Auth 이메일·비밀번호로 로그인·로그아웃합니다(공식 SDK, Project URL과 publishable key만 화면에 둠). 로그인한 사람만 자기 가상 메모 목록을 보고, 메모를 추가·수정·삭제할 수 있습니다. 로그인하지 않거나 토큰 검사에 실패한 요청은 `401 LOGIN_REQUIRED`로 자료 없이 거부됩니다.
- 자료 API(`aleph.config.json`의 `allowedRoutes`):
  - `GET /api/notes` → 로그인 사용자의 메모 배열 `[{id,title,body}]`
  - `POST /api/notes` `{id?,title,body}` → `201 {id}` (`id`는 UUID, 없으면 서버가 만듦. 같은 `id`는 409)
  - `GET /api/notes/:id` → `{id,title,body}`, 없으면 404
  - `PUT /api/notes/:id` `{title,body}` → 고친 `{id,title,body}`, 없으면 404
  - `DELETE /api/notes/:id` → 204, 지운 뒤 `GET`은 404
- 로그인 검사: 모든 자료 API가 시작 틀의 `src/verify-login.mjs`(수정하지 않음)로 `Authorization: Bearer` 토큰을 검사하고, 검사기가 돌려준 사용자 ID만 씁니다. 브라우저가 보낸 `userId`·`role`·`owner_id`는 읽지 않으며, 추가할 때 `owner_id`는 서버가 확인한 사용자 ID로 저장합니다. 발급자 정보는 `aleph.config.json`의 `identityProvider`(issuer·audience·jwksUrl, 비밀 키 없음)에 적었습니다.
- 파일: `api/notes/index.js`(목록·추가), `api/notes/[id].js`(한 건 읽기·수정·삭제), `src/notes-api.mjs`(두 함수가 함께 쓰는 로그인 검사 호출·DB 요청), `supabase/step3-notes-crud.sql`(메모에 UUID `id`를 두고 `service_role`에만 쓰기 권한, 메모 문장 없음, 학습용 DB에 적용함). 옛 bigint `id`는 지우지 않고 `legacy_id`로 이름만 바꿔 내부 기본 키로 남겼으며 API에는 나오지 않습니다.
- 다시 실행하는 방법: GitHub `main`에 푸시하면 Vercel이 자동 배포합니다. 로컬 확인은 `npm run build -- --local`, 테스트는 `npm run test:r5`, 제출 묶음은 `npm run bundle`(커밋 후, `bundle-notes.json` 필요)입니다.
- 필요한 Vercel 환경변수: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`(서버 전용, Vercel 설정 화면에만 입력). 3단계에서 새로 넣을 값은 없습니다.
- 시험용 계정: Supabase → Authentication → Users에서 가상 이메일로 만들고 **Auto Confirm User**를 켭니다. 비밀번호는 코드·README·Git에 적지 않습니다.

### 3단계에서 남은 약점 (4단계에서 고침)

- **소유자 검사가 없습니다.** 목록은 내 메모만 보여 주지만, `GET·PUT·DELETE /api/notes/:id`는 로그인만 확인하고 `owner_id`를 비교하지 않습니다. 따라서 로그인한 B가 A의 메모 `id`를 알면 읽고·고치고·지울 수 있습니다. B의 타인 메모 접근 결과는 4단계에서 기록합니다.

## 2단계: 자료를 코드 밖으로 옮겼습니다

- 가상 메모 네 건은 학습용 Supabase 테이블 `public.notes`로 옮겼습니다. 테이블은 RLS가 켜져 있고 정책이 없으며, `anon`·`authenticated`에는 읽기 권한이 없습니다. `owner_id uuid` 칸은 3단계 로그인 연결을 위해 미리 두었습니다(외래키 없음).
- `data.json`과 `public/data.json`은 삭제했습니다. `/data.json`은 404이며, 1단계 확인 표시(`sampleMarker`)도 정적 응답에 남기지 않습니다(`aleph.json`에도 2단계부터 넣지 않음). 테이블을 만드는 SQL은 메모 문장이 들어 있어 `*.local.sql`로 Git에서 제외했습니다.
- 화면(`/`)은 Vercel 서버 함수 `/api/notes`(2단계 당시 `api/notes.js`, 3단계에서 `api/notes/index.js`로 옮김)를 통해 메모를 읽습니다. 함수는 Vercel 환경변수 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`를 서버에서만 읽고, 키를 응답·로그·브라우저 파일에 넣지 않습니다. 값은 Vercel → Settings → Environment Variables에 학생이 직접 넣습니다.

### 2단계 당시 남은 약점 (3단계에서 막음)

- **`/api/notes`는 공개 주소였습니다.** 로그인 확인이 없어 누구나 이 주소를 불러 메모 네 건을 받을 수 있습니다. 키는 숨겼지만 자료 자체는 아직 보호되지 않았으므로 3단계에서 로그인 확인을 붙이기 전까지 가상 메모만 둡니다.

### 메모 문장 검색 확인 절차

가상 메모 네 건의 본문은 모두 같은 접두어(`실습용 가[상]` 패턴으로 찾음)로 시작합니다. 아래 명령은 이 README 자체가 검색에 걸리지 않도록 `'실습용 가[상]'` 패턴을 씁니다. `<배포주소>`는 Vercel Domains의 짧은 `https://…vercel.app` 주소입니다.

1. **현재 작업 파일(Git이 추적하는 파일)**: `git grep -n '실습용 가[상]'` → 0건이어야 합니다. (`supabase/*.local.sql`은 `.gitignore`로 제외되어 검색·커밋 대상이 아닙니다.)
2. **로컬 빌드 결과물**: `npm run build -- --local` 뒤 `grep -rn '실습용 가[상]' public/` → 0건이어야 합니다.
3. **GitHub 최신 파일**: `git fetch origin && git grep -n '실습용 가[상]' origin/main` → 0건이어야 합니다. 브라우저로는 `https://github.com/ImDongHo/choi-bujang-secret-vault/blob/main/data.json`과 `.../blob/main/public/data.json`에서 `"notes": []`인지 봅니다.
4. **현재 배포 파일**: 시크릿 창에서 `<배포주소>/data.json`을 열어 `"notes": []`(또는 404)인지, `<배포주소>/`의 페이지 소스(Ctrl+U)에 메모 문장이 없는지 봅니다. 명령으로는 `curl -s <배포주소>/data.json | grep -c '실습용 가[상]'` → 0이어야 합니다.
5. **자료 API**: `curl -i <배포주소>/api/notes` → 3단계부터는 `401`과 `{"error":"LOGIN_REQUIRED"}`만 나오고 메모가 없어야 합니다. (2단계 배포에서는 로그인 없이 메모 네 건이 나왔습니다.)

### 검색 결과 기록 (2026-10-06, 3단계 작업 중 갱신)

| 확인 대상 | 결과 | 비고 |
|---|---|---|
| 현재 작업 파일 | 0건 | `data.json`, `public/data.json` 삭제(이후 수정에서 404로 변경) |
| 로컬 빌드 결과물 `public/` | 0건 | `npm run build -- --local` 실행 결과 |
| GitHub 최신 `origin/main` | 0건 | 3단계 작업 중 다시 실행(`origin/main` = `d3a5f69`). 2단계 작업 중에는 푸시 전이라 8건이었음 |
| 현재 배포 `/data.json` | 미실행 | 코딩 도구 환경에서는 vercel.app 접속이 막혀 실행하지 못함. 학생이 4번을 직접 실행합니다 |
| 자료 API `/api/notes` | 미실행 | 3단계 배포 뒤 5번을 실행합니다. 401이 아니라 메모가 나오면 로그인 검사가 배포되지 않은 것입니다 |

### 과거 노출은 해소되지 않았습니다

- **옛 공개 커밋**: `git log -G '실습용 가[상]' --oneline` 결과 `d6fb92d Initial commit`에 메모 네 건이 그대로 들어 있습니다. 공개 저장소이므로 이 커밋 주소로 누구나 볼 수 있고, 이미 복제(clone·fork)한 사본도 회수할 수 없습니다.
- **옛 배포**: Vercel은 이전 배포를 고유 주소로 보관합니다. 1단계 배포의 `/data.json`은 메모가 공개된 채로 남아 있을 수 있습니다.
- 따라서 최신 파일에서 메모를 지운 것은 **앞으로의 노출을 줄인 것**이지, 이미 일어난 노출을 없앤 것이 아닙니다. 실제 자료였다면 내용을 바꾸거나(키라면 즉시 교체) 이력 정리와 옛 배포 삭제를 따로 해야 합니다.

## 다음 단계의 코딩 도구에 전달할 규칙

[AGENTS.md](AGENTS.md)를 먼저 읽히고 한 번에 한 제작 단위만 요청하세요. 2단계부터는 자료 보호를 구현할 때 `public/data.json`을 복사하는 1단계 빌드 흐름도 함께 바꿔야 합니다. 3단계 이후의 로그인, 허용 경로, 5단계의 원본 API 주소, 6단계 이후 정책 규칙은 해당 단계 원고와 계약에 맞춰 추가합니다. 비밀번호·토큰·서버 전용 키·실제 학생 기록을 코드, Git, 제출 묶음에 넣지 않습니다.

`src/decider.mjs`와 `src/detect.mjs`의 로컬 시험은 반 엔진이나 운영 심판의 결과가 아닙니다. 1단계 이후 제출 묶음 계약 `aleph.defense.submission.v2`는 `scripts/bundle.mjs`에 남아 있으며, 코딩 도구가 해당 단계의 최신 배포 주소와 Git 원격을 맞춘 뒤 사용합니다.
