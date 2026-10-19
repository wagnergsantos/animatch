-- supabase/migrations/20261017000000_create_user_anime_lists.sql
create table if not exists public.user_anime_lists (
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null,
  username text not null,
  entries jsonb not null default '[]'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, provider, username)
);

-- Enable Row Level Security
alter table public.user_anime_lists enable row level security;

-- Drop existing policies if any
drop policy if exists "Users can select own anime lists" on public.user_anime_lists;
drop policy if exists "Users can insert own anime lists" on public.user_anime_lists;
drop policy if exists "Users can update own anime lists" on public.user_anime_lists;
drop policy if exists "Users can delete own anime lists" on public.user_anime_lists;

-- Create policies
create policy "Users can select own anime lists"
  on public.user_anime_lists for select
  using (auth.uid() = user_id);

create policy "Users can insert own anime lists"
  on public.user_anime_lists for insert
  with check (auth.uid() = user_id);

create policy "Users can update own anime lists"
  on public.user_anime_lists for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own anime lists"
  on public.user_anime_lists for delete
  using (auth.uid() = user_id);
