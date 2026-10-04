create extension if not exists pgcrypto;

create type channel_platform as enum ('whatsapp', 'instagram', 'messenger');
create type conversation_mode as enum ('ai', 'human', 'paused');
create type conversation_status as enum ('open', 'closed');
create type message_direction as enum ('inbound', 'outbound');
create type message_status as enum ('received', 'queued', 'sent', 'delivered', 'read', 'failed');

create table workspace (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table workspace_member (
  workspace_id uuid not null references workspace(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','agent','viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table channel_connection (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace(id) on delete cascade,
  platform channel_platform not null,
  external_account_id text not null,
  display_name text,
  credential_ciphertext text not null,
  credential_iv text not null,
  status text not null default 'active' check (status in ('active','disconnected')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(platform, external_account_id)
);

create table contact (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace(id) on delete cascade,
  display_name text,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table external_identity (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace(id) on delete cascade,
  contact_id uuid not null references contact(id) on delete cascade,
  channel_connection_id uuid not null references channel_connection(id) on delete cascade,
  external_user_id text not null,
  profile jsonb not null default '{}'::jsonb,
  unique(channel_connection_id, external_user_id)
);

create table conversation (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace(id) on delete cascade,
  channel_connection_id uuid not null references channel_connection(id) on delete cascade,
  contact_id uuid not null references contact(id) on delete cascade,
  mode conversation_mode not null default 'ai',
  status conversation_status not null default 'open',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index uq_open_conversation
on conversation(channel_connection_id, contact_id)
where status='open';

create table message (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace(id) on delete cascade,
  conversation_id uuid not null references conversation(id) on delete cascade,
  channel_connection_id uuid not null references channel_connection(id) on delete cascade,
  external_message_id text,
  direction message_direction not null,
  kind text not null default 'text',
  body text not null default '',
  payload jsonb not null default '{}'::jsonb,
  status message_status not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index uq_message_external_id
on message(external_message_id)
where external_message_id is not null;

create table assistant_profile (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace(id) on delete cascade,
  name text not null default 'Asistente',
  enabled boolean not null default false,
  model text not null default 'gpt-5.6-luna',
  system_prompt text not null default '',
  max_history_messages integer not null default 12 check (max_history_messages between 1 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table integration (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace(id) on delete cascade,
  provider_type text not null,
  name text not null,
  base_url text not null,
  secret_ciphertext text not null,
  secret_iv text not null,
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tool_call (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace(id) on delete cascade,
  conversation_id uuid not null references conversation(id) on delete cascade,
  integration_id uuid references integration(id) on delete set null,
  tool_name text not null,
  args jsonb not null default '{}'::jsonb,
  result jsonb,
  status text not null check (status in ('succeeded','failed')),
  created_at timestamptz not null default now()
);

alter table workspace enable row level security;
alter table workspace_member enable row level security;
alter table channel_connection enable row level security;
alter table contact enable row level security;
alter table external_identity enable row level security;
alter table conversation enable row level security;
alter table message enable row level security;
alter table assistant_profile enable row level security;
alter table integration enable row level security;
alter table tool_call enable row level security;

create or replace function is_workspace_member(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from workspace_member
    where workspace_id = target and user_id = auth.uid()
  );
$$;

create policy workspace_select on workspace
for select to authenticated
using (is_workspace_member(id));

create policy member_select on workspace_member
for select to authenticated
using (is_workspace_member(workspace_id));

create policy channel_all on channel_connection
for all to authenticated
using (is_workspace_member(workspace_id))
with check (is_workspace_member(workspace_id));

create policy contact_all on contact
for all to authenticated
using (is_workspace_member(workspace_id))
with check (is_workspace_member(workspace_id));

create policy identity_all on external_identity
for all to authenticated
using (is_workspace_member(workspace_id))
with check (is_workspace_member(workspace_id));

create policy conversation_all on conversation
for all to authenticated
using (is_workspace_member(workspace_id))
with check (is_workspace_member(workspace_id));

create policy message_all on message
for all to authenticated
using (is_workspace_member(workspace_id))
with check (is_workspace_member(workspace_id));

create policy assistant_all on assistant_profile
for all to authenticated
using (is_workspace_member(workspace_id))
with check (is_workspace_member(workspace_id));

create policy integration_all on integration
for all to authenticated
using (is_workspace_member(workspace_id))
with check (is_workspace_member(workspace_id));

create policy tool_call_select on tool_call
for select to authenticated
using (is_workspace_member(workspace_id));
