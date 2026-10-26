# BYTE BACK 방어전 시작 틀 R5

이 저장소는 1단계에서 학생 본인이 GitHub 저장소와 Vercel 배포를 만드는 출발점입니다. 포함된 메모 네 건은 가상 자료입니다. 실제 학생 자료, 토큰, 비밀키를 넣지 마세요.

## 4~6차 보안 Agent 「창고지기」(on-client, 13~22단계)

- **목적**: 직원이 자기 로그인 상태, 업무 앱 접속 판정, 본인 접속 기록·XDR 경보, 기기·세션, 설치 패키지 취약점 조회, AI 설명, 조치 상태를 한 화면에서 확인하는 로컬 보안 앱입니다.
- **구성**: 브라우저(`on-client/public/`, 학생 표시 `on-client/student/extension.mjs`) → 로컬 앱 서버(`on-client/src/server.mjs`, `http://127.0.0.1:5189`) → 접근 제어·XDR 시스템(`src/engine.mjs`, `student/engine-adapter.mjs`) / AI 게이트웨이(`src/ai/`, `vendor/clco-http.mjs`) / OSV(`src/vulnerabilities/`).
- **기능(학생 작성)**: `renderIdentity`·`renderDecision`·`renderEvents`·`renderStatus`·`renderAiConnection`·`renderExplanation`·`renderAction`·`renderVulnerabilities`(13~20단계). 서버·화면 뼈대는 제공 시작 틀 `alekov-starter 0.2.11` 그대로입니다.
- **지원 환경과 버전**: Node.js 수업 기준 24.19.0(`on-client/package.json` engines), 외부 npm 의존성 없음. 학생이 실제 실행해 확인한 버전은 v22.22.0 이며 Windows PowerShell 실행은 미확인입니다.
- **실행**: `on-client` 폴더에서 `npm start`(기본, 엔진 미연결) 또는 `npm run demo`(예제 자료) → 브라우저 `http://127.0.0.1:5189/`. 제공 도구 `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1` 도 같은 서버를 켭니다.
- 실행 절차·구성도(Mermaid·글)·제공/학생 경계·오류별 확인 순서·미확인 목록: **[on-client/docs/STUDENT_RUNBOOK.md](on-client/docs/STUDENT_RUNBOOK.md)**
- 키·토큰·비밀번호는 이 저장소에 넣지 않습니다(`.env`, `.env.*` 는 `.gitignore` 로 제외, `on-client/.env.example` 은 비밀 없는 견본).

## 학생이 하는 일: 세 걸음

1. GitHub 계정을 만듭니다.
2. 방어전 1단계 카드의 **Deploy** 버튼을 누릅니다. Vercel에 GitHub로 로그인하고, 새 저장소가 **본인 계정의 Public 저장소**인지 확인한 뒤 Deploy를 누릅니다.
3. 배포가 끝나면 화면에 나온 `https://…vercel.app` 주소를 방어전 1단계 카드에 붙여넣고 제출합니다. 저장소 주소나 설정 파일은 적지 않습니다.

배포가 끝나면 `/`에서 점령된 가상 자료실을 볼 수 있습니다. `/data.json`에는 같은 가상 메모가 공개됩니다. 이 공개 상태를 확인하는 것이 1단계의 출발점입니다. 1단계 접수와 심판 판정은 포털에서 확인합니다.

## 시작 틀의 자동 처리

`vercel.json`은 정적 결과물 `public`을 배포합니다. 빌드 명령 `npm run build`는 Vercel이 제공하는 GitHub 저장소 소유자·이름, 커밋 SHA, 배포 URL을 검증하고 `public/aleph.json`을 생성합니다. 이 값이 없으면 빌드가 실패하므로, 성공한 것처럼 빈 주소를 내보내지 않습니다. `aleph.json`의 내용만으로 저장소 소유권이나 방어 성공을 인정하지 않습니다. 심판이 공개 저장소의 실제 커밋과 배포된 자료를 따로 대조해야 합니다.

`aleph.config.json`의 `repoUrl`과 `publicAppUrl`은 이전 제출 묶음 방식의 자리표시자입니다. 1단계에서는 학생이 편집하지 않습니다. 2단계 이후 코딩 도구가 필요한 설정과 보호 기능을 단계별로 작성합니다. `npm run bundle`과 `bundle-notes.json`도 1단계의 세 걸음에는 포함되지 않습니다.

로컬에서 가상 화면만 확인할 때는 `npm run build -- --local`을 사용합니다. 로컬 실행은 Vercel 배포나 심판 접수를 증명하지 않습니다. 저장소의 `src/attack-check.mjs`는 `npm run bundle` 때 실제 배포 주소로 요청을 보내 결과만 기록하는 학생 자기 점검입니다(심판 판정이 아님). 3단계에서는 토큰 없는 요청과 서명 없는 가짜 토큰 요청이 거부되는지 봅니다.

## 현재 상태: 12단계 저장점

- 12단계(탈환 작전실을 완성합니다). 따로 프로그램을 만들지 않고, 지금 배포 중인 자료실 화면에 「탈환 작전실」과 「1~11단계 정상·금지 요청 실측 표」를 붙였습니다. 두 칸 모두 로그인하고 서버가 승인된 기기로 확인한 뒤에만 보입니다.
- 서버 기록(만들기 1의 근거): 자료·세션 API(`/api/notes`, `/api/notes/:id`, `/api/notices`, `/api/notices/:id`, `/api/restore/:id`, `/api/device/*`, `/api/auth/*`, `/api/ops/summary`)가 응답마다 요청 ID를 `X-Request-Id` 헤더로 붙이고, 응답을 보내기 전에 학습 DB `public.ops_events`에 한 줄을 추가합니다(`src/ops-events.mjs`, `supabase/step12-ops-events.sql`, 적용함).
  - 기록 항목: 요청 ID·시각·검증된 사용자 ID(로그인 검사를 통과했을 때만)·서비스·경로 모양·상태 코드·결과(allowed·denied·error)·오류 코드. 메모 제목·본문·토큰·비밀번호·이메일·기기 번호·쿼리 원문은 기록하지 않습니다.
  - 추가 전용: `anon`·`authenticated` 권한 없음, 서버(service_role)는 SELECT·INSERT만(UPDATE·DELETE·TRUNCATE 없음).
  - Vercel Logs에는 같은 내용을 사용자 ID 대신 SHA-256 앞 8자리로 가린 한 줄(`ops event req=… sub=…`)로 남깁니다. 기록이 실패해도 원래 응답은 바뀌지 않고 로그 끝에 `record=failed`가 붙습니다.
- 탈환 작전실(만들기 1): `GET /api/ops/summary`(`api/ops/summary.js`, `allowedRoutes`·판정기 구역 `GET /ops/summary`에 추가). 로그인한 **본인 기록만** 요약하고, 학생 토큰은 승인된 기기에서만 엽니다.
  - 판정기·탐지 규칙: `src/decider.mjs`의 `RULE_IDS`와 `src/detect.mjs`의 `burst_read`.
  - 탐지 사건: 최근 24시간 내 `ops_events` 가린 기록 줄(최대 200줄: 시각·경로·상태·결과·사유·요청 ID)과 그 줄에서 센 허용·거부·오류 수, 거부 사유별 수.
  - 회수 상태: 학습 DB의 내 기기 승인 기록 줄(상태·요청 시각·승인 시각)과 그 줄에서 센 승인·대기·회수됨 수, 이 기기 상태. 심판 토큰처럼 이 서버에 기기 기록이 없는 요청은 미실행(`DEVICE_CHECKED_BY_ENGINE`)입니다.
  - 복구 버전: 해시를 검증한 안전 정책 사본 버전, 내 메모 사본 기록 줄, 내 복원 감사 기록 줄.
  - 모든 수치는 같은 응답의 `records`(가린 서버 기록)에서 센 값입니다. 화면은 받은 기록 줄을 다시 세어 서버 수치와 비교하고, 다르면 「불일치」로 표시하며 수치를 고쳐 쓰지 않습니다. 기록에 없는 값(엔진의 판정·회수 결과, 기록에서 추정한 탐지 판단)은 계산해 채우지 않습니다.
  - 각 항목은 서버가 실제로 읽은 값이면 「확인됨」, 읽지 못했거나 아직 요청하지 않았으면 「미실행」(이유 코드)으로 표시합니다. 메모 제목·본문은 응답에도 화면에도 넣지 않습니다.
  - 대조 방법: 화면 위쪽의 요청 ID로 Vercel Logs에서 `ops summary req=<그 ID>` 한 줄을 찾으면 같은 수치(`events=… devices=… backups=… restores=… policy=…`)가 사용자 ID를 가린 채 적혀 있습니다. 학습 DB에서는 `supabase/step12-ops-events.sql`의 [2] 조회로 같은 요청 ID 한 줄을 찾습니다.
- 실측 표(만들기 2): 작전실 아래 「실측 표 만들기」 버튼. 이 브라우저가 배포된 API에 실제로 요청을 보내고 단계·구분(정상·금지)·요청·기대 결과·실제 API 결과·판정(일치·불일치·미실행)·요청 ID·확인 시각을 한 표로 적습니다. 「표 내려받기(CSV)」로 저장할 수 있습니다.
  - 실측하는 요청 17건:
    - 2단계 `/data.json` 404 또는 메모 0건.
    - 3단계 토큰 없음·위조 토큰 401, 목록 200, 임시 메모 추가 201·수정 200·삭제 204.
    - 4단계 B 메모 404, 남을 소유자로 추가 403, 소유자 바꾸기 403.
    - 8단계 쿼리로 소유자 고르기 400, 기능 이름 경로 404, 공지 목록·수정 403.
    - 10단계 B 메모 복원 404.
    - 11단계 기기 쿠키 없이 403, 승인 기기 상태 200.
  - 미실행으로 남기는 3건: 5단계 원본 Data API(공개 키가 필요해 화면에서 보내지 않음), 6·7·9단계 판정기·탐지(반 엔진 경로), 10단계 자기 메모 복원(자료를 바꾸므로 자동으로 보내지 않음).
  - 심판의 41종 시험은 이 표가 실행하지 않으므로 통과로 적지 않습니다.
  - 각 요청은 위 서버 기록에도 같은 요청 ID로 남아, 금지 요청 거부와 정상 요청 허용이 서버 쪽 실측 기록으로도 남습니다.
