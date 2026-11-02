-- =============================================================================
-- SchoolVault — Supabase setup (LOGIN version: every account has its own data)
--
-- HOW TO USE: Supabase dashboard > SQL Editor > New query > paste this WHOLE
-- file > Run.  It is safe to run more than once, and safe to run on a project
-- you already set up with an older version of this file (including the old
-- NO-LOGIN version): it keeps your tables and adds/changes what is needed.
--
-- WHAT IT ENFORCES (inside the database, so it cannot be bypassed from the app):
--   * Every student, folder, file record and task belongs to the account that
--     created it. Another account cannot see, change or delete it.
--   * Uploaded files live in a PRIVATE bucket, in a folder named after the
--     account. Another account cannot open them, even with the link.
--   * Signing in with the same email (email+password or Google) on any phone or
--     computer is the same account, so it shows the same data everywhere.
--   * An account whose role is 'admin' can see everything (nobody is an admin
--     until you promote them — see the notes at the bottom).
--   * Nobody can promote themselves to admin.
--   * "Delete account" really deletes the login, the data and the files.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Tables (kept as they are if they already exist)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('admin', 'user')),
  password_setup_done boolean not null default false,
  created_date timestamptz not null default now()
);
alter table public.profiles add column if not exists password_setup_done boolean not null default false;

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_folder_id uuid references public.folders(id) on delete cascade,
  color text default '#3B82F6',
  description text,
  created_date timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grade text,
  grade_number numeric,
  last_promoted_year text,
  student_number text,
  photo_url text,
  notes text,
  created_date timestamptz not null default now()
);
alter table public.students add column if not exists age numeric;
alter table public.students add column if not exists address text;
alter table public.students add column if not exists email text;
alter table public.students add column if not exists section text;
alter table public.students add column if not exists base_grade_number numeric;
alter table public.students add column if not exists base_year_start numeric;

create table if not exists public.school_files (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  file_url text not null,
  file_type text,
  file_size numeric,
  folder_id uuid references public.folders(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  tags text[],
  notes text,
  source text default 'upload' check (source in ('upload', 'scan')),
  created_date timestamptz not null default now()
);

create table if not exists public.board_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text,
  due_date date,
  completed boolean not null default false,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  created_date timestamptz not null default now()
);

-- The owner column: filled in automatically with the signed-in account.
-- If the account is deleted, its data is deleted with it.
alter table public.folders      add column if not exists created_by_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.students     add column if not exists created_by_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.school_files add column if not exists created_by_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.board_tasks  add column if not exists created_by_id uuid default auth.uid() references auth.users(id) on delete cascade;

create index if not exists folders_owner_idx      on public.folders(created_by_id);
create index if not exists students_owner_idx     on public.students(created_by_id);
create index if not exists school_files_owner_idx on public.school_files(created_by_id);
create index if not exists board_tasks_owner_idx  on public.board_tasks(created_by_id);


-- -----------------------------------------------------------------------------
-- 2. Helper: is the signed-in account an admin?
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;


-- -----------------------------------------------------------------------------
-- 3. Remove every older/open rule (important: rules add up, so a leftover
--    "anyone can..." rule from the no-login version would defeat the new ones)
-- -----------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'folders', 'students', 'school_files', 'board_tasks')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;

  for r in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (policyname ilike '%school-files%' or policyname ilike 'Files:%')
  loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;
end $$;


-- -----------------------------------------------------------------------------
-- 4. Row rules for the four data tables: own rows only (admins: everything)
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['students', 'folders', 'school_files', 'board_tasks']
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format($f$create policy "Own rows: read" on public.%I
      for select to authenticated
      using (created_by_id = (select auth.uid()) or public.is_admin())$f$, t);

    execute format($f$create policy "Own rows: create" on public.%I
      for insert to authenticated
      with check (created_by_id = (select auth.uid()))$f$, t);

    execute format($f$create policy "Own rows: change" on public.%I
      for update to authenticated
      using (created_by_id = (select auth.uid()) or public.is_admin())
      with check (created_by_id = (select auth.uid()) or public.is_admin())$f$, t);

    execute format($f$create policy "Own rows: delete" on public.%I
      for delete to authenticated
      using (created_by_id = (select auth.uid()) or public.is_admin())$f$, t);

    -- Visitors who are not signed in get no access at all.
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;


-- -----------------------------------------------------------------------------
-- 5. Profiles: you can read your own; you can only change "password_setup_done"
--    (so nobody can make themselves an admin).
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "Profiles: read own (admins read all)" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

create policy "Profiles: change own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke all on public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;
grant update (password_setup_done) on public.profiles to authenticated;


-- -----------------------------------------------------------------------------
-- 6. A profile is created automatically for every new account
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Accounts that already existed before this script get a profile too.
insert into public.profiles (id, email, role)
select id, email, 'user' from auth.users
on conflict (id) do nothing;


-- -----------------------------------------------------------------------------
-- 7. "Delete account": removes the login; the profile and ALL of the account's
--    data are removed with it (the app removes the uploaded files first).
-- -----------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = uid;
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;


-- -----------------------------------------------------------------------------
-- 8. Uploaded files: a PRIVATE bucket; each account uses the folder named
--    after its own id.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('school-files', 'school-files', false)
on conflict (id) do update set public = false;

create policy "Files: upload into own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'school-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Files: read own folder (admins read all)" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'school-files'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
  );

create policy "Files: delete from own folder (admins any)" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'school-files'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
  );


-- -----------------------------------------------------------------------------
-- NOTES
-- * Make yourself an admin (after you have registered once), run on its own:
--       update public.profiles set role = 'admin' where email = 'you@gmail.com';
--
-- * Data created with the earlier NO-LOGIN version has no owner, so normal
--   accounts cannot see it (admins can). To hand it to one account, run:
--       update public.students     set created_by_id = (select id from auth.users where email = 'you@gmail.com') where created_by_id is null;
--       update public.folders      set created_by_id = (select id from auth.users where email = 'you@gmail.com') where created_by_id is null;
--       update public.school_files set created_by_id = (select id from auth.users where email = 'you@gmail.com') where created_by_id is null;
--       update public.board_tasks  set created_by_id = (select id from auth.users where email = 'you@gmail.com') where created_by_id is null;
--   (Files uploaded by that old version are not in an account folder, so their
--   previews will not open; re-upload what you still need.)
-- =============================================================================
