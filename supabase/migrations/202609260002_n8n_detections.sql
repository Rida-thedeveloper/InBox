create table if not exists public.pending_inbox_detections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'gmail' check (source in ('gmail', 'email')),
  source_channel text not null default 'Gmail',
  message_id text not null,
  title text not null,
  description text not null default '',
  context_text text not null default '',
  date_time text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (user_id, message_id)
);

alter table public.pending_inbox_detections enable row level security;
revoke all on public.pending_inbox_detections from anon;
grant select, update on public.pending_inbox_detections to authenticated;
create policy "Users can read own detections" on public.pending_inbox_detections
  for select to authenticated using (auth.uid() = user_id);
create policy "Users can update own detections" on public.pending_inbox_detections
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant all on public.pending_inbox_detections to service_role;