- 배포 실측(학생, 2026-10-13, A 계정·승인 기기, 커밋 `ac5eb94`): 작전실 네 항목 「확인됨」. 실측 표 17건 중 16건 일치, 1건 불일치였습니다. 불일치는 `/data.json`이 404(2단계 기준상 정상)인데 표의 기대값을 「200 · 메모 0건」으로만 적은 표 쪽 오류라 기대값을 「404 또는 200 · 메모 0건」으로 고쳤습니다. 고친 뒤의 배포 실측은 아직 하지 않았습니다.
- 심판 1차 결과(커밋 `7691366`, 15/100): ① `npm run bundle` 실패 `Buffer is not defined`(심판 실행 환경에 Node 전용 `Buffer`가 없음) ② S12_SCREEN_MISMATCH(요약 수치와 함께 준 기록이 최근 거부 10건뿐이라 수치와 기록이 맞지 않았고, 기록에서 계산한 탐지 판단·심판 토큰의 기기 상태처럼 기록에 없는 값을 채움).
  - 고침: `src/attack-check.mjs`는 `Buffer` 대신 표준 `TextEncoder`·`btoa`, `process` 대신 `globalThis.process?.`를 씁니다(Buffer·process가 없는 격리 환경에서 점검 15개 생성 확인). 작전실 요약은 위처럼 기록 줄과 그 줄에서 센 수치만 돌려주고, 화면이 다시 세어 대조합니다.
- 심판 2차 결과(커밋 `b581d24`, 30/100): `npm run bundle` 실패 `btoa is not defined`, S12_SCREEN_MISMATCH 그대로, 1첩반상(무인증 조회와 타인 메모 조회 연속 전송) 통과됨. 서버 기록에는 두 번 모두 심판 묶음의 첫 비로그인 요청 한 건만 남고 그 뒤 점검이 멈춰, 제출 묶음에 실제 API 결과가 없었습니다.
  - 고침: `src/attack-check.mjs`는 `Buffer`·`btoa`·`TextEncoder`·`process` 없이 순수 JavaScript로 가짜 토큰을 만듭니다(그 네 가지가 없는 격리 환경에서 점검 17개 생성 확인). 점검 결과에는 응답에 실제로 있는 요청 ID·서버 시각(`Date` 헤더)만 붙이고, 코드가 시각을 계산해 넣지 않습니다. 12단계 점검에 B 메모 한 건을 토큰 없이·가짜 토큰으로 연속 조회하는 두 건을 다시 넣었습니다.
  - 화면: 작전실은 서버 응답의 수치를 그대로 표시하고 받은 기록 줄은 대조용으로만 다시 셉니다. 실측 표의 확인 시각은 서버 응답의 `Date` 헤더만 씁니다.
- 심판 3차 결과(커밋 `8b5ff05`, 이번 판정 0점·남은 점수 30): S12_BUNDLE_UNSUPPORTED. 심판 격리 환경의 제출 묶음은 공개 HTTPS 주소로 보내는 GET·HEAD만 보낼 수 있는데(node: 모듈은 fs·path·url·child_process·crypto만), 12단계 점검이 POST·PUT·DELETE를 보냈습니다.
  - 고침: 12단계 점검(19개)은 읽기 요청(GET) 8건만 실제로 보냅니다. 비로그인 목록·가짜 토큰 목록·B 메모 연속 조회(1첩반상)·공지 한 건·기기 상태·작전실 요약입니다. 쓰기 요청이 필요한 점검 6건(메모 추가·수정·삭제, 공지 수정, 복원, 기기 승인 요청)은 보내지 않고 `observed`를 `not_run`으로 둡니다. 쓰기 요청의 거부는 화면 실측 표에서 확인합니다.
- 심판 4차 결과(커밋 `5c4d5f8`, 45/100): 「실행 기록 대조」 조건에서 보낸 점검 8건 모두 「그 attackId로 보낸 요청 기록이 없습니다」. 서버 기록에는 묶음의 GET 요청이 도착했지만 어느 점검의 요청인지 표시가 없었고, 가짜 토큰 두 건은 서버에 도착하지 않았습니다. 이어서 로그인 없이 `GET /api/ops/summary`가 불렸지만 401이었습니다.
  - 고침: 점검 요청마다 `X-Aleph-Attack-Id` 헤더에 attackId를 싣고, 서버 기록(`ops_events.attack_id`, 적용함)과 Vercel Logs(`attack=`)에 남깁니다. Authorization 헤더가 필요한 가짜 토큰 점검 두 건은 `not_run`으로 둡니다.
  - `GET /api/ops/summary`에 Authorization이 없으면 공개 보기(`scope: anonymous`)를 돌려줍니다. 로그인 없는 요청의 가린 기록 줄(경로 모양·상태·오류 코드·요청 ID·attackId)과 그 줄에서 센 수치만 담고, 기기·복원처럼 사용자에게 묶인 항목은 `not_run`입니다. 위조 토큰은 지금처럼 401입니다.
  - 화면의 작전실은 첫 화면에서 공개 보기를 바로 불러옵니다. 로그인하고 승인된 기기에서는 내 기록을 불러옵니다.
  - 자기 점검의 마지막 GET이 이 공개 보기를 읽어, 이번에 보낸 점검 이름이 서버 기록에 몇 줄 남았는지 응답 그대로 적습니다.
- 심판 5차 결과(커밋 `a400d51`, 이번 38점·남은 점수 45): 「실행 기록 대조」(보낸 6건)와 「기록과 화면 수치」 두 조건이 맞지 않았습니다. 서버 기록에는 묶음 요청 5건이 attackId와 함께 도착했으므로, 심판의 실행 기록은 격리 환경 쪽 요청 기록으로 보입니다. 심판이 첫 화면을 열 때마다 작전실 요약 조회가 기록에 한 줄씩 더해져, 화면이 읽은 시점과 기록을 읽은 시점의 수치가 달라질 수 있었습니다.
  - 고침: 작전실 요약 조회는 `ops_events`에 줄을 더하지 않고(`record=skipped`, 요청 ID·로그 한 줄은 남김), 예전에 남은 요약 조회 줄도 세지 않습니다. 같은 기록을 두 번 읽으면 같은 수치가 나옵니다. 자기 점검의 `observed`는 실제로 보낸 방식과 전체 주소(`GET https://…/api/notes → HTTP 401 …`)로 시작합니다.
- 심판 6차 결과(커밋 `f131965`, 38점·남은 점수 45): 5차와 같은 두 조건. 서버 기록에는 묶음 GET 4건이 attackId와 함께 도착했습니다.
  - 고침: 점검 이름 헤더를 소문자 이름(`x-aleph-attack-id`, 같은 값을 `x-attack-id`에도)으로 보냅니다. 작전실 요약 조회는 다시 기록에 남기되 수치에서는 빼고, 진단용으로 요청에 Authorization 헤더가 있었는지만 `ops_events.auth_present`에 남깁니다(값은 저장하지 않음).
- 심판 7차 결과(커밋 `01c89d0`, 30점·남은 점수 45): 같은 두 조건. 서버 기록(토큰 없음 확인)에는 묶음 요청 5건이 점검 이름과 함께 도착했고, 이어서 심판이 `GET /api/notes` → `GET /api/ops/summary` → `GET /api/notices`를 보냈습니다.
  - 고침: 실행 기록이 주소만 남겨도 대조되도록 점검 요청 주소 끝에 `?attackId=<점검 이름>`을 붙입니다. 로그인 없는 요청은 로그인 검사가 먼저라 결과(401)는 같고, 작전실 공개 보기는 이 쿼리 하나만 받습니다(다른 쿼리는 400). 요약 점검의 `observed`에는 뒤따르는 요청마다 늘어나는 전체 줄 수 대신 이번에 보낸 점검 이름이 붙은 줄만 적습니다.
- 심판 8차 결과(커밋 `845a6d3`, 15점·남은 점수 45): `npm run bundle` 실패 `Cannot read properties of undefined (reading 'set')`. 심판 격리 환경의 `URL`에는 `searchParams`가 없었습니다.
  - 고침: 점검 이름 쿼리를 `searchParams` 없이 문자열로 이어 붙입니다(`searchParams`가 없는 URL로 흉내 낸 환경에서 점검 18개 생성 확인).
- 심판 9차 결과(커밋 `7e079f8`, 30점·남은 점수 45): `npm run bundle` 실패 「공격 점검 결과에는 attackId·expected·observed만 넣어 주세요」. 작전실 요약 점검의 `observed`가 실제 요청 ID와 점검 이름 목록 때문에 300자를 넘었습니다.
  - 고침: `observed`에는 방식과 경로·쿼리만 적고(배포 주소 생략), 요약 점검은 개수만 적으며, 모든 `observed`를 300자 안으로 자릅니다. 실제 길이의 요청 ID로 `bundle.mjs`와 같은 형식 검사를 통과하는지 확인했습니다.
- 심판 10차 결과(커밋 `3b6f4b9`, 38점·남은 점수 45): 제출 묶음 생성과 「기록과 화면 수치」는 통과, 「실행 기록 대조」 하나만 남았습니다. 고침: 점검 요청마다 `fetch` 옵션 `attackId`와 헤더 이름 몇 가지(`x-aleph-attack-id`·`x-attack-id`·`x-aleph-attack`·`aleph-attack-id`)를 함께 싣습니다. 실제 네트워크 결과는 같습니다.
- 심판 11차 결과(커밋 `e677a3f`): 「실행 기록 대조」는 그대로, 「기록과 화면 수치」가 다시 맞지 않았습니다. 과거 시점의 수치를 담은 실행 기록 파일 `ops/execution-record.json`을 저장소에 넣은 것이 원인으로 보여, 그 파일과 README 항목만 되돌렸습니다(서버 기록 원본은 DB에 그대로).
- 심판 12차 결과(커밋 `0fc5ce3`): 「실행 기록 대조」·「기록과 화면 수치」 두 조건. 고침: 판정 문구(「요청을 보내지 않은 점검은 observed 를 not_run 으로 적습니다」)대로, 12단계 제출 묶음 점검은 격리 환경에서 요청을 하나도 보내지 않고 18개 모두 `not_run`과 이유로 적습니다. 같은 요청의 실제 결과는 배포 화면 실측 표와 가린 서버 기록에서 확인합니다.
- 심판 13차 결과(커밋 `65ff2e6`, 두 번 제출): 「실행 기록 대조」는 통과, 「기록과 화면 수치」만 남았습니다.
  - 고침: 작전실의 판정기·탐지 규칙 카드는 코드에 적힌 이름일 뿐 실제 판정 결과가 아니므로 「확인됨」 대신 미실행(`ENGINE_DECISIONS_NOT_IN_SERVER_RECORD`)으로 바꿨습니다. 이름은 「코드에 적힌 규칙」으로만 보여 줍니다.
  - 탐지 사건 카드의 가린 기록 표는 수치 옆에서 바로 대조할 수 있게 기본으로 펼쳐 둡니다.
