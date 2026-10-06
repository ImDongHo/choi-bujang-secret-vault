-- 3단계 제작 3: 메모에 UUID id를 두고, 서버 함수(service_role)만 추가·수정·삭제할 수 있게 합니다.
-- 2026-10-06 학습용 Supabase(choi-bujang-vault)에 이 순서대로 실제 적용했습니다.
-- 메모 문장은 들어 있지 않습니다. anon·authenticated에는 여전히 아무 권한도 주지 않습니다.
-- 옛 bigint id는 지우지 않고 legacy_id로 이름만 바꿔 내부 기본 키로 남겼습니다(API에는 나오지 않음).
-- 소유자 검사(owner_id = 로그인 사용자)는 아직 없으며 4단계에서 붙입니다.
begin;

alter table public.notes add column if not exists new_id uuid not null default gen_random_uuid();
alter table public.notes alter column owner_id set not null;
alter table public.notes add constraint notes_title_length check (char_length(title) between 1 and 200);
alter table public.notes add constraint notes_content_length check (char_length(content) <= 5000);
create index if not exists notes_owner_created_idx on public.notes (owner_id, created_at);

alter table public.notes rename column id to legacy_id;
alter table public.notes rename column new_id to id;
alter table public.notes add constraint notes_id_key unique (id);

revoke all on public.notes from anon, authenticated;
grant select, insert, update, delete on public.notes to service_role;

commit;
