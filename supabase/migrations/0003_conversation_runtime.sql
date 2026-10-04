alter table message
  add column if not exists automation_state text
    check (automation_state in ('pending','processing','completed','failed','skipped')),
  add column if not exists automation_updated_at timestamptz;

create unique index if not exists uq_assistant_profile_workspace
  on assistant_profile(workspace_id);

create table if not exists active_contact_monthly (
  workspace_id uuid not null references workspace(id) on delete cascade,
  contact_id uuid not null references contact(id) on delete cascade,
  month date not null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, contact_id, month)
);

alter table active_contact_monthly enable row level security;

create policy active_contact_select on active_contact_monthly
for select to authenticated
using (is_workspace_member(workspace_id));

create or replace function record_usage(
  p_workspace_id uuid,
  p_active_contact integer default 0,
  p_ai_replies integer default 0,
  p_ai_input_tokens bigint default 0,
  p_ai_output_tokens bigint default 0,
  p_inbound integer default 0,
  p_outbound integer default 0,
  p_media_bytes bigint default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m date := date_trunc('month', now())::date;
begin
  insert into usage_monthly (
    workspace_id, month, active_contacts, ai_replies, ai_input_tokens,
    ai_output_tokens, inbound_messages, outbound_messages, media_bytes
  )
  values (
    p_workspace_id, m, p_active_contact, p_ai_replies, p_ai_input_tokens,
    p_ai_output_tokens, p_inbound, p_outbound, p_media_bytes
  )
  on conflict (workspace_id, month)
  do update set
    active_contacts = usage_monthly.active_contacts + excluded.active_contacts,
    ai_replies = usage_monthly.ai_replies + excluded.ai_replies,
    ai_input_tokens = usage_monthly.ai_input_tokens + excluded.ai_input_tokens,
    ai_output_tokens = usage_monthly.ai_output_tokens + excluded.ai_output_tokens,
    inbound_messages = usage_monthly.inbound_messages + excluded.inbound_messages,
    outbound_messages = usage_monthly.outbound_messages + excluded.outbound_messages,
    media_bytes = usage_monthly.media_bytes + excluded.media_bytes,
    updated_at = now();
end;
$$;

revoke all on function record_usage(uuid,integer,integer,bigint,bigint,integer,integer,bigint) from public;
grant execute on function record_usage(uuid,integer,integer,bigint,bigint,integer,integer,bigint) to service_role;
