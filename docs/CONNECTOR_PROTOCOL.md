# MSJ Tool Provider Protocol v1

Una integración externa publica dos endpoints.

## Tool manifest

`GET /v1/msj/tools`

```json
{
  "tools": [
    {
      "name": "clinia.list_availability",
      "description": "Lista horas disponibles",
      "inputSchema": {
        "type": "object",
        "properties": {
          "professionalId": { "type": "string" }
        },
        "required": ["professionalId"]
      },
      "risk": "read"
    }
  ]
}
```

## Execute

`POST /v1/msj/execute`

```json
{
  "workspaceId": "ws_123",
  "conversationId": "conv_123",
  "tool": "clinia.list_availability",
  "arguments": {
    "professionalId": "pro_42"
  }
}
```

Respuesta:

```json
{
  "ok": true,
  "data": []
}
```

## Seguridad

El cuerpo se firma con HMAC-SHA256 y se envía en:

`X-MSJ-Signature: sha256=<hex>`

Cada instalación debe usar un secreto independiente. Los providers deben:

- validar firma;
- resolver tenant local desde credenciales/configuración;
- rechazar tools no permitidos;
- aplicar idempotencia en acciones de escritura;
- no confiar en IDs de tenant enviados por texto libre;
- registrar auditoría.
