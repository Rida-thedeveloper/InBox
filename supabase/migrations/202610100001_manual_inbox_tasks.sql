create table if not exists public.manual_inbox_tasks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  task_data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.manual_inbox_tasks enable row level security;
revoke all on public.manual_inbox_tasks from anon;
grant select, insert, update, delete on public.manual_inbox_tasks to authenticated;

create policy "Users can read own manual tasks" on public.manual_inbox_tasks
  for select to authenticated using (auth.uid() = user_id);
create policy "Users can create own manual tasks" on public.manual_inbox_tasks
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own manual tasks" on public.manual_inbox_tasks
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own manual tasks" on public.manual_inbox_tasks
  for delete to authenticated using (auth.uid() = user_id);

grant all on public.manual_inbox_tasks to service_role;

-- Allow users to permanently remove their own imported email detections too.
grant delete on public.pending_inbox_detections to authenticated;
create policy "Users can delete own detections" on public.pending_inbox_detections
  for delete to authenticated using (auth.uid() = user_id);
