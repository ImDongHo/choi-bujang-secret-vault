-- 11단계 만들기 2: 기기 승인 요청·결과(public.device_registrations).
-- 기기 번호 원문은 저장하지 않고 SHA-256 해시만 둡니다. 원문은 서버가 HttpOnly 쿠키로만 브라우저에 줍니다.
-- 화면의 '승인 요청' 버튼은 pending만 만듭니다. approved로 바꾸는 것은 학생(관리자)이 이 파일 [2]처럼 직접 합니다.
-- PUBLIC·anon·authenticated 직접 권한은 없고, 서버(service_role)만 읽고 요청을 추가합니다(승인 칼럼은 서버도 못 바꿈).
begin;

create table if not exists public.device_registrations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  device_hash text not null unique check (device_hash ~ '^[0-9a-f]{64}$'),
  label text not null default '' check (char_length(label) <= 60),
  status text not null default 'pending' check (status in ('pending', 'approved', 'revoked')),
  requested_at timestamptz not null default now(),
  approved_at timestamptz
);

alter table public.device_registrations enable row level security;
revoke all on table public.device_registrations from public, anon, authenticated;
grant select, insert on table public.device_registrations to service_role;

commit;

-- [2] 승인(학생이 SQL Editor에서 직접, 대기 중인 요청을 확인한 뒤):
-- select id, label, status, requested_at from public.device_registrations
--   where owner_id = (select id from auth.users where email = '<가상 이메일>') order by requested_at desc;
-- update public.device_registrations set status = 'approved', approved_at = now() where id = '<위에서 고른 id>' and status = 'pending';
-- 회수: update public.device_registrations set status = 'revoked' where id = '<id>';