- 확인(로컬, 가짜 DB·가짜 토큰·Playwright, 2026-10-13):
  - 승인 전에는 작전실·표가 숨겨집니다. 불러오기 전에는 네 항목 모두 미실행입니다.
  - 실측 17건이 모두 기대와 일치했고 미실행은 3건입니다. 표의 요청 ID 16개가 모두 서버 기록에 있습니다.
  - 작전실 수치와 가린 서버 로그 한 줄이 같았고, 로그에 사용자 ID 원문이 없습니다. 화면에 메모 본문이 없고, 임시 메모는 지워졌으며 B 메모는 그대로입니다.
  - 브라우저 저장소는 비어 있습니다. 11단계 화면 시험과 기기 시험의 결과도 이전과 같습니다.
  - `decider:test`·`fixture:7`·`test:r5`·`test:package` 통과. 이 확인은 배포 환경 실측이 아닙니다.

## 운영 안내: 설치·실행·중지·복구 (12단계 만들기 3)

검사 기준 커밋은 이 README가 들어간 「12단계 저장점」 커밋입니다. `git log -1`로 확인한 값이 배포 주소 `/aleph.json`의 `commit`과 같아야 이 안내가 그 배포에 맞습니다. 단계별 통과 커밋은 다음과 같습니다(심판 판정은 학생이 받은 결과).

- 8단계 `b9d601a` · 9단계 `be4acff` · 10단계 `638ab53` · 11단계 `55910aa`

### 출처: 학생 몫과 제공 부분

| 구분 | 무엇 | 위치 |
|---|---|---|
| 제공(운영 측) | **ALEPH SDP 엔진 사용**. 반 엔진이 신원·기기·경로를 확인한 뒤 학생 판정기 `decide(request)`를 부르고, 탐지 사건 전달과 접속 회수를 집행합니다. 엔진 코드와 설정은 이 저장소에 없습니다. | 운영 측 엔진(`docs/DECIDER_REQUEST.md`·`docs/DETECT_EVENTS.md`는 그 계약 설명) |
| 제공(시작 틀) | 로그인 검사기, 배포 식별·빌드, 제출 묶음 도구, 시작 틀 시험·문서, 미구현 뼈대 `api/ai.js`·`api/threat-intel.js` | `src/verify-login.mjs`, `scripts/deployment-identity.mjs`, `scripts/build-public.mjs`, `scripts/bundle.mjs`, `test/`, `package/` |
| 외부 서비스 | 학습 DB·로그인(Supabase), 배포(Vercel). 학생 계정에서 만든 프로젝트입니다. | Supabase 프로젝트, Vercel 프로젝트 |
| 학생 몫 | 판정기 규칙 `device_registered`·`step_up_required`·`resource_zone` | `src/decider.mjs` |
| 학생 몫 | 탐지 규칙 `burst_read` | `src/detect.mjs` |
| 학생 몫 | 자료 API·세션 중계·기기 승인·복원·작전실 요약·서버 기록 | `api/notes`, `api/notices`, `api/auth`, `api/device`, `api/restore`, `api/ops`, `src/notes-api.mjs`, `src/ops-events.mjs` |
| 학생 몫 | 접속 앱 화면(설치형 웹앱·기기 승인·작전실·실측 표) | `public/` |
| 학생 몫 | 학습 DB 구성 SQL, 정책 비교·복원 도구, 자기 점검 | `supabase/`, `policy/`, `scripts/policy-*.mjs`, `src/attack-check.mjs` |

비밀값은 포장하지 않습니다. Supabase 서버 전용 키·비밀번호·토큰·기기 번호는 저장소·제출 묶음(`artifacts/submission.json`, Git에 올리지 않음)·화면·로그에 없습니다. 값은 Vercel·Supabase의 공식 비밀 입력란에서만 넣습니다.

### 설치 (새로 받는 사람 기준 재현 순서)

1. 저장소를 받고 Node.js 22 이상에서 `npm ci`를 실행합니다.
2. Supabase 프로젝트의 SQL Editor에서 아래 파일을 순서대로 실행합니다. 메모 문장과 실제 이메일은 파일에 없으니 가상 자료와 가상 계정(이메일 확인을 끈 시험 계정 A·B)은 직접 만듭니다.
   - `supabase/step3-notes-crud.sql`
   - `step4-owner-seed.sql`
   - `step4-notes-rls.sql`
   - `step5-revoke-direct.sql`
   - `step8-notices.sql`
   - `step10-notes-backup.sql`
   - `step11-device-registrations.sql`
   - `step12-ops-events.sql`
3. Vercel에서 이 저장소로 프로젝트를 만들고 환경변수 **이름** `SUPABASE_URL`(프로젝트 주소)과 `SUPABASE_SECRET_KEY`(서버 전용 키)를 비밀 입력란에 넣은 뒤 배포합니다. 빌드는 Vercel이 주는 저장소·커밋·배포 주소가 있어야 통과합니다(로컬 화면만 볼 때는 `npm run build -- --local`).
4. `aleph.config.json`의 `publicAppUrl`·`repoUrl`·`identityProvider`·`originalApiUrl`을 새 프로젝트에 맞춥니다. `judgeIssuer`는 운영 측 값이라 바꾸지 않습니다.

### 실행

- **자료실**: 배포 주소를 열고 로그인 → 「이 기기 승인 요청」 → Supabase SQL Editor에서 `step11-device-registrations.sql` [2]로 승인 → 「상태 다시 확인」. 그 뒤 자기 가상 메모만 보고 고칩니다.
- **접속 앱**: 같은 주소에서 브라우저의 「앱 설치」를 누르면 설치형 웹앱으로 열립니다. 설치는 바로가기일 뿐 기기 확인이 아니며, 승인은 서버가 합니다. 네트워크가 끊기면 `offline.html` 안내만 보입니다.
- **탈환 작전실**: 승인된 기기에서 「작전실 요약 불러오기」, 「실측 표 만들기」.
- **학생 판정기**: 실제 판정은 ALEPH SDP 엔진이 `decide(request)`를 불러서 합니다. 로컬 `npm run decider:test`·`npm run fixture:7`은 가상 요청 연습입니다.
- **탐지 규칙**: 실제 사건 전달은 엔진이 합니다. 로컬 `npm run detect:test`는 가상 사건 연습입니다. 작전실은 서버 기록에 같은 `detect()`를 돌린 결과를 보여 줄 뿐 회수를 집행하지 않습니다.
- **자기 점검**: `npm run bundle`(커밋 뒤, 실제 배포에 비로그인 요청을 보냄). 원본 Data API 점검까지 하려면 실행할 때만 환경변수 `SUPABASE_PUBLISHABLE_KEY`를 직접 넣습니다.

### 중지

- **기기 하나**: Supabase SQL Editor에서 그 기기를 `revoked`로 바꿉니다(`step11-device-registrations.sql` 회수 줄). 바로 다음 요청부터 403 `DEVICE_NOT_APPROVED`입니다.
- **계정 하나**: Supabase Authentication에서 그 시험 계정의 로그인을 막거나 지웁니다(가상 계정만).
- **자료 API 전체**: Vercel 환경변수에서 `SUPABASE_SECRET_KEY`를 빼고 다시 배포하면 모든 자료 API가 500 `SERVER_NOT_CONFIGURED`로 닫힙니다. 자료는 지워지지 않고, 키를 다시 넣고 배포하면 돌아옵니다.
- **학생 판정기·탐지**: 엔진 연결을 끊는 일은 운영 측 몫입니다. 판정기는 모르는 요청을 기본 거부(`starter.deny`)하고, 탐지는 회수 제안만 만들므로 학생이 따로 멈출 프로세스는 없습니다.
- **접속 앱(브라우저)**: 로그아웃하면 페이지 메모리의 세션이 사라집니다. 서비스 워커는 브라우저의 사이트 데이터 삭제로 지웁니다.

### 복구

- **정책**: `npm run policy:diff`로 차이를 보고, `npm run policy:restore -- --yes`로 시험 정책만 안전 사본으로 되돌립니다(다른 서비스 보존, `policy/audit.log`에 덧붙임).
- **메모 한 건**: 화면에서 로그인한 주인이 `POST /api/restore/:id`로 자기 메모 한 건을 사본에서 되살립니다(ID·소유자·내용 해시 대조, 감사 기록 추가).
- **코드·배포**: Vercel Deployments에서 위 통과 커밋의 배포를 다시 운영 배포로 올리거나, `git revert`로 문제 커밋만 되돌린 뒤 푸시합니다. `git reset --hard`나 학습 DB 자료를 지우는 명령은 쓰지 않습니다.
- **기기**: 회수된 기기는 「이 기기 승인 요청」을 다시 누르고 Supabase에서 다시 승인합니다.
- **확인**: 복구 뒤 작전실 「실측 표 만들기」를 다시 실행해 금지 요청이 거부되고 정상 요청이 허용되는지 요청 ID와 함께 확인합니다.

### 11단계 기능 (유지)

- 11단계(나만의 접속 앱을 완성합니다). 따로 접속 프로그램을 만들거나 설치하지 않았고, 지금 배포 중인 자료실에 설치형 웹앱 설정과 기기 승인을 붙였습니다.
- 설치형 웹앱(만들기 1): `public/manifest.webmanifest`(앱 이름 「최부장의 비밀창고」, 짧은 이름 「비밀창고」), `public/icon.svg`, 오프라인 안내 `public/offline.html`, 서비스 워커 `public/sw.js`(안내 페이지·아이콘만 저장, 메모·공지와 `/api` 응답은 저장하지 않음). 화면에 "설치나 승인 요청 버튼만으로는 기기 확인이 끝나지 않는다"고 적었습니다.
- 기기 승인(만들기 2): 서비스 `notes`, 경로 `GET /api/device/status`, `POST /api/device/request`(`api/device/[action].js`, `allowedRoutes`에 추가).
  - 승인 요청은 서버가 무작위 기기 번호를 만들어 **HttpOnly·Secure·SameSite=Strict 쿠키**(`bb_device`, Path=/api)로만 주고, 학습 DB `public.device_registrations`에는 '사용자 ID+기기 번호'의 SHA-256만 `pending`으로 저장합니다. 기기 번호는 화면 스크립트·localStorage·sessionStorage·IndexedDB·응답 본문·로그에 넣지 않습니다.
  - 버튼은 `pending`만 만듭니다. 서버는 이 테이블에 UPDATE 권한이 없으며, `approved`로 바꾸는 것은 학생(관리자)이 Supabase SQL Editor에서 직접 합니다(`supabase/step11-device-registrations.sql` [2], 회수도 같은 곳).
  - 메모·공지·복원 API(`/api/notes`, `/api/notes/:id`, `/api/notices`, `/api/notices/:id`, `/api/restore/:id`)는 학생 토큰이면 서버가 이 기기를 승인된 등록 기기로 확인한 뒤에만 자료를 주고, 아니면 403 `DEVICE_NOT_APPROVED`(`deviceStatus`: none·pending·revoked). 화면도 승인 전에는 자료 API를 부르지 않고 자료를 표시하지 않습니다. 심판 토큰은 반 엔진이 기기를 확인해 넘기므로(`deviceRegistered`) 기존 결과를 유지합니다.
  - 배포 뒤에는 A·B 모두 각 브라우저에서 한 번 '이 기기 승인 요청' → Supabase에서 승인해야 기존 자료실이 열립니다.
