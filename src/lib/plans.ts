export type PlanCode = "starter" | "growth" | "scale" | "enterprise";

export interface PlanDefinition {
  code: PlanCode;
  name: string;
  monthlyUsd: number | null;
  annualUsd: number | null;
  activeContacts: number | null;
  aiReplies: number | null;
  seats: number | null;
  channels: number | null;
  integrations: number | null;
  features: string[];
  overageAiPer1000Usd: number | null;
}

export const PLANS: Record<PlanCode, PlanDefinition> = {
  starter: {
    code: "starter",
    name: "Starter",
    monthlyUsd: 29,
    annualUsd: 290,
    activeContacts: 2000,
    aiReplies: 3000,
    seats: 2,
    channels: 1,
    integrations: 1,
    overageAiPer1000Usd: 3,
    features: [
      "Inbox unificado",
      "1 canal Meta",
      "Asistente IA",
      "AI / HUMAN / PAUSED",
      "1 integración",
      "Auditoría básica",
    ],
  },
  growth: {
    code: "growth",
    name: "Growth",
    monthlyUsd: 79,
    annualUsd: 790,
    activeContacts: 10000,
    aiReplies: 15000,
    seats: 5,
    channels: 3,
    integrations: 5,
    overageAiPer1000Usd: 2.5,
    features: [
      "Todo Starter",
      "WhatsApp + Instagram + Messenger",
      "Asignación de conversaciones",
      "Automatizaciones",
      "5 integraciones",
      "Webhooks salientes",
      "Reportes de operación",
    ],
  },
  scale: {
    code: "scale",
    name: "Scale",
    monthlyUsd: 179,
    annualUsd: 1790,
    activeContacts: 50000,
    aiReplies: 60000,
    seats: 15,
    channels: 10,
    integrations: 20,
    overageAiPer1000Usd: 2,
    features: [
      "Todo Growth",
      "API completa",
      "20 integraciones",
      "Roles avanzados",
      "Auditoría ampliada",
      "Prioridad de soporte",
      "Controles de seguridad avanzados",
    ],
  },
  enterprise: {
    code: "enterprise",
    name: "Enterprise",
    monthlyUsd: null,
    annualUsd: null,
    activeContacts: null,
    aiReplies: null,
    seats: null,
    channels: null,
    integrations: null,
    overageAiPer1000Usd: null,
    features: [
      "Límites personalizados",
      "SSO / acceso corporativo",
      "SLA y soporte dedicado",
      "Entorno dedicado opcional",
      "Exportación de auditoría",
      "Revisión de seguridad",
    ],
  },
};

export function planAllows(
  plan: PlanDefinition,
  metric: "activeContacts" | "aiReplies" | "seats" | "channels" | "integrations",
  current: number,
  increment = 1,
): boolean {
  const limit = plan[metric];
  return limit === null || current + increment <= limit;
}
