-- MSJ platform operations, subscriptions, metering and security controls.

alter table workspace
  add column if not exists status text not null default 'active'
    check (status in ('active','suspended','closed')),
  add column if not exists retention_days integer not null default 365
    check (retention_days between 7 and 3650);

create table if not exists workspace_subscription (
  workspace_id uuid primary key references workspace(id) on delete cascade,
  plan_code text not null default 'starter'
    check (plan_code in ('starter','growth','scale','enterprise')),
  status text not null default 'trialing'
    check (status in ('trialing','active','past_due','canceled','paused')),
  billing_provider text,
  external_customer_id text,
  external_subscription_id text,
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists usage_monthly (
  workspace_id uuid not null references workspace(id) on delete cascade,
  month date not null,
  active_contacts integer not null default 0 check (active_contacts >= 0),
  ai_replies integer not null default 0 check (ai_replies >= 0),
  ai_input_tokens bigint not null default 0 check (ai_input_tokens >= 0),
  ai_output_tokens bigint not null default 0 check (ai_output_tokens >= 0),
  inbound_messages integer not null default 0 check (inbound_messages >= 0),
  outbound_messages integer not null default 0 check (outbound_messages >= 0),
  media_bytes bigint not null default 0 check (media_bytes >= 0),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, month)
);

create table if not exists audit_event (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspace(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_hash text,
  created_at timestamptz not null default now()
);

create table if not exists security_event (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspace(id) on delete cascade,
  severity text not null check (severity in ('info','low','medium','high','critical')),
  event_type text not null,
  source text not null,
  metadata jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists platform_admin (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'operator'
    check (role in ('operator','security','finance','superadmin')),
  created_at timestamptz not null default now()
);

create table if not exists workspace_api_key (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspace(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  scopes text[] not null default '{}',
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_workspace_time on audit_event(workspace_id, created_at desc);
create index if not exists idx_security_workspace_time on security_event(workspace_id, created_at desc);
create index if not exists idx_usage_month on usage_monthly(month);
create index if not exists idx_workspace_status on workspace(status);

alter table workspace_subscription enable row level security;
alter table usage_monthly enable row level security;
alter table audit_event enable row level security;
alter table security_event enable row level security;
alter table platform_admin enable row level security;
alter table workspace_api_key enable row level security;

create policy subscription_select on workspace_subscription
for select to authenticated
using (is_workspace_member(workspace_id));

create policy usage_select on usage_monthly
for select to authenticated
using (is_workspace_member(workspace_id));

create policy audit_select on audit_event
for select to authenticated
using (workspace_id is not null and is_workspace_member(workspace_id));

create policy security_select on security_event
for select to authenticated
using (workspace_id is not null and is_workspace_member(workspace_id));

create policy api_key_select on workspace_api_key
for select to authenticated
using (is_workspace_member(workspace_id));

-- No client-side INSERT/UPDATE/DELETE policies for subscriptions, usage,
-- audit, security events or API keys. Writes are performed by trusted server routes.