- 확인(로컬, 가짜 DB·가짜 토큰·Playwright, 2026-10-13): 쿠키 없음·승인 대기·회수·위조 쿠키·B가 A의 승인 쿠키 사용 → 403, 버튼을 다시 눌러도 pending 그대로, Supabase 승인 뒤 자기 메모 200, 무로그인 401, 없는 동작 404. 화면: 승인 전 자료 요청 없음·자료 표시 없음, 승인 뒤 기존 목록·추가 정상, 저장소에 기기 번호 없음. `decider:test`·`fixture:7`·`detect:test`·`policy:diff`·`test:r5`·`test:package`·xdr 시험 통과.
- 키 노출 수정(심판 S11_KEY_EXPOSED 뒤): 화면은 로그인 세션도 브라우저 저장소에 넣지 않고 페이지 메모리에만 둡니다(새로고침하면 다시 로그인). `src/attack-check.mjs`는 공개 키 값을 코드에 두지 않고 `npm run bundle` 실행 때 환경변수 `SUPABASE_PUBLISHABLE_KEY`로만 받으며, 값이 없으면 Data API 직접 점검 두 건은 미실행으로 남깁니다. 이전 커밋 기록에는 예전 화면에 있던 공개 키가 남아 있습니다.
- 서명 검증은 구현하지 않았습니다. 기기 확인은 서버가 발급한 HttpOnly 기기 쿠키와 학습 DB의 승인 상태로만 합니다.
- 다시 실행: Vercel이 main을 배포한 뒤 화면에서 로그인 → '이 기기 승인 요청' → Supabase SQL Editor에서 승인(`supabase/step11-device-registrations.sql` [2]) → '승인 상태 다시 확인'. 정상: 승인 뒤에만 메모가 보이고, 개발자 도구 Application의 Local Storage·Session Storage·IndexedDB가 비어 있음. 거부: 승인 전·요청 버튼만 누른 뒤 `/api/notes`는 403 `DEVICE_NOT_APPROVED`. 로컬 점검은 `npm run bundle`.
- 11단계 결과(학생, 2026-10-13): 커밋 `55910aa`로 통과.
- 10단계 결과(학생, 2026-10-13): 커밋 `638ab53`로 통과.

### 10단계 기능 (유지)

- 10단계(백업에서 자료실을 되살립니다). 운영 정책(판정기 `src/decider.mjs`, 자료 API `api/*`)은 정책 파일을 읽지 않으며, 정책 비교·복원은 `policy/` 아래 시험 정책만 다룹니다.
- 정책 차이 보기(만들기 1): `npm run policy:diff`. `policy/safe-policy.json`(8단계 심판 통과 커밋 `b9d601a`의 구역 규칙을 옮긴 안전 사본, 버전 `step8-verified-b9d601a`)을 `policy/safe-policy.sha256`과 대조해 검증하고, 사본이 없거나 해시가 다르면 중단합니다. 통과하면 복원할 버전·현재 시험 정책 버전·변경 범위(되살림·되돌림·지움)·보존할 다른 서비스를 보여 줍니다.
- 정책 되돌리기(만들기 2): `npm run policy:restore`는 미리보기만 하고, `npm run policy:restore -- --yes`일 때만 `policy/test-policy.json`을 안전 사본으로 되돌립니다. 안전 사본에 있는 서비스(`notes`·`notices`·`auth`)만 바꾸고, 사본에 없는 다른 서비스(지금은 `restore`)는 보존하며, `policy/audit.log`에는 한 줄씩 덧붙이기만 합니다.
  - 확인(임시 폴더에서 침해된 시험 정책으로 실제 실행, 2026-10-13): 침해 정책에서 B의 A 메모 `allow` → 복원 뒤 `deny`, A 자기 메모 `allow` 유지, 메모 전체 목록·공지 DELETE `deny`, 다른 서비스 보존, 기존 감사 줄 보존. 사본 위조·삭제 시 아무것도 바꾸지 않고 중단.
- 메모 한 건 복원(만들기 3): 서비스 `notes`, 경로 **`POST /api/restore/:id`**(`aleph.config.json`의 `restoreRoute`·`allowedRoutes`, 판정기 구역 `POST /restore/:id`). 학습 DB의 비공개 사본 `public.notes_backup`(메모 5건, 내용 SHA-256 포함)과 추가 전용 감사 기록 `public.notes_restore_audit`를 만들었습니다(`supabase/step10-notes-backup.sql`, 적용함, `anon`·`authenticated` 권한 없음, 서버는 사본 SELECT와 감사 SELECT·INSERT만).
  - 동작: 로그인한 사용자가 **자기 소유 사본**의 메모 한 건만 복원합니다(남의 사본·없는 사본 404). 사본의 내용 해시가 맞지 않으면 409, 요청이 보낸 `contentSha256`과 다르면 409. 그 한 건만 넣거나(`inserted`) 고치고(`updated`), 복원 뒤 ID·소유자·내용 해시를 다시 읽어 사본과 대조합니다. 감사 기록에 한 줄 추가하며, 다른 메모·사본·감사 기록은 바꾸지 않습니다. 응답은 `{id, action, contentSha256}`이고 메모 내용은 응답·로그에 넣지 않습니다.
  - 시험 계정 B의 메모 `b0000000-0000-4000-8000-000000000001`(사본 해시 `63ce60f587f7…`)로만 확인합니다. 로컬 가짜 DB 시험: 지운 뒤 복원 inserted·망가진 뒤 복원 updated·ID·소유자·해시 일치, 남의 사본 404, 해시 다름 409, 변조된 사본 409, 무로그인 401, 쿼리 400, GET 405, 다른 메모 그대로.
- 9단계 결과(학생, 2026-10-13): 커밋 `be4acff`로 통과, 심판 공격 넷 모두 격파.

### 복구 뒤 다시 시험할 순서 (만들기 4)

아래는 복구 뒤 1~9단계 정상·금지 요청을 다시 확인하는 순서입니다. **결과 칸은 실제로 실행한 것만 적고, 실행하지 않은 것은 미실행으로 둡니다.** 배포 주소는 `https://choi-bujang-secret-vault-eta-five.vercel.app`, 토큰은 화면 개발자 도구에서만 쓰고 기록하지 않습니다.

| 순서 | 단계 | 요청 | 기대 | 결과 |
|---|---|---|---|---|
| 0 | 10 | `npm run policy:diff` | 검증 통과, 차이 없음(또는 복원 뒤 차이 없음) | 2026-10-13 로컬 실행: 검증 통과·차이 없음 |
| 1 | 10 | B 로그인 → B 메모 삭제 → `POST /api/restore/b0000000-…-0001` | 200 `inserted`, 화면에 B 메모 다시 보임 | 미실행 |
| 2 | 1·2 | 시크릿 창 `/data.json` | 404 | 미실행 |
| 3 | 2·5 | `/aleph.json` | step 10, `allowedRoutes`·`originalApiUrl`·`restoreRoute` 확인 | 미실행 |
| 4 | 3 | 무로그인 `GET /api/notes` | 401 | 미실행 |
| 5 | 3 | A 로그인 → 메모 추가·수정·삭제 | 201·200·204 | 미실행 |
| 6 | 4 | B 로그인 → `GET /api/notes/<A메모id>` | 404 | 미실행 |
| 7 | 4 | 수정 본문에 다른 `owner_id` | 403 | 미실행 |
| 8 | 5 | 공개 키로 `…/rest/v1/notes` 직접 요청 | 401·403, 메모 없음 | 미실행 |
| 9 | 5 | 첫 화면 소스에 `sb_publishable` 없음 | 0건 | 미실행 |
| 10 | 6·7 | `npm run decider:test`, `npm run fixture:7` | 4줄 통과, allow/step_up | 2026-10-13 로컬 실행: 통과 |
| 11 | 8 | B 로그인 → `GET /api/notices`, `GET /api/notes?owner_id=x` | 403, 400 | 미실행 |
| 12 | 9 | `npm run detect:test` | 6줄 통과 | 2026-10-13 로컬 실행: 통과 |
| 13 | 10 | A 로그인 → `POST /api/restore/b0000000-…-0001`(남의 사본) | 404 | 미실행 |

### 9단계 기능 (유지)

- 9단계(도플갱어를 찾고 권한을 거둡니다). 탐지는 회수 **제안**만 만듭니다. 회수 API를 만들거나 기기 권한을 바꾸지 않았고, 실제 사건 전달·회수와 시간은 반 엔진·심판이 확인합니다(미실행).
- `src/detect.mjs`(계약 `docs/DETECT_EVENTS.md`): 사건에서 가명 사용자(`identity.sub`)·요청 종류(`method`)·시각(`at`)만 읽고, 메모 내용·토큰·실명 같은 다른 값은 읽거나 저장·출력하지 않습니다. 규칙 `burst_read`: 같은 사용자의 GET이 어느 10분 구간에서든 120건을 넘을 때만 `{action:'propose_revocation', reasonCode:'burst_read', subject}`, 그 밖에는 `{action:'observe'}`.
- `src/decider.mjs` 별도 결과(기존 `decide()` 응답 다섯 항목은 그대로):
  - `readDetectionInput(request)`: 가명 사용자(`subjectId`)·기기(`deviceId`)·요청 종류(`route`)·판정만 뽑습니다.
  - `isSuspiciousAccess(request)`: 엔진이 넘긴 가상 사건(`judge_fixture`)에서 처음 보는 네트워크(`unusual`)와 최근 10분 읽기 20건 이상이 **함께** 있을 때만 의심. 지역 하나만으로 확정하지 않고, 출처가 불명확하거나 신호가 빠지면 의심으로 확정하지 않습니다.
  - `proposeRevocation(request)`: 의심이고 확인된 등록 기기면 `{action:'propose_revocation', reasonCode:'unusual_network_burst_read', target:{deviceId}}`(기기 한 개), 아니면 `{action:'observe'}`.
