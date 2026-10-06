-- 4단계 만들기 3: 메모 테이블(public.notes)만 RLS와 최소 권한으로 바꿉니다. 다른 테이블은 건드리지 않습니다.
-- 메모 문장은 들어 있지 않습니다. 학생이 검토한 뒤 Supabase SQL Editor에서 실행합니다.
-- 2026-10-06 학습용 Supabase에 [2]를 적용했습니다(당시 정책 0개라 drop policy 줄은 생략). [3] 결과가 기대값과 같았습니다.
-- 앱 API는 service_role(서버 전용 키)로 DB를 부르며 RLS를 건너뜁니다. 앱의 A/B 구분은 API 소유자 검사가 맡고,
-- 이 SQL은 브라우저에서 Data API(/rest/v1/notes)를 직접 부르는 경우를 막는 두 번째 방어선입니다.

-- [1] 적용 전 권한 확인 (읽기만)
select grantee, string_agg(privilege_type, ',' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'notes' and grantee in ('PUBLIC', 'anon', 'authenticated')
group by grantee;

select r.role, p.priv, has_table_privilege(r.role, 'public.notes', p.priv) as allowed
from (values ('anon'), ('authenticated')) r(role)
cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) p(priv)
order by r.role, p.priv;

-- [2] 권한 회수 → 최소 권한 부여 → 본인 행만 허용하는 정책
begin;

revoke all on table public.notes from public, anon, authenticated;
grant select, insert, update, delete on table public.notes to authenticated;

alter table public.notes enable row level security;

-- 다시 실행해도 같은 결과가 나오도록 같은 이름의 정책만 먼저 지웁니다(다른 정책은 그대로).
drop policy if exists notes_select_own on public.notes;
drop policy if exists notes_insert_own on public.notes;
drop policy if exists notes_update_own on public.notes;
drop policy if exists notes_delete_own on public.notes;

-- SELECT: 기존 행이 본인 것일 때만
create policy notes_select_own on public.notes
  for select to authenticated
  using ((select auth.uid()) = owner_id);

-- INSERT: 새 행의 소유자가 본인일 때만
create policy notes_insert_own on public.notes
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

-- UPDATE: 기존 행도 본인 것이고, 바뀐 새 행의 소유자도 본인일 때만
create policy notes_update_own on public.notes
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- DELETE: 기존 행이 본인 것일 때만
create policy notes_delete_own on public.notes
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

commit;

-- [3] 적용 후 권한·정책 확인 (읽기만)
-- 기대: anon 줄 없음, authenticated = DELETE,INSERT,SELECT,UPDATE
select grantee, string_agg(privilege_type, ',' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'notes' and grantee in ('PUBLIC', 'anon', 'authenticated')
group by grantee;

-- 기대: anon은 모두 false, authenticated는 SELECT·INSERT·UPDATE·DELETE만 true
select r.role, p.priv, has_table_privilege(r.role, 'public.notes', p.priv) as allowed
from (values ('anon'), ('authenticated')) r(role)
cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) p(priv)
order by r.role, p.priv;

-- 기대: 정책 4개, 모두 authenticated 대상, 조건은 auth.uid() = owner_id
select polname, polcmd, polroles::regrole[] as roles,
       pg_get_expr(polqual, polrelid) as using_expr,
       pg_get_expr(polwithcheck, polrelid) as with_check_expr
from pg_policy where polrelid = 'public.notes'::regclass order by polname;
