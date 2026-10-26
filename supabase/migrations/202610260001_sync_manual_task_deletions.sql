-- Keep a per-user tombstone so old offline caches cannot recreate deleted tasks.
create table if not exists public.deleted_manual_inbox_tasks (
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text not null,
  deleted_at timestamptz not null default now(),
  primary key (user_id, task_id)
);

alter table public.deleted_manual_inbox_tasks enable row level security;
revoke all on public.deleted_manual_inbox_tasks from anon;
grant select on public.deleted_manual_inbox_tasks to authenticated;
grant all on public.deleted_manual_inbox_tasks to service_role;

create policy "Users can read own deleted task markers" on public.deleted_manual_inbox_tasks
  for select to authenticated using (auth.uid() = user_id);

create or replace function public.delete_manual_inbox_task(target_task_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  deleted_count integer;
begin
  if current_user_id is null or target_task_id is null or target_task_id = '' then
    return false;
  end if;

  insert into public.deleted_manual_inbox_tasks (user_id, task_id, deleted_at)
  values (current_user_id, target_task_id, now())
  on conflict (user_id, task_id) do update set deleted_at = excluded.deleted_at;

  delete from public.manual_inbox_tasks
  where user_id = current_user_id and id = target_task_id;
  get diagnostics deleted_count = row_count;

  return deleted_count > 0 or exists (
    select 1 from public.deleted_manual_inbox_tasks
    where user_id = current_user_id and task_id = target_task_id
  );
end;
$$;

create or replace function public.save_manual_inbox_task(target_task_id text, target_task_data jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  saved_count integer;
begin
  if current_user_id is null or target_task_id is null or target_task_id = '' or target_task_data is null then
    return false;
  end if;

  delete from public.deleted_manual_inbox_tasks
  where user_id = current_user_id and task_id = target_task_id;

  insert into public.manual_inbox_tasks (id, user_id, task_data, updated_at)
  values (target_task_id, current_user_id, target_task_data, now())
  on conflict (id) do update
    set task_data = excluded.task_data, updated_at = excluded.updated_at
    where manual_inbox_tasks.user_id = current_user_id;
  get diagnostics saved_count = row_count;
  return saved_count > 0;
end;
$$;

revoke all on function public.delete_manual_inbox_task(text) from public, anon;
revoke all on function public.save_manual_inbox_task(text, jsonb) from public, anon;
grant execute on function public.delete_manual_inbox_task(text) to authenticated;
grant execute on function public.save_manual_inbox_task(text, jsonb) to authenticated;

-- Realtime lets other open devices refresh promptly after a task changes.
alter table public.manual_inbox_tasks replica identity full;
alter table public.deleted_manual_inbox_tasks replica identity full;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'manual_inbox_tasks'
  ) then
    alter publication supabase_realtime add table public.manual_inbox_tasks;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'deleted_manual_inbox_tasks'
  ) then
    alter publication supabase_realtime add table public.deleted_manual_inbox_tasks;
  end if;
end
$$;
