-- 12단계 만들기 1: 탈환 작전실이 읽는 서버 기록(public.ops_events).
-- 자료·세션 API(src/ops-events.mjs)가 응답마다 한 줄씩 추가합니다. 수정·삭제 권한은 서버에도 주지 않습니다(추가 전용).
-- 메모 제목·본문·토큰·비밀번호·이메일·기기 번호·쿼리 원문은 저장하지 않습니다.
-- PUBLIC·anon·authenticated 직접 권한은 없고, 서버(service_role)만 읽고 추가합니다. 기존 테이블은 바꾸지 않습니다.
begin;

create table if not exists public.ops_events (
  event_id bigint generated always as identity primary key,
  request_id uuid not null unique,
  at timestamptz not null default now(),
  owner_id uuid,
  service text not null check (service ~ '^[a-z]{1,20}$'),
  method text not null check (method ~ '^[A-Z]{3,7}$'),
  route text not null check (char_length(route) between 1 and 60),
  status integer not null check (status between 100 and 599),
  outcome text not null check (outcome in ('allowed', 'denied', 'error')),
  reason text not null default '' check (reason ~ '^[A-Z0-9_]{0,40}$')
);
create index if not exists ops_events_owner_at on public.ops_events (owner_id, at desc);

alter table public.ops_events enable row level security;
revoke all on table public.ops_events from public, anon, authenticated;
grant select, insert on table public.ops_events to service_role;
revoke truncate, references, trigger, update, delete on table public.ops_events from service_role;

-- 12단계 수정: 제출 묶음·점검 요청이 X-Aleph-Attack-Id 헤더로 보낸 점검 이름(attackId)을 함께 남깁니다(비밀값 아님).
alter table public.ops_events add column if not exists attack_id text
  check (attack_id is null or attack_id ~ '^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$');
-- 진단용: 요청에 Authorization 헤더가 있었는지만(값은 저장하지 않음)
alter table public.ops_events add column if not exists auth_present boolean;
create index if not exists ops_events_anon_at on public.ops_events (at desc) where owner_id is null;

commit;

-- [2] 화면 수치와 대조(학생이 SQL Editor에서 직접): 작전실 화면의 '요청 ID'로 그 요청 한 줄을 찾습니다.
-- select request_id, at, method, route, status, outcome, reason from public.ops_events where request_id = '<화면의 요청 ID>';
-- 최근 24시간 결과별 건수(사용자 ID는 화면·로그에 쓰지 않고 SQL Editor 안에서만 씁니다):
-- select outcome, count(*) from public.ops_events
--   where owner_id = (select id from auth.users where email = '<가상 이메일>') and at > now() - interval '24 hours' group by outcome;
