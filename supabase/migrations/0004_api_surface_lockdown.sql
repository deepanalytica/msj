-- MSJ defense in depth:
-- Browser clients use Supabase Auth only. Application data is accessed through
-- authenticated MSJ server routes, which perform authorization and use the
-- server-only Supabase secret/service role client.

-- Remove earlier broad authenticated policies.
drop policy if exists channel_all on channel_connection;
drop policy if exists contact_all on contact;
drop policy if exists identity_all on external_identity;
drop policy if exists conversation_all on conversation;
drop policy if exists message_all on message;
drop policy if exists assistant_all on assistant_profile;
drop policy if exists integration_all on integration;
drop policy if exists workspace_select on workspace;
drop policy if exists member_select on workspace_member;
drop policy if exists tool_call_select on tool_call;
drop policy if exists subscription_select on workspace_subscription;
drop policy if exists usage_select on usage_monthly;
drop policy if exists audit_select on audit_event;
drop policy if exists security_select on security_event;
drop policy if exists api_key_select on workspace_api_key;
drop policy if exists active_contact_select on active_contact_monthly;

-- Public Data API roles do not get direct access to MSJ application tables.
-- service_role / secret-key server access is not revoked.
revoke all on table workspace from anon, authenticated;
revoke all on table workspace_member from anon, authenticated;
revoke all on table channel_connection from anon, authenticated;
revoke all on table contact from anon, authenticated;
revoke all on table external_identity from anon, authenticated;
revoke all on table conversation from anon, authenticated;
revoke all on table message from anon, authenticated;
revoke all on table assistant_profile from anon, authenticated;
revoke all on table integration from anon, authenticated;
revoke all on table tool_call from anon, authenticated;
revoke all on table workspace_subscription from anon, authenticated;
revoke all on table usage_monthly from anon, authenticated;
revoke all on table audit_event from anon, authenticated;
revoke all on table security_event from anon, authenticated;
revoke all on table platform_admin from anon, authenticated;
revoke all on table workspace_api_key from anon, authenticated;
revoke all on table active_contact_monthly from anon, authenticated;

-- These helpers are not intended as public RPC endpoints.
revoke all on function record_usage(uuid,integer,integer,bigint,bigint,integer,integer,bigint) from public, anon, authenticated;
grant execute on function record_usage(uuid,integer,integer,bigint,bigint,integer,integer,bigint) to service_role;

revoke all on function is_workspace_member(uuid) from public, anon;
grant execute on function is_workspace_member(uuid) to authenticated, service_role;