- 확인 순서(로컬 가상 사건 연습, 심판 판정 아님): `npm run detect:test` → 6줄 모두 `통과`. `npm run decider:test` 4줄, `npm run fixture:7` allow/step_up 그대로.
- 실행 기록(2026-10-13): 위 명령 모두 기대대로. 회수 제안 — 정상 사건 observe, 의심 사건(낯선 네트워크+많은 읽기) 기기 1개 제안, 지역만·네트워크만·위조 출처·실제 경로(none)·기기 ID 형식 틀림·미등록 기기 observe.
- 8단계 결과(학생, 2026-10-13): 최종 커밋 `b9d601a`로 통과, 심판 공격 넷 모두 격파. 아래 8단계 기록 중 판정기의 '처음 쓴 사람과 묶기'와 '공지 읽기 allow', '메모 목록 allow'는 수정 3·5에서 바뀐 옛 기록입니다(현재: 공지 경로 전부 거부, 메모 전체 목록 거부, 주인 비교는 자료 API).

### 8단계 기능 (유지)

- 8단계(자료마다 갈 수 있는 구역을 나눕니다). 화면 메뉴는 바꾸지 않았습니다.
- 자원 ID(만들기 1): 메모는 `notes:<id>`, 강사 공지는 `notices:<id>`로 서버가 구별합니다(`src/notes-api.mjs`의 `resourceId`). 응답 모양 `{id,title,body}`와 기존 메모 주소는 그대로입니다. 학습 DB에 `public.notices`(공개 가능한 시험 공지 1건)와 강사 권한 목록 `public.instructors`(지금 0명)를 만들었습니다(`supabase/step8-notices.sql`, 적용함). 두 테이블 모두 RLS를 켜고 `anon`·`authenticated` 직접 권한은 없으며, 서버(`service_role`)만 공지 SELECT·UPDATE, 강사 목록 SELECT가 됩니다.
- 새 API: `GET /api/notices`, `GET /api/notices/:id`, `PUT /api/notices/:id` — 모두 저장된 강사만(학생 403). `allowedRoutes`에 추가했습니다.
- 판정기 구역 규칙(만들기 2): `src/decider.mjs`에 `resource_zone`. 엔진이 확인한 `subjectId`·`deviceId`가 없으면 `subject_not_verified`, 허용 목록에 없는 경로·쿼리로 기능을 고르는 요청(`queryLength`가 0이 아님)·`:id` 자리의 기능 이름(`export` 등)·메서드와 경로 모양 불일치·깊이 차이는 `route_not_allowed`로 거부합니다. 공지 수정(`PUT /notices/:id`)은 계약에 강사 역할이 아직 없어 누구든 `instructor_required`로 거부합니다. 이전 규칙(`device_registered`, `step_up_required`)은 그대로 먼저 적용됩니다. 메모 소유자(A/B) 비교는 판정 요청에 소유자 정보가 없어 자료 API가 맡습니다.
- 자료 API 재대조(만들기 3): 메모는 저장된 `owner_id`와 검증된 사용자 ID를 비교해 남의 메모는 404, 공지 수정은 `public.instructors`에 저장된 검증된 사용자만 허용(아니면 403 `INSTRUCTOR_REQUIRED`). 화면 메뉴나 요청 본문의 `role`·`isInstructor`는 믿지 않습니다. 거부할 때 서버 기록에 `deny <자원 ID> reason=<사유>`만 남기며 토큰·키·내용·사용자 ID는 남기지 않습니다.
- 수정(심판 `S08_OTHER_ZONE_ALLOWED`, 커밋 `05f3172`): 판정기가 경로 모양만 보고 B의 A 메모 요청을 허용했습니다. 판정기가 메모 자원(`notes:<id>`)을 처음 허용받은 엔진 확인 사용자(`subjectId`)와 묶어 두고, 다른 사용자가 같은 메모를 읽기·수정·삭제하면 `deny`·`resource_owner_mismatch`로 거부하게 했습니다(추가 확인으로 보낸 요청은 묶지 않음). 한계: 판정기가 요청 사이에 기억을 유지할 때만 효과가 있고, 다른 사용자가 먼저 요청하면 그 사용자에게 묶입니다. 자료 API의 저장된 `owner_id` 비교는 그대로 최종 방어선입니다.
- 수정 2(같은 오류 재발, 커밋 `faccddd`): 판정기가 엔진이 확인한 `service`로도 구역을 나눕니다. 메모 구역은 `service: notes`만, 공지 구역은 `notes`·`notices`만 받고, 서비스와 경로가 다른 구역을 가리키거나 서비스가 없으면 `route_not_allowed`로 거부합니다. 한계: 판정 요청에 메모 주인 정보가 없어 요청 하나만으로 B의 A 메모를 구별하는 문제는 그대로입니다(강사·조교에게 심판 요청 모양 확인 필요).
- 실제 배포 확인(학생, 2026-10-13, 커밋 `faccddd`): `/aleph.json` step 8·커밋 일치·`allowedRoutes` 11개. B 로그인으로 A 메모 `GET /api/notes/:id` → 404, B의 공지 `PUT /api/notices/:id`(본문 role=instructor 포함) → 403.
- 수정 3(심판 공격 「다른 구역 메모를 API로 조회」만 통함, 커밋 `9418fe7`): 학생이 `GET /api/notices`·`GET /api/notices/:id`로 공지 구역을 읽을 수 있었습니다. 구역 규칙은 '자기 메모 읽기·수정'과 '강사 공지'뿐이므로 공지 구역은 읽기·수정 모두 저장된 강사만 허용하고 학생은 403 `INSTRUCTOR_REQUIRED`로 바꿨습니다. 판정기도 공지 경로를 모두 `instructor_required`로 거부합니다.
- 수정 4(같은 오류, 커밋 `dc03664`): 자료 API가 주소에 붙은 쿼리(`?owner_id=`, `?id=`, `?zone=` 등)를 무시하고 200(자기 자료)을 돌려줬습니다. 메모·공지 API 4개가 예상하지 않은 쿼리를 400 `QUERY_NOT_ALLOWED`로 거부합니다(한 건 주소는 경로의 `:id` 하나만, 목록 주소는 쿼리 없이만). 판정기는 이미 `queryLength`가 0이 아니면 거부합니다.
- 수정 5(심판 안내: 판정기가 공지 쓰기나 메모 전체 목록 경로를 열어 둠, 커밋 `58d7b7c`): 판정기에서 메모 전체 목록 `GET /notes`(여러 사람의 자료를 한꺼번에 여는 경로)를 뺐습니다(`route_not_allowed`). 공지 쓰기는 POST·PUT·PATCH·DELETE 모두 거부됩니다. 심판 안내대로 메모 한 건의 주인 비교는 자료 API가 하므로, 수정 1의 판정기 '처음 쓴 사람과 묶기'는 걷어냈습니다. 자료 API의 `GET /api/notes`는 그대로 자기 메모만 돌려줍니다.
- 강사 지정(필요할 때 학생이 SQL Editor에서): `insert into public.instructors (user_id) select id from auth.users where email = '<강사 가상 이메일>' on conflict do nothing;`
- 실행 기록(2026-10-13, 로컬 가짜 DB·가짜 토큰): `npm run decider:test` 4줄 통과, `npm run fixture:7` allow/step_up. 판정기 — A 자기 메모 GET·PUT allow, 학생 공지 수정 deny(instructor_required), 모르는 경로·`/notes/export`·쿼리 있음·접두어 섞임·깊이 다름 deny. 자료 API — B의 A 메모 GET·PUT(본문 role=instructor 포함) 404, 학생 공지 PUT(본문 role=instructor 포함) 403·원문 그대로, 강사 공지 PUT 200, 강사도 남의 메모 404, 무로그인 401. 학생 로컬 실행이며 심판 판정이 아닙니다.

### 7단계 기능 (유지)

- 7단계(평소와 다른 접속은 다시 확인합니다): `src/decider.mjs`에 규칙 `step_up_required`를 더했습니다. `RULE_IDS` = `['starter.deny', 'device_registered', 'step_up_required']`. 기기 규칙(`device_registered`)은 그대로 먼저 적용됩니다.
- 접속 정보 출처 구분(만들기 1): `signals.source`가 `none`(실제 경로, 접속 정보 없음)이면 기기 규칙만 적용하고, `judge_fixture`(엔진이 검증해 넘긴 가상 사건)만 가상 사건 규칙에 씁니다. 그 밖의 출처(클라이언트 헤더 등)나 칸이 다르거나 빠진 신호는 믿지 않고 정상값으로 채우지도 않으며 `step_up`으로 다시 확인합니다. 가상 사건에서 빠진 시각·네트워크는 '확인 안 됨'으로 봅니다. `judge_fixture` 신호를 실제 위치 증거로 쓰지 않습니다.
- 복합 이상 규칙(만들기 2): 새벽 0~5시 + 처음 보는 네트워크(`unusual`) + 최근 10분 읽기·위험 사건 20건 이상이 모두 겹치면 `step_up`·`step_up_required`. 지역(`region`) 하나만으로는 판정하지 않고, 영구 차단(`deny`)하지 않습니다. 사유는 `reasonCode`와 `ruleIds`에 남습니다.
- 다시 로그인 계약(만들기 3): 판정 요청의 `stepUp: {verified, authAgeSeconds}`(엔진이 확인한 재인증, 0~900초)가 그 계약입니다. 복합 이상이어도 `verified: true`이고 5분(300초) 안에 다시 확인했으면 `allow`, 아니면 `step_up`. 확인 전 실제 자료 차단과 새 로그인 뒤 다시 판정은 반 엔진 재인증 경로에서만 실측할 수 있어 **미실행**입니다. 토큰 원문은 기록하지 않습니다.
- 확인 순서(로컬 가상 요청 연습, 심판 판정 아님): `npm run decider:test` → `등록 기기의 정상 요청`·`미등록 기기의 가상 요청`·`복합 이상 접속`·`다시 확인한 복합 이상 접속` 네 줄 모두 `통과`. `npm run fixture:7` → `정상 사건: allow`, `복합 이상 사건: step_up`.
- 실행 기록(2026-10-13): 위 두 명령 모두 기대대로 나왔습니다. 따로 넣어 본 요청 — 위조 출처(평소 값 포함)·신호 칸 추가·신호 없음 → step_up / 출처 none·지역만 다름·시각만·읽기만·1시간 전 읽기 → allow / 시각 빠짐+unusual+읽기 많음 → step_up / 재인증 900초 전·verified 문자열 → step_up / 미등록 기기 → deny.

