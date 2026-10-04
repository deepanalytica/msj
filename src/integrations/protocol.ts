import type {
  ToolDescriptor,
  ToolExecutionRequest,
  ToolExecutionResult
} from "@/domain/core";

/**
 * Contrato que mantiene MSJ independiente de cualquier vertical.
 * Clinia, un CRM o un ERP implementan exactamente esta interfaz.
 */
export interface ExternalToolProvider {
  id: string;
  type: string;
  listTools(): Promise<ToolDescriptor[]>;
  execute(request: ToolExecutionRequest): Promise<ToolExecutionResult>;
}

export interface HttpToolProviderConfig {
  id: string;
  type: string;
  baseUrl: string;
  secret: string;
}

async function signedFetch(
  config: HttpToolProviderConfig,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const body = typeof init?.body === "string" ? init.body : "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(config.secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body)
  );
  const hex = Array.from(new Uint8Array(signature), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");

  return fetch(new URL(path, config.baseUrl), {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-msj-signature": `sha256=${hex}`,
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });
}

export function createHttpToolProvider(
  config: HttpToolProviderConfig
): ExternalToolProvider {
  return {
    id: config.id,
    type: config.type,

    async listTools() {
      const response = await signedFetch(config, "/v1/msj/tools");
      if (!response.ok) throw new Error(`Tool manifest HTTP ${response.status}`);
      const json = (await response.json()) as { tools?: ToolDescriptor[] };
      return json.tools ?? [];
    },

    async execute(request) {
      const body = JSON.stringify(request);
      const response = await signedFetch(config, "/v1/msj/execute", {
        method: "POST",
        body
      });
      const json = (await response.json().catch(() => ({}))) as ToolExecutionResult;
      if (!response.ok) {
        return { ok: false, error: json.error ?? `HTTP ${response.status}` };
      }
      return json;
    }
  };
}
