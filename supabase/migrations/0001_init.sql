-- ============================================================================
-- Match Magic: Auth + Reconciliation History schema
-- Run this once in your Supabase project's SQL Editor
-- (Dashboard -> SQL Editor -> New query -> paste -> Run)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Profiles table
--    One row per user. Auto-populated whenever a new auth.users row is created
--    (covers both email/password sign-up and Google OAuth sign-in).
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. Reconciliation history table
--    One row per reconciliation run. Stores the two input files, the config
--    used (mappings/virtual fields/transformations/sort config), a summary of
--    the results, and storage paths to the uploaded source/target/output files.
-- ----------------------------------------------------------------------------
create table if not exists public.reconciliation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  source_file_name text not null,
  target_file_name text not null,
  source_file_path text,
  target_file_path text,
  output_file_path text,
  config jsonb not null default '{}'::jsonb,
  result_summary jsonb not null default '{}'::jsonb
);

create index if not exists reconciliation_history_user_id_idx
  on public.reconciliation_history (user_id, created_at desc);

alter table public.reconciliation_history enable row level security;

drop policy if exists "Users can view their own history" on public.reconciliation_history;
create policy "Users can view their own history"
  on public.reconciliation_history for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own history" on public.reconciliation_history;
create policy "Users can insert their own history"
  on public.reconciliation_history for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own history" on public.reconciliation_history;
create policy "Users can delete their own history"
  on public.reconciliation_history for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. Storage bucket for the uploaded/generated Excel files
--    Files are stored under a path prefixed with the user's id, e.g.
--    "<user_id>/<history_id>/source.xlsx", so RLS can scope access per user.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('reconciliation-files', 'reconciliation-files', false)
on conflict (id) do nothing;

drop policy if exists "Users can read own reconciliation files" on storage.objects;
create policy "Users can read own reconciliation files"
  on storage.objects for select
  using (
    bucket_id = 'reconciliation-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can upload own reconciliation files" on storage.objects;
create policy "Users can upload own reconciliation files"
  on storage.objects for insert
  with check (
    bucket_id = 'reconciliation-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete own reconciliation files" on storage.objects;
create policy "Users can delete own reconciliation files"
  on storage.objects for delete
  using (
    bucket_id = 'reconciliation-files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