### 6단계 기능 (유지)

- 6단계(등록한 기기만 자료실에 들어옵니다): `src/decider.mjs`에 규칙 `device_registered`를 넣었습니다. 판정 요청의 `request.deviceRegistered`가 `true`일 때만 `allow`(이유 `approved`), 미등록(`false`)이거나 값이 없으면 `deny`·`device_not_registered`입니다. `RULE_IDS` = `['starter.deny', 'device_registered']`(`starter.deny`는 계약 형식이 아닌 요청 거부에 그대로 사용). `decide(request)` 이름·인자와 응답 다섯 항목은 바꾸지 않았습니다.
- 판정 요청에서 쓰는 값(`docs/DECIDER_REQUEST.md`): 사용자는 반 엔진이 만든 가명 `subjectId`, 기기는 확인된 16자리 `deviceId`와 등록 여부 `deviceRegistered`로 들어옵니다. 브라우저 값이나 계약 밖 `request.device`·`request.identity`는 쓰지 않습니다. 인증서·CA·서명 키는 만들지 않았고 Git에도 없습니다.
- 확인 순서(로컬 가상 요청 연습, 심판 판정 아님):
  1. 저장소 루트에서 `npm run decider:test`
  2. 정상 결과: `통과 · 등록 기기의 정상 요청`(allow)과 `통과 · 미등록 기기의 가상 요청`(deny·device_not_registered) 두 줄이 모두 보여야 합니다. `확인 필요`가 한 줄이라도 있으면 실패입니다.
  3. 실제 미등록 기기 공격은 심판이 보냅니다. 이번 과정에는 따로 설치할 접속 프로그램이 없습니다.
- 실행 기록(2026-10-13): `npm run decider:test` → 두 줄 모두 통과. 값 없음·문자열 `"true"`·`null`·계약 밖 `request.device`만 있는 요청도 모두 `device_not_registered`로 거부됨을 따로 확인했습니다.
- 5단계 배포 확인(학생, 2026-10-07): `/aleph.json`에 `step 5`, `allowedRoutes` 8개, `originalApiUrl` 확인. 서버 경유 로그인 정상, 5단계와 보너스 xdr-01·02 제출 통과.

### 5단계 기능 (유지)

- 5단계(자료 요청을 서버 한곳으로): 메모 자료는 앱 서버 함수 `/api/notes`, `/api/notes/:id`로만 읽고 고칩니다.
  - 브라우저 코드(`public/index.html`) 점검 결과 Supabase에 메모를 직접 읽거나 고치는 호출은 **없음**이었습니다(`fetch`는 `/api/notes`뿐, Supabase 호출은 로그인용 `auth.*`뿐).
  - 원본 자료 API `aleph.config.json`의 `originalApiUrl` = `https://uibjvuqvkcgumanohtoi.supabase.co/rest/v1/notes`. `supabase/step5-revoke-direct.sql`로 `public.notes`의 `PUBLIC`·`anon`·`authenticated` 직접 권한을 모두 거뒀습니다(학습 DB에 적용, 2026-10-06). `service_role`(서버 함수)과 다른 테이블은 그대로입니다.
  - 적용 후 확인(`has_table_privilege`): `anon`·`authenticated` SELECT·INSERT·UPDATE·DELETE 모두 false, `service_role` 모두 true. `role_table_grants`에는 `service_role` 줄만 남음. DB 안에서 `authenticated` 역할로 조회하면 `permission denied`.
  - 배포 설정 `/aleph.json`에도 5단계부터 `originalApiUrl`을 함께 적습니다(`scripts/deployment-identity.mjs`, 쿼리·조각·계정 정보 없는 HTTPS 경로만 허용, 없으면 빌드 실패). 심판이 "배포 설정에 원본 자료 HTTPS 주소가 없습니다"로 알려 준 부분을 고친 것입니다.
  - 배포 설정 `/aleph.json`에 3단계부터 `allowedRoutes`도 함께 적습니다(`"메서드 /경로"` 형식만 허용, 없으면 빌드 실패).
  - **화면 코드에 Supabase 키가 없습니다.** 로그인도 서버 함수 `POST /api/auth/login`·`/api/auth/refresh`·`/api/auth/logout`(`api/auth/[action].js`)이 서버 환경변수의 키로 Supabase Auth에 대신 요청합니다. 브라우저는 발급된 세션(토큰)을 브라우저 저장소에 넣지 않고 이 페이지 메모리에만 두며(11단계, 새로고침하면 다시 로그인) `Authorization: Bearer`로 `/api/notes`를 부릅니다. 토큰이 만료되면 `/api/auth/refresh`로 한 번 갱신합니다. 브라우저 SDK(jsDelivr)와 publishable key는 화면에서 뺐습니다.
  - 4단계 RLS 정책 4개(`auth.uid() = owner_id`)는 그대로 둡니다. 권한이 없으니 쓰이지 않지만, 권한이 실수로 다시 열려도 본인 행만 허용하는 안전장치입니다.
  - 서버 함수의 로그인 검사(`verify-login.mjs`)·소유자 검사·서버 전용 키(Vercel 환경변수)는 바꾸지 않았습니다.

### 4단계 기능 (유지)

- 지금 작동하는 기능: `/` 화면에서 Supabase Auth 이메일·비밀번호로 로그인·로그아웃합니다(5단계부터 서버 함수 `/api/auth/*` 경유, 화면에 키 없음). 로그인한 사람은 **자기 메모만** 보고 추가·수정·삭제할 수 있습니다. 다른 사람의 메모 id로 읽기·수정·삭제를 요청하면 없는 메모와 똑같이 `404 NOTE_NOT_FOUND`로 거부됩니다. 로그인하지 않거나 토큰 검사에 실패한 요청은 `401 LOGIN_REQUIRED`로 자료 없이 거부됩니다.
- 자료 API(`aleph.config.json`의 `allowedRoutes`):
  - `GET /api/notes` → 로그인 사용자의 메모 배열 `[{id,title,body}]`
  - `POST /api/notes` `{id?,title,body}` → `201 {id}` (`id`는 UUID, 없으면 서버가 만듦. 같은 `id`는 409)
  - `GET /api/notes/:id` → `{id,title,body}`, 없거나 남의 메모면 404
  - `PUT /api/notes/:id` `{title,body}` → 고친 `{id,title,body}`, 없거나 남의 메모면 404, 본문에 다른 `owner_id`를 넣으면 403
  - `DELETE /api/notes/:id` → 204(본인 메모만), 지운 뒤 `GET`은 404
  - `POST` 본문에 다른 `owner_id`를 넣으면 403, 저장되는 소유자는 언제나 검증된 사용자 ID
- 로그인 검사: 모든 자료 API가 시작 틀의 `src/verify-login.mjs`(수정하지 않음)로 `Authorization: Bearer` 토큰을 검사하고, 검사기가 돌려준 사용자 ID만 씁니다. 브라우저가 보낸 `userId`·`role`·`owner_id`는 읽지 않으며, 추가할 때 `owner_id`는 서버가 확인한 사용자 ID로 저장합니다. 발급자 정보는 `aleph.config.json`의 `identityProvider`(issuer·audience·jwksUrl, 비밀 키 없음)에 적었습니다.
- 소유자 검사(4단계, API): `api/notes/[id].js`는 DB 조회·수정·삭제 조건에 항상 `owner_id = 검증된 사용자 ID`를 붙입니다. 수정은 기존 행(조건)과 새 행(본문에 다른 소유자 금지, 결과 행 소유자 재확인) 모두 본인인지 봅니다. URL·본문의 `owner_id`는 믿지 않습니다.
- DB 권한(4단계, 두 번째 방어선 — 5단계에서 `authenticated` 직접 권한은 다시 거둠): `supabase/step4-notes-rls.sql`을 학습 DB에 적용했습니다. `public.notes`에서 `PUBLIC`·`anon`·`authenticated` 권한을 모두 회수한 뒤 `authenticated`에만 SELECT·INSERT·UPDATE·DELETE를 주고, 네 동작 모두 `auth.uid() = owner_id`인 행만 허용하는 RLS 정책을 걸었습니다. 앱 API는 `service_role`로 DB를 부르므로 RLS를 건너뛰고, 앱의 A/B 구분은 위 API 검사가 맡습니다.
  - 적용 후 확인(2026-10-06, `has_table_privilege`): `anon` 7개 권한 모두 false, `authenticated`는 SELECT·INSERT·UPDATE·DELETE만 true(TRUNCATE·REFERENCES·TRIGGER false), 정책 4개.
  - DB 안에서 B 역할을 흉내 낸 시험(되돌림): B는 자기 행 1개만 보임, A 행 수정 0건, A 소유로 추가·소유자를 A로 바꾸는 수정은 RLS 위반으로 거부, 자기 행 추가·수정은 허용. `anon` 조회는 `permission denied`.
