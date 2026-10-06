-- 4단계 만들기 1: 기존 가상 메모는 A, 공개 가능한 시험 메모 1건은 B 소유로 준비합니다.
-- 2026-10-06 학습용 Supabase(choi-bujang-vault)에 실제 적용했습니다. 결과: A 4건, B 1건, 전체 5건.
-- A·B는 Auto Confirm으로 만든 가상 계정입니다. 실행할 때 <A 가상 이메일>, <B 가상 이메일>을 실제 계정 주소로 바꿉니다. 비밀번호는 여기에 없습니다.
do $$
declare
  a_id uuid;
  b_id uuid;
begin
  select id into a_id from auth.users where email = '<A 가상 이메일>';
  select id into b_id from auth.users where email = '<B 가상 이메일>';
  if a_id is null or b_id is null then
    raise exception 'A 또는 B 계정을 auth.users에서 찾을 수 없습니다. 이메일을 확인하세요.';
  end if;

  -- 처음 만든 가상 메모 4건만 A에 연결합니다(이미 A 소유면 바뀌지 않음).
  update public.notes set owner_id = a_id
  where legacy_id between 1 and 4 and owner_id is distinct from a_id;

  -- B 소유의 공개 가능한 시험 메모 1건(고정 id라 다시 실행해도 1건).
  insert into public.notes (id, owner_id, title, content)
  values ('b0000000-0000-4000-8000-000000000001', b_id,
          'B의 시험 메모', 'B 계정 소유 확인용 공개 가능 메모입니다.')
  on conflict (id) do update set owner_id = excluded.owner_id;
end $$;

-- 확인: 소유자별 메모 수
select
  count(*) filter (where n.owner_id = (select id from auth.users where email = '<A 가상 이메일>')) as a_notes,
  count(*) filter (where n.owner_id = (select id from auth.users where email = '<B 가상 이메일>')) as b_notes,
  count(*) filter (where n.owner_id not in (select id from auth.users)) as unknown_owner,
  count(*) as total
from public.notes n;
