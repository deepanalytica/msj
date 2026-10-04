export type ChannelPlatform = "whatsapp" | "instagram" | "messenger";
export type ConversationMode = "ai" | "human" | "paused";
export type MessageDirection = "inbound" | "outbound";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
}

export interface NormalizedInboundMessage {
  platform: ChannelPlatform;
  channelExternalId: string;
  contactExternalId: string;
  contactDisplayName?: string;
  externalMessageId: string;
  body: string;
  kind: string;
  occurredAt: string;
  raw: Record<string, unknown>;
}

export interface ToolDescriptor {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  risk: "read" | "write" | "sensitive";
}

export interface ToolExecutionRequest {
  workspaceId: string;
  conversationId: string;
  tool: string;
  arguments: Record<string, unknown>;
}

export interface ToolExecutionResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}
