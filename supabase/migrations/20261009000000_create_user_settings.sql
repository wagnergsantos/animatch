-- supabase/migrations/20261009000000_create_user_settings.sql
create table if not exists public.user_settings (
  user_id uuid references auth.users(id) on delete cascade primary key,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.user_settings enable row level security;

-- Drop existing policies if any
drop policy if exists "Users can select own settings" on public.user_settings;
drop policy if exists "Users can insert own settings" on public.user_settings;
drop policy if exists "Users can update own settings" on public.user_settings;

-- Create policies
create policy "Users can select own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);