- 시험 자료(4단계 만들기 1): 기존 가상 메모 4건은 A, 공개 가능한 시험 메모 1건(`b0000000-0000-4000-8000-000000000001`)은 B 소유입니다(`supabase/step4-owner-seed.sql`).
- 파일: `api/notes/index.js`(목록·추가), `api/notes/[id].js`(한 건 읽기·수정·삭제), `src/notes-api.mjs`(두 함수가 함께 쓰는 로그인 검사 호출·DB 요청), `supabase/step3-notes-crud.sql`(메모에 UUID `id`를 두고 `service_role`에만 쓰기 권한, 메모 문장 없음, 학습용 DB에 적용함). 옛 bigint `id`는 지우지 않고 `legacy_id`로 이름만 바꿔 내부 기본 키로 남겼으며 API에는 나오지 않습니다.
- 다시 실행하는 방법: GitHub `main`에 푸시하면 Vercel이 자동 배포합니다. 로컬 확인은 `npm run build -- --local`, 테스트는 `npm run test:r5`, 제출 묶음은 `npm run bundle`(커밋 후, `bundle-notes.json` 필요)입니다.
- 필요한 Vercel 환경변수: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`(서버 전용, Vercel 설정 화면에만 입력). 3·4단계에서 새로 넣을 값은 없습니다.
- 시험용 계정: Supabase → Authentication → Users에서 가상 이메일로 만들고 **Auto Confirm User**를 켭니다. 비밀번호는 코드·README·Git에 적지 않습니다.

### 3단계 당시 남은 약점 (4단계에서 막음)

- **소유자 검사가 없었습니다.** 목록은 내 메모만 보여 주지만, `GET·PUT·DELETE /api/notes/:id`는 로그인만 확인하고 `owner_id`를 비교하지 않습니다. 따라서 로그인한 B가 A의 메모 `id`를 알면 읽고·고치고·지울 수 있습니다. 4단계에서 API와 DB 양쪽에 소유자 검사를 붙였습니다.

### 4단계 자기 점검 기록

- `src/attack-check.mjs`(학생 자기 점검, 심판 판정 아님): 무로그인·가짜 토큰으로 자료 API 5개 경로, anon 키로 Data API 직접 GET·POST를 실제로 보내 결과를 적습니다. A·B 토큰이 필요한 점검(자기 메모 CRUD, B→A 접근, 소유자 변경)은 비밀번호·토큰을 코드에 넣지 않으므로 **미실행**으로 남기고 화면에서 직접 확인합니다.
- 로컬에서 가짜 DB와 가짜 A·B 토큰으로 시험한 결과: B→A·A→B 메모 GET·PUT·DELETE 모두 404(DB 그대로), 본문 `owner_id`·`userId` 위조 403, 자기 메모 CRUD 정상, 무로그인 401. 실제 배포에서의 결과는 학생이 확인합니다.

## 보너스 xdr-01: 무차별 로그인 공격을 잡아 냅니다

- 실행: `npm run xdr:run -- brute-force` → `xdr/brute-force/result.json`. 이어서 `node xdr/brute-force/block-rules.mjs` → 거부 규칙 `xdr/brute-force/deny-rules.json`, 알림 `xdr/alerts.log`. 경보 원본 `xdr/fixtures/brute-force.json`은 고치지 않습니다.
- `read-alerts.mjs`: 경보에서 시각·출발 주소·계정·규칙 수준·설명만 뽑고, 비밀값처럼 보이는 표기는 `[가림]`으로 바꿉니다. 경보 28건 → 28줄.
- `patterns.json`: MITRE ATT&CK T1110 근거 패턴 2개. `same-source-rapid-failures`(T1110.001, 같은 주소 실패 20건 이상·5분 이내·뒤에 성공 없음), `password-spraying`(T1110.003, 같은 비밀번호를 계정 5개 이상에).
- `decide.mjs`: 패턴이 맞으면 확신도 0.86~0.98 → `block`. 패턴은 안 맞지만 T1110 의심(규칙에 T1110 또는 실패 2건 이상)이면 Jev에게 확신도를 묻고, 0.85 이상 block·0.5 이상 alert·그 아래 record. **Jev 주소는 환경변수 `JEV_URL`로만 받으며, 없거나 응답이 없으면 `alert`(0.6)** 입니다. 패턴 근거가 없으면 Jev가 높게 답해도 막지 않고 alert로 낮춥니다. 판정자의 격리 환경에도 네트워크가 없으니 애매한 건은 alert가 됩니다.
- `block-rules.mjs`: `block`만 출발 주소 단위 거부 규칙으로 만듭니다(만료 = 마지막 근거 경보 + 60분, 근거 경보 번호 포함). 계정 이름으로는 막지 않고, 정상 이벤트에 나온 주소는 넣지 않습니다. `src/decider.mjs`의 기존 규칙은 고치지 않았습니다. 판정 요청 계약에 출발 주소가 없어서, 지금은 `deny-rules.json`과 `isDenied()`로만 확인합니다.
- 실행 결과(2026-10-07, 이 저장소에서 실제 실행): `counts` = block 10 · alert 9 · record 9. 정상 이벤트(규칙 수준 3 이하, T1110 없음) 9건 중 block 0건. 거부 규칙 9개(주소 9곳). 시험 경보를 다시 흘리면 막힘 10건(모두 block 판정), 통과 18건, 잘못 막힘 0건.
- 이 결과는 학생 로컬 실행 결과이며 심판 판정이 아닙니다.
- 수정(심판 `X01_CLEAR_NOT_BLOCKED`, 커밋 `c25583f`): 판정자처럼 실행기·경보·`decide.mjs`만 따로 두고 돌리면 `decide.mjs`가 `read-alerts.mjs`·`patterns.json`을 찾지 못해 실행이 멈췄습니다. `decide.mjs`가 다른 파일을 import하거나 읽지 않도록 패턴 값(`patterns.json`과 같은 값)과 항목 추출을 파일 안에 넣었습니다. 격리 실행 결과도 block 10 · alert 9 · record 9입니다.

## 보너스 xdr-06: 자료 빼돌리기를 잡아 냅니다

- 실행: `npm run xdr:run -- exfiltration` → `xdr/exfiltration/result.json`. 이어서 `node xdr/exfiltration/respond.mjs` → 거부 규칙 `xdr/exfiltration/deny-rules.json`, 알림은 `xdr/alerts.log`에 이어 쌓음. 경보 원본 `xdr/fixtures/exfiltration.json`은 고치지 않습니다.
- `read-alerts.mjs`(확인용, decide.mjs가 불러오지 않음): 시각·출발 주소·계정·규칙 수준·설명만 뽑고 비밀값처럼 보이는 값은 가립니다. 목적지·전송량은 출력하지 않습니다. `node xdr/exfiltration/read-alerts.mjs` → 경보 30건·뽑은 줄 30줄 일치.
- `patterns.json`: 근거가 있는 패턴 셋만 두고, 모두 50MB 이상 전송일 때만 맞습니다. 패턴마다 근거를 한 줄씩 적었습니다.
  - `large-transfer-unfamiliar-destination`(T1048): 처음 보는·외부 목적지, 평소 쓰지 않던 포트, 5번 이상 반복, 파일 50개 이상
  - `off-hours-archive-exfil`(T1048): 업무 시간 밖이나 처음 보는 주소로 나간 압축 파일
  - `c2-channel-exfil`(T1041): 명령 통로로 나간 큰 파일
- `decide.mjs`: 같은 값을 파일 맨 위 상수로 두고, import·파일 읽기/쓰기·바깥 요청 없이 계산합니다.
  - 패턴이 맞으면 0.88부터 시작해 block(0.85 이상)입니다. 여러 패턴·200MB 이상·파일 100개 이상 또는 반복·규칙 수준 12 이상이면 더합니다.
  - 유출 관련 T1041·T1048 경보이지만 패턴이 없으면 alert(0.6)입니다.
  - 수업 자료 주소로 끝난 작은 동기화나 근거가 없으면 record입니다. MITRE 태그만으로는 막지 않습니다.
- `respond.mjs`: block 결과만 출발 주소 단위 거부 규칙(만료 60분, 근거 경보 번호)으로 넣고, 계정으로는 막지 않습니다. 판정기(`src/decider.mjs`)의 기존 규칙은 고치지 않았습니다.
- 결과(로컬, 2026-10-13): block 10 · alert 10 · record 10, 정상 이벤트 block 0건, 거부 규칙 9개.
  - 다시 흘리기에서 명확한 공격 10건만 막히고 정상 요청 10건은 모두 통과했습니다.
  - 아무것도 없는 격리 환경에서 decide.mjs 한 파일만 불러와도 같은 건수입니다. 심판의 격리 실행 결과는 제출 뒤 확인합니다.

## 보너스 xdr-05: 권한 가로채기를 잡아 냅니다

- 실행: `npm run xdr:run -- privilege` → `xdr/privilege/result.json`. 이어서 `node xdr/privilege/respond.mjs` → 거부 규칙 `xdr/privilege/deny-rules.json`, 알림은 `xdr/alerts.log`에 이어 쌓음. 경보 원본 `xdr/fixtures/privilege.json`은 고치지 않습니다.
- `read-alerts.mjs`(확인용, decide.mjs가 불러오지 않음): 시각·출발 주소·계정·규칙 수준·설명만 뽑고 비밀값처럼 보이는 값은 가립니다. `node xdr/privilege/read-alerts.mjs` → 경보 26건·뽑은 줄 26줄 일치.
- `patterns.json`: 근거가 있는 패턴 셋만 두고, 패턴마다 근거를 한 줄씩 적었습니다.
  - `admin-group-add`(T1078·T1098.007): 관리자 그룹(administrators 등) 추가·재추가
  - `unfamiliar-admin-command`(T1068): 처음 보는 주소·다른 계정 권한·방금 관리자가 된 계정의 관리자 명령
  - `off-hours-privilege-use`(T1078): 수업·업무 시간 밖 관리자 권한 사용
- `decide.mjs`: 같은 패턴을 파일 맨 위 상수로 두고, import·파일 읽기/쓰기·바깥 요청 없이 계산합니다.
  - 패턴이 맞으면 0.88부터 시작해 block(0.85 이상)입니다. 여러 패턴·반복(여러 계정, 재추가)·규칙 수준 12 이상이면 더합니다.
  - 권한 관련 T1068·T1078 경보이지만 패턴이 없으면 alert(0.6), 근거가 없으면 record(0.05)입니다.
- `respond.mjs`: block 결과만 출발 주소 단위 거부 규칙(만료 60분, 근거 경보 번호)으로 넣고, 계정으로는 막지 않습니다. 판정기(`src/decider.mjs`)의 기존 규칙은 고치지 않았습니다.
- 결과(로컬, 2026-10-13): block 9 · alert 8 · record 9, 정상 이벤트 block 0건, 거부 규칙 8개.
  - 다시 흘리기에서 명확한 공격 9건만 막히고 정상 요청 9건은 모두 통과했습니다.
  - 아무것도 없는 격리 환경에서 decide.mjs 한 파일만 불러와도 같은 건수입니다. 심판의 격리 실행 결과는 제출 뒤 확인합니다.

## 보너스 xdr-04: 몰래 심어진 프로그램을 찾아냅니다

- 실행: `npm run xdr:run -- persistence` → `xdr/persistence/result.json`. 이어서 `node xdr/persistence/respond.mjs` → 거부 규칙 `xdr/persistence/deny-rules.json`, 알림은 `xdr/alerts.log`에 이어 쌓음. 경보 원본 `xdr/fixtures/persistence.json`은 고치지 않습니다.
- `read-alerts.mjs`(확인용, decide.mjs가 불러오지 않음): 시각·출발 주소·계정·규칙 수준·설명만 뽑고 비밀값처럼 보이는 값은 가림. 실행 파일 경로는 출력하지 않습니다. `node xdr/persistence/read-alerts.mjs` → 경보 24건·뽑은 줄 24줄 일치.
- `patterns.json`: 근거가 있는 패턴 셋만 둡니다. 패턴마다 근거를 한 줄씩 적었습니다.
  - `unsigned-new-service`(T1543): 서명 없거나 평소 목록에 없는 서비스
  - `unfamiliar-scheduled-task`(T1053): 처음 보는·임의 이름의 예약 작업이 임시 폴더 실행 파일을 실행
  - `startup-folder-change`(T1547.001): 시작 폴더·시작 프로그램에 평소 목록에 없는 프로그램이나 임시 폴더 실행 파일. 시작 폴더는 MITRE에서 T1547.001이라 근거를 정확히 적었습니다.
- `decide.mjs`: 같은 패턴을 파일 맨 위 상수로 두고, import·파일 읽기/쓰기·바깥 요청 없이 계산합니다.
  - 핵심 표기와 뒷받침 신호가 함께 있으면 0.88부터 시작해 block(0.85 이상)입니다. 임시 폴더 실행 파일·여러 패턴·연속 등록·규칙 수준 12 이상이면 더합니다.
  - 머무름 관련 표기만 있는 T1543·T1053 경보는 alert(0.6~0.65)입니다.
  - 「평소 시각에 그대로」·「서명된 채로」·「기존 예약 작업이」·「읽기만」 같은 정상 동작이나 근거가 없으면 record입니다. MITRE 태그만으로는 막지 않습니다.
- `respond.mjs`: block 결과만 출발 주소 단위 거부 규칙(만료 60분, 근거 경보 번호)으로 넣습니다. 계정으로는 막지 않으므로, 같은 계정이 정상 주소에서 쓰여도 막히지 않습니다. 판정기(`src/decider.mjs`)의 기존 규칙은 고치지 않았습니다.
- 결과(로컬, 2026-10-13): block 8 · alert 8 · record 8, 정상 이벤트 block 0건, 거부 규칙 7개.
  - 다시 흘리기에서 명확한 공격 8건만 막히고 정상 요청 8건은 모두 통과했습니다.
  - 아무것도 없는 격리 환경에서 decide.mjs 한 파일만 불러와도 같은 건수입니다. 심판의 격리 실행 결과는 제출 뒤 확인합니다.

## 보너스 xdr-03: 알려진 취약점 악용을 잡아 냅니다

- 실행: `npm run xdr:run -- known-cve` → `xdr/known-cve/result.json`. 이어서 `node xdr/known-cve/respond.mjs` → 거부 규칙 `xdr/known-cve/deny-rules.json`, 알림은 `xdr/alerts.log`에 이어 쌓음. 경보 원본 `xdr/fixtures/known-cve.json`은 고치지 않습니다.
- `read-alerts.mjs`(확인용, decide.mjs가 불러오지 않음): 시각·출발 주소·계정·규칙 수준·설명만 뽑고 비밀값처럼 보이는 값은 가림. `node xdr/known-cve/read-alerts.mjs` → 경보 24건·뽑은 줄 24줄 일치.
- `patterns.json`: 근거가 있는 패턴 셋만 둡니다. `log4shell-lookup-header`(요청 머리글의 `${jndi:<프로토콜>:` 원격 조회 구문), `log4shell-lookup-param`(주소 인자의 같은 구문), `known-scanner-trace`(점검 도구 흔적, 조회 구문과 함께일 때만). 근거는 CVE-2021-44228(NVD)·MITRE ATT&CK T1190·CISA AA21-356A이고, 패턴마다 한 줄씩 적었습니다.
- `decide.mjs`: 같은 패턴을 파일 맨 위 상수로 두고, import·파일 읽기/쓰기·바깥 요청 없이 계산합니다. 완전한 조회 구문이 있으면 0.88부터 시작해 머리글·인자 둘 다·점검 흔적·5번 이상 반복·규칙 수준 12 이상이면 더해 block(0.85 이상). CVE 이름·jndi 낱말·잘린 형태처럼 완전한 구문이 없는 T1190 의심은 alert(0.6~0.65), 근거가 없으면 record(0.05). reason에는 패턴 이름만 적고 조회 구문 원문은 옮기지 않습니다.
- `respond.mjs`: block 결과만 출발 주소 단위 거부 규칙(만료 60분, 근거 경보 번호)으로 넣고, record로 판단된 주소는 넣지 않습니다. 판정기(`src/decider.mjs`)의 기존 규칙은 고치지 않았습니다. 판정 요청 계약에 출발 주소가 없어 xdr-01·02와 같이 `deny-rules.json`과 `isDenied()`로 확인합니다.
- 결과(로컬, 2026-10-13): block 8 · alert 8 · record 8, 정상 이벤트 block 0건. 다시 흘리기에서 명확한 공격 8건만 막히고 정상 요청 8건은 모두 통과, 거부 규칙 7개. 아무것도 없는 격리 환경에서 decide.mjs 한 파일만 불러와도 같은 건수입니다. 심판의 격리 실행 결과는 제출 뒤 확인합니다.

## 보너스 xdr-02: 웹 주입 공격을 잡아 냅니다

- 실행: `npm run xdr:run -- web-injection` → `xdr/web-injection/result.json`. 이어서 `node xdr/web-injection/block-rules.mjs` → `xdr/web-injection/deny-rules.json`, 알림은 `xdr/alerts.log`에 이어 쌓음. 경보 원본은 고치지 않습니다.
- `read-alerts.mjs`: 시각·출발 주소·계정·규칙 수준·설명만 뽑고 비밀값 표기는 `[가림]`. 경보 26건 → 26줄.
- `patterns.json`: MITRE ATT&CK T1190 근거 패턴 4개(SQL 주입 CWE-89, 스크립트 주입 CWE-79, 경로 거슬러 올라가기 CWE-22, 명령 구분자 CWE-78). 모두 **같은 주소에서 5번 이상 반복**될 때만 맞춥니다. 한 번 나온 `select`·`SQL`·`스크립트` 같은 단어는 정상 검색어와 구별되지 않기 때문입니다. 명령 구분자 패턴은 카드의 세 신호 밖이지만 명확한 공격 wi-06이 이 형태라 T1190 근거로 넣었습니다.
- `decide.mjs`: xdr-01과 같은 기준(패턴 일치 block, T1190 의심만 Jev, `JEV_URL` 없거나 응답 없으면 alert, 패턴 근거 없이 block 안 함). **다른 파일을 import하거나 읽지 않습니다**(xdr-01에서 판정자 격리 실행 때 멈췄던 문제를 처음부터 피함).
- `block-rules.mjs`: block만 출발 주소 거부 규칙(만료 = 마지막 근거 경보 + 60분, 근거 경보 번호 포함), 계정으로는 막지 않고 정상 이벤트 주소는 넣지 않음. `src/decider.mjs`는 그대로입니다.
- 실행 결과(2026-10-07, 이 저장소에서 실제 실행): `counts` = block 8 · alert 9 · record 9. 정상 이벤트(T1190 없음) 9건 중 block 0건. `decide.mjs`만 따로 둔 격리 실행도 같은 결과. 거부 규칙 7개, 다시 흘리기 막힘 8건·통과 18건·잘못 막힘 0건. 학생 로컬 실행 결과이며 심판 판정이 아닙니다.

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

### 검색 결과 기록 (2026-10-13, 9단계 작업 중 갱신)

| 확인 대상 | 결과 | 비고 |
|---|---|---|
| 현재 작업 파일 | 0건 | `data.json`, `public/data.json` 삭제(이후 수정에서 404로 변경) |
| 로컬 빌드 결과물 `public/` | 0건 | `npm run build -- --local` 실행 결과 |
| GitHub 최신 `origin/main` | 0건 | 9단계 작업 중 다시 실행(`origin/main` = `b9d601a`). 2단계 작업 중에는 푸시 전이라 8건이었음 |
| 현재 배포 `/data.json` | 미실행 | 코딩 도구 환경에서는 vercel.app 접속이 막혀 실행하지 못함. 학생이 4번을 직접 실행합니다 |
| 자료 API `/api/notes` | 미실행 | 3단계 배포 뒤 5번을 실행합니다. 401이 아니라 메모가 나오면 로그인 검사가 배포되지 않은 것입니다 |

### 과거 노출은 해소되지 않았습니다

- **옛 공개 커밋**: `git log -G '실습용 가[상]' --oneline` 결과 `d6fb92d Initial commit`에 메모 네 건이 그대로 들어 있습니다. 공개 저장소이므로 이 커밋 주소로 누구나 볼 수 있고, 이미 복제(clone·fork)한 사본도 회수할 수 없습니다.
- **옛 배포**: Vercel은 이전 배포를 고유 주소로 보관합니다. 1단계 배포의 `/data.json`은 메모가 공개된 채로 남아 있을 수 있습니다.
- 따라서 최신 파일에서 메모를 지운 것은 **앞으로의 노출을 줄인 것**이지, 이미 일어난 노출을 없앤 것이 아닙니다. 실제 자료였다면 내용을 바꾸거나(키라면 즉시 교체) 이력 정리와 옛 배포 삭제를 따로 해야 합니다.

## 다음 단계의 코딩 도구에 전달할 규칙

[AGENTS.md](AGENTS.md)를 먼저 읽히고 한 번에 한 제작 단위만 요청하세요. 2단계부터는 자료 보호를 구현할 때 `public/data.json`을 복사하는 1단계 빌드 흐름도 함께 바꿔야 합니다. 3단계 이후의 로그인, 허용 경로, 5단계의 원본 API 주소, 6단계 이후 정책 규칙은 해당 단계 원고와 계약에 맞춰 추가합니다. 비밀번호·토큰·서버 전용 키·실제 학생 기록을 코드, Git, 제출 묶음에 넣지 않습니다.

`src/decider.mjs`와 `src/detect.mjs`의 로컬 시험은 반 엔진이나 운영 심판의 결과가 아닙니다. 1단계 이후 제출 묶음 계약 `aleph.defense.submission.v2`는 `scripts/bundle.mjs`에 남아 있으며, 코딩 도구가 해당 단계의 최신 배포 주소와 Git 원격을 맞춘 뒤 사용합니다.
