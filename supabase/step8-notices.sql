-- 8단계 만들기 1: 메모(public.notes)와 다른 자원인 강사 공지(public.notices)와 강사 권한 목록(public.instructors)을 만듭니다.
-- 기존 메모 테이블과 주소는 건드리지 않습니다. 메모 문장·실명·이메일은 들어 있지 않습니다.
-- 5단계와 같이 PUBLIC·anon·authenticated에는 직접 권한을 주지 않고 서버 함수(service_role)만 접근합니다.
-- 강사 지정은 학생이 SQL Editor에서 직접 합니다(아래 [3] 참고). 화면 메뉴나 요청 본문의 role은 쓰지 않습니다.
begin;

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  content text not null default '' check (char_length(content) <= 5000),
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.instructors (
  user_id uuid primary key,
  added_at timestamptz not null default now()
);

alter table public.notices enable row level security;
alter table public.instructors enable row level security;

revoke all on table public.notices from public, anon, authenticated;
revoke all on table public.instructors from public, anon, authenticated;
grant select, update on table public.notices to service_role;
grant select on table public.instructors to service_role;

-- 공개 가능한 시험 공지 1건(고정 id라 다시 실행해도 1건)
insert into public.notices (id, title, content)
values ('c0000000-0000-4000-8000-000000000001', '반 공지: 3주차 실습 안내', '공개 가능한 시험 공지입니다. 강사만 수정할 수 있습니다.')
on conflict (id) do nothing;

commit;

-- [2] 확인 (읽기만): anon·authenticated는 두 테이블 모두 false, service_role은 notices SELECT·UPDATE, instructors SELECT만 true
select r.role, t.tbl, p.priv, has_table_privilege(r.role, t.tbl, p.priv) as allowed
from (values ('anon'), ('authenticated'), ('service_role')) r(role)
cross join (values ('public.notices'), ('public.instructors')) t(tbl)
cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) p(priv)
order by t.tbl, r.role, p.priv;

-- [3] 강사 지정 예시(필요할 때 학생이 직접, 이메일은 실제 가상 계정 주소로 바꿈):
-- insert into public.instructors (user_id) select id from auth.users where email = '<강사 가상 이메일>' on conflict do nothing;
