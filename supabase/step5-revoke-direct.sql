-- 5단계 만들기 2: 메모 테이블(public.notes)의 직접 권한을 PUBLIC·anon·authenticated에서 모두 거둡니다.
-- 메모 자료는 이제 앱 서버 함수(/api/notes, /api/notes/:id)로만 읽고 고칩니다.
-- 서버 함수는 service_role(서버 전용 키)을 쓰므로 이 SQL 뒤에도 그대로 동작합니다. service_role 권한과 다른 테이블은 건드리지 않습니다.
-- 4단계 RLS 정책(auth.uid() = owner_id)은 그대로 둡니다. 권한이 없으니 직접 요청에는 쓰이지 않지만, 권한이 실수로 다시 열려도 본인 행만 허용하는 안전장치로 남습니다.
-- 메모 문장은 들어 있지 않습니다.

-- [1] 적용 전 확인 (읽기만)
-- 기대(4단계 상태): anon 줄 없음, authenticated = DELETE,INSERT,SELECT,UPDATE
select grantee, string_agg(privilege_type, ',' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'notes' and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
group by grantee order by grantee;

select r.role, p.priv, has_table_privilege(r.role, 'public.notes', p.priv) as allowed
from (values ('anon'), ('authenticated'), ('service_role')) r(role)
cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) p(priv)
order by r.role, p.priv;

-- [2] 직접 권한 회수
begin;
revoke all on table public.notes from public, anon, authenticated;
commit;

-- [3] 적용 후 확인 (읽기만)
-- 기대: PUBLIC·anon·authenticated 줄 없음, service_role만 남음
select grantee, string_agg(privilege_type, ',' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'notes' and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
group by grantee order by grantee;

-- 기대: anon·authenticated는 모두 false, service_role은 모두 true
select r.role, p.priv, has_table_privilege(r.role, 'public.notes', p.priv) as allowed
from (values ('anon'), ('authenticated'), ('service_role')) r(role)
cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) p(priv)
order by r.role, p.priv;

-- 원본 직접 요청 확인(학생 컴퓨터에서, publishable key는 공개용 값):
--   curl -i 'https://uibjvuqvkcgumanohtoi.supabase.co/rest/v1/notes?select=id' -H 'apikey: <publishable key>'
--   기대: 401 또는 403, 메모 없음
