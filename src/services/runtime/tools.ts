import type { ToolDescriptor, ToolExecutionResult } from "@/domain/core";
import { createAdminClient } from "@/lib/supabase/server";
import { decryptSecret, hmacSha256Hex } from "@/services/crypto";
import { setConversationMode } from "@/services/runtime/repository";

export type RuntimeTool = {
  descriptor: ToolDescriptor;
  integrationId?: string;
  baseUrl?: string;
  secret?: string;
  internal?: "handoff";
};

function safeHttpsBaseUrl(raw: string): string {
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("Integration URLs must use HTTPS.");
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    throw new Error("Private/local integration endpoints are not allowed.");
  }
  return url.toString();
}

async function signedRequest(baseUrl: string, secret: string, path: string, body?: string) {
  const signature = await hmacSha256Hex(secret, body ?? "");
  return fetch(new URL(path, baseUrl), {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "content-type": "application/json",
      "x-msj-signature": `sha256=${signature}`,
    },
    body,
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
}

export async function loadRuntimeTools(workspaceId: string): Promise<RuntimeTool[]> {
  const db = createAdminClient();
  const key = process.env.MSJ_CREDENTIALS_KEY;
  if (!key) throw new Error("MSJ_CREDENTIALS_KEY not configured.");

  const tools: RuntimeTool[] = [{
    descriptor: {
      name: "msj.request_human",
      description: "Pass the conversation to a human agent.",
      inputSchema: {
        type: "object",
        properties: { reason: { type: "string" } },
        required: ["reason"],
        additionalProperties: false,
      },
      risk: "write",
    },
    internal: "handoff",
  }];

  const { data: integrations, error } = await db.from("integration")
    .select("id,base_url,secret_ciphertext,secret_iv")
    .eq("workspace_id", workspaceId)
    .eq("enabled", true)
    .limit(20);

  if (error) throw new Error(error.message);

  for (const integration of integrations ?? []) {
    const baseUrl = safeHttpsBaseUrl(integration.base_url);
    const secret = await decryptSecret(integration.secret_ciphertext, integration.secret_iv, key);
    try {
      const response = await signedRequest(baseUrl, secret, "/v1/msj/tools");
      if (!response.ok) continue;
      const json = await response.json() as { tools?: ToolDescriptor[] };
      for (const descriptor of (json.tools ?? []).slice(0, 20)) {
        if (!descriptor.name || !descriptor.inputSchema) continue;
        tools.push({ descriptor, integrationId: integration.id, baseUrl, secret });
      }
    } catch {
      // One unhealthy integration must not break the whole assistant.
    }
  }

  return tools.slice(0, 40);
}

export async function executeRuntimeTool(input: {
  workspaceId: string;
  conversationId: string;
  tool: RuntimeTool;
  args: Record<string, unknown>;
}): Promise<ToolExecutionResult> {
  const db = createAdminClient();

  if (input.tool.internal === "handoff") {
    await setConversationMode(input.conversationId, "human");
    return { ok: true, data: { handedOff: true } };
  }

  if (input.tool.descriptor.risk === "sensitive") {
    await setConversationMode(input.conversationId, "human");
    return { ok: false, error: "Sensitive action requires human takeover." };
  }

  if (!input.tool.baseUrl || !input.tool.secret || !input.tool.integrationId) {
    return { ok: false, error: "Tool provider unavailable." };
  }

  const payload = JSON.stringify({
    workspaceId: input.workspaceId,
    conversationId: input.conversationId,
    tool: input.tool.descriptor.name,
    arguments: input.args,
  });

  let result: ToolExecutionResult;
  try {
    const response = await signedRequest(
      input.tool.baseUrl,
      input.tool.secret,
      "/v1/msj/execute",
      payload,
    );
    result = await response.json().catch(() => ({
      ok: false,
      error: `HTTP ${response.status}`,
    })) as ToolExecutionResult;

    if (!response.ok) {
      result = { ok: false, error: result.error ?? `HTTP ${response.status}` };
    }
  } catch (error) {
    result = {
      ok: false,
      error: error instanceof Error ? error.message : "Integration failed.",
    };
  }

  await db.from("tool_call").insert({
    workspace_id: input.workspaceId,
    conversation_id: input.conversationId,
    integration_id: input.tool.integrationId,
    tool_name: input.tool.descriptor.name,
    args: input.args,
    result,
    status: result.ok ? "succeeded" : "failed",
  });

  return result;
}
