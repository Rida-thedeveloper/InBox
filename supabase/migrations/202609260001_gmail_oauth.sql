create table if not exists public.gmail_oauth_states (
  state_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  redirect_uri text not null,
  code_verifier text not null,
  expires_at timestamptz not null
);

alter table public.gmail_oauth_states enable row level security;
revoke all on public.gmail_oauth_states from anon, authenticated;
grant all on public.gmail_oauth_states to service_role;

create table if not exists public.gmail_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gmail_email text not null,
  encrypted_tokens text not null,
  tokens_iv text not null,
  token_expires_at timestamptz not null,
  granted_scope text not null,
  connected_at timestamptz not null default now()
);

alter table public.gmail_connections enable row level security;
revoke all on public.gmail_connections from anon, authenticated;
grant all on public.gmail_connections to service_role;

create or replace function public.consume_gmail_oauth_state(p_state_hash text)
returns table (user_id uuid, redirect_uri text, code_verifier text)
language sql
security definer
set search_path = ''
as $$
  delete from public.gmail_oauth_states s
  where s.state_hash = p_state_hash and s.expires_at > now()
  returning s.user_id, s.redirect_uri, s.code_verifier;
$$;

revoke all on function public.consume_gmail_oauth_state(text) from public, anon, authenticated;
grant execute on function public.consume_gmail_oauth_state(text) to service_role;
