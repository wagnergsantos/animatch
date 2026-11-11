-- supabase/migrations/20261111000000_add_delete_policy_and_account_deletion.sql
-- L3: Direito de Exclusão na Nuvem (LGPD Art. 18 / GDPR Art. 17)

drop policy if exists "Users can delete own settings" on public.user_settings;

create policy "Users can delete own settings"
  on public.user_settings for delete
  using (auth.uid() = user_id);

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
