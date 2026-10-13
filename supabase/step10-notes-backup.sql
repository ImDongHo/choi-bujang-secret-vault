-- 10단계 만들기 3: 비공개 가상 메모 사본(public.notes_backup)과 복원 감사 기록(public.notes_restore_audit)을 만듭니다.
-- 메모 문장은 이 파일에 없습니다. 사본 내용은 학습 DB 안에서만 복사합니다(Git에 올리지 않음).
-- 두 테이블 모두 RLS를 켜고 PUBLIC·anon·authenticated 직접 권한은 주지 않습니다. 서버 함수(service_role)만 씁니다.
-- 감사 기록은 추가만 합니다(서버에 UPDATE·DELETE 권한을 주지 않음). 기존 메모(public.notes)는 바꾸지 않습니다.
begin;

create table if not exists public.notes_backup (
  id uuid primary key,
  owner_id uuid not null,
  title text not null,
  content text not null,
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  backed_up_at timestamptz not null default now()
);

create table if not exists public.notes_restore_audit (
  audit_id bigint generated always as identity primary key,
  note_id uuid not null,
  restored_by uuid not null,
  content_sha256 text not null,
  action text not null check (action in ('inserted', 'updated')),
  restored_at timestamptz not null default now()
);

alter table public.notes_backup enable row level security;
alter table public.notes_restore_audit enable row level security;
revoke all on table public.notes_backup from public, anon, authenticated;
revoke all on table public.notes_restore_audit from public, anon, authenticated;
grant select on table public.notes_backup to service_role;
grant select, insert on table public.notes_restore_audit to service_role;

-- 사본 만들기: 지금 메모를 내용 해시와 함께 복사합니다(이미 있으면 그대로 둠).
insert into public.notes_backup (id, owner_id, title, content, content_sha256)
select id, owner_id, title, content, encode(sha256(convert_to(content, 'UTF8')), 'hex')
from public.notes
on conflict (id) do nothing;

commit;

-- 확인(읽기만): 사본 행 수와 해시가 원본과 같은지
select count(*) as backup_rows,
       count(*) filter (where b.content_sha256 = encode(sha256(convert_to(n.content, 'UTF8')), 'hex')) as hash_matches
from public.notes_backup b join public.notes n using (id);
