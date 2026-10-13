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

## 현재 상태: 11단계 저장점

- 11단계(나만의 접속 앱을 완성합니다). 따로 접속 프로그램을 만들거나 설치하지 않았고, 지금 배포 중인 자료실에 설치형 웹앱 설정과 기기 승인을 붙였습니다.
- 설치형 웹앱(만들기 1): `public/manifest.webmanifest`(앱 이름 「최부장의 비밀창고」, 짧은 이름 「비밀창고」), `public/icon.svg`, 오프라인 안내 `public/offline.html`, 서비스 워커 `public/sw.js`(안내 페이지·아이콘만 저장, 메모·공지와 `/api` 응답은 저장하지 않음). 화면에 "설치나 승인 요청 버튼만으로는 기기 확인이 끝나지 않는다"고 적었습니다.
- 기기 승인(만들기 2): 서비스 `notes`, 경로 `GET /api/device/status`, `POST /api/device/request`(`api/device/[action].js`, `allowedRoutes`에 추가).
  - 승인 요청은 서버가 무작위 기기 번호를 만들어 **HttpOnly·Secure·SameSite=Strict 쿠키**(`bb_device`, Path=/api)로만 주고, 학습 DB `public.device_registrations`에는 '사용자 ID+기기 번호'의 SHA-256만 `pending`으로 저장합니다. 기기 번호는 화면 스크립트·localStorage·sessionStorage·IndexedDB·응답 본문·로그에 넣지 않습니다.
  - 버튼은 `pending`만 만듭니다. 서버는 이 테이블에 UPDATE 권한이 없으며, `approved`로 바꾸는 것은 학생(관리자)이 Supabase SQL Editor에서 직접 합니다(`supabase/step11-device-registrations.sql` [2], 회수도 같은 곳).
  - 메모·공지·복원 API(`/api/notes`, `/api/notes/:id`, `/api/notices`, `/api/notices/:id`, `/api/restore/:id`)는 학생 토큰이면 서버가 이 기기를 승인된 등록 기기로 확인한 뒤에만 자료를 주고, 아니면 403 `DEVICE_NOT_APPROVED`(`deviceStatus`: none·pending·revoked). 화면도 승인 전에는 자료 API를 부르지 않고 자료를 표시하지 않습니다. 심판 토큰은 반 엔진이 기기를 확인해 넘기므로(`deviceRegistered`) 기존 결과를 유지합니다.
  - 배포 뒤에는 A·B 모두 각 브라우저에서 한 번 '이 기기 승인 요청' → Supabase에서 승인해야 기존 자료실이 열립니다.
- 확인(로컬, 가짜 DB·가짜 토큰·Playwright, 2026-10-13): 쿠키 없음·승인 대기·회수·위조 쿠키·B가 A의 승인 쿠키 사용 → 403, 버튼을 다시 눌러도 pending 그대로, Supabase 승인 뒤 자기 메모 200, 무로그인 401, 없는 동작 404. 화면: 승인 전 자료 요청 없음·자료 표시 없음, 승인 뒤 기존 목록·추가 정상, 저장소에 기기 번호 없음. `decider:test`·`fixture:7`·`detect:test`·`policy:diff`·`test:r5`·`test:package`·xdr 시험 통과.
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
