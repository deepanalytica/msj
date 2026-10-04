# Arquitectura de MSJ

## Regla principal

**MSJ no conoce el dominio del cliente.**

No contiene conceptos como paciente, propiedad, mesa, pedido o lead inmobiliario.
Solo conoce:

- workspace;
- canal;
- contacto;
- conversación;
- mensaje;
- agente;
- integración;
- tool;
- handoff;
- auditoría.

Las capacidades del negocio llegan mediante Tool Providers.

## Capas

```text
Meta APIs
   |
Meta Gateway
   |
Normalized Event
   |
Conversation Engine
   +-- Identity
   +-- Memory
   +-- Policies
   +-- AI Router
   +-- Human Handoff
   +-- Tool Router
           |
           +-- Clinia Connector
           +-- CRM Connector
           +-- Custom HTTP Connector
```

## Multi-tenant

La frontera de seguridad es `workspace_id`, nunca un ID de una vertical.

Una cuenta puede administrar varios workspaces y cada workspace puede conectar:

- varios números WhatsApp;
- varias cuentas Instagram;
- varias páginas Facebook;
- varias integraciones externas;
- uno o más perfiles de asistente.

## Separación de Clinia

Clinia implementa el protocolo de integración de MSJ:

```text
GET  /v1/msj/tools
POST /v1/msj/execute
```

Ejemplo de tools que Clinia puede exponer:

- `clinia.list_services`
- `clinia.list_professionals`
- `clinia.list_availability`
- `clinia.create_booking`
- `clinia.reschedule_booking`
- `clinia.cancel_booking`

MSJ ejecuta esas acciones pero no almacena ni interpreta el dominio clínico.

## Comercialización

MSJ puede venderse como:

1. Inbox omnicanal sin IA.
2. Inbox + AI Reception/Sales.
3. Inbox + automatizaciones.
4. Inbox + integraciones sectoriales.

Clinia puede incluir MSJ como módulo, pero ninguno necesita al otro para existir.
