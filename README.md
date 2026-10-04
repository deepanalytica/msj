# MSJ — Omnichannel AI

Motor omnicanal independiente para responder y operar conversaciones de WhatsApp, Instagram y Facebook Messenger mediante APIs oficiales de Meta.

MSJ es un producto horizontal. **No depende de Clinia.** Clinia es una integración opcional que expone herramientas como disponibilidad y reservas.

> Nombre de repositorio/producto técnico provisional. La marca comercial puede cambiar sin alterar la arquitectura.

## Principio de arquitectura

```text
WhatsApp / Instagram / Messenger
              │
              ▼
      Meta Gateway (Cloudflare)
              │
              ▼
        Conversation Engine
          │      │      │
          │      │      └─ Human Handoff
          │      └──────── AI Router
          └─────────────── Tool Router
                             │
              ┌──────────────┼───────────────┐
              ▼              ▼               ▼
           Clinia           CRM          Custom API
```

## Producto standalone

- Inbox unificado.
- AI / HUMAN / PAUSED.
- Conexiones directas con Meta.
- Multi-tenant.
- Herramientas externas por conectores.
- Auditoría de acciones.
- Despliegue Cloudflare Workers + GitHub Actions.
- Postgres/Supabase con RLS.

Clinia consume MSJ mediante un conector y puede venderse completamente por separado.
