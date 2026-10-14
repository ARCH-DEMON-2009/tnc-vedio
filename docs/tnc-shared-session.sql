-- Shared upstream TNC login token used by the web API server.
create table if not exists public.tnc_shared_session (
  id text primary key check (id = 'shared'),
  token text not null,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.tnc_shared_session enable row level security;
revoke all on table public.tnc_shared_session from anon, authenticated;
grant all on table public.tnc_shared_session to service_role;