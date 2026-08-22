# Agente administrativo de Faby Show (Fase 2 — Telegram)

Esta fase conecta la arquitectura server-side de la Fase 1
(`server/adminActions/*` + `server/lib/supabaseServerClient.js`) con
Telegram. Nada de lo de la Fase 1 se modificó — este documento cubre solo
lo nuevo.

## Arquitectura

```
Telegram
   │  (webhook, con X-Telegram-Bot-Api-Secret-Token)
   ▼
api/telegram.js                    ← Vercel Serverless Function
   │  valida el secreto del webhook
   ▼
server/telegram/adapter.js         ← única pieza que conoce Telegram
   │  message.from.id → isAuthorized()
   │  arma { channel, externalUserId, text, attachment, isAuthorized }
   ▼
server/agent/core.js               ← núcleo del agente (agnóstico de canal)
   │
   ├─ ¿hay confirmación/flujo pendiente para este usuario? ────► lo continúa
   │
   ├─ ¿trae foto/video? ────► server/agent/mediaPlacement.js (sin LLM)
   │
   └─ texto nuevo ────► server/agent/llm.js (Gemini, function calling)
                              │
                              ▼
                    server/agent/actionRegistry.js   ← EL whitelist
                              │
                              ▼
                    server/adminActions/*.js         ← Fase 1, sin tocar
                              │
                              ▼
                    src/services/*.js (createXService) ← Fase 1, sin tocar
                              │
                              ▼
                    server/lib/supabaseServerClient.js (service_role)
                              │
                              ▼
                          Supabase
```

**Desacoplamiento de Telegram** (requisito de compatibilidad futura con
WhatsApp): `server/agent/*` no importa nada de `server/telegram/*`. Un
futuro adaptador de WhatsApp solo necesitaría construir el mismo objeto
`{ channel: 'whatsapp', externalUserId, text, attachment, isAuthorized }`
y llamar a `handleInboundMessage()` — el núcleo, el registro de acciones y
AdminActions no cambiarían en nada. Lo único que también habría que sumar
es una función de autorización para ese canal en
`server/agent/authorization.js`.

## Dónde vive cada responsabilidad

| Archivo | Responsabilidad |
|---|---|
| `api/telegram.js` | Endpoint HTTP del webhook. Valida el secreto, delega, siempre responde 200. |
| `server/telegram/telegramClient.js` | Único módulo que habla HTTP con la Bot API de Telegram. |
| `server/telegram/adapter.js` | Traduce un `update` de Telegram a la forma genérica del agente; resuelve autorización; envía la respuesta. |
| `server/telegram/setWebhook.js` | Script de línea de comandos para registrar el webhook (no es un endpoint). |
| `server/agent/core.js` | Máquina de estados de la conversación: confirmaciones, desambiguación, flujo de fotos/videos, y el camino "texto nuevo → LLM → acción". |
| `server/agent/llm.js` | Llamada a la API de Google Gemini (`@google/genai`) con *function calling*, restringida a las tools del whitelist. Free Tier — sin Anthropic, sin billing de Google Cloud. |
| `server/agent/actionRegistry.js` | **El whitelist**: qué acciones existen, su schema de parámetros para el LLM, y cómo ejecutarlas (siempre vía AdminActions). |
| `server/agent/resolvers.js` | Resuelve texto libre ("María", "Premium") a un registro real, reutilizando los `list*` de AdminActions. |
| `server/agent/mediaPlacement.js` | Flujo de fotos/videos, sin LLM: a dónde van, a qué registro se asocian, descarga y ejecución. |
| `server/agent/conversationStore.js` | Estado conversacional en memoria (confirmaciones / pasos pendientes), con TTL de 10 minutos. |
| `server/agent/authorization.js` | Autorización agnóstica de canal (hoy solo Telegram). |
| `server/agent/logger.js` | Logging estructurado a stdout (Vercel lo captura como logs de la función). |

## Por qué el LLM nunca sube fotos/videos directamente

Subir un archivo requiere sus bytes reales, que el modelo de lenguaje no
tiene manera de producir — solo texto. Por eso las acciones de
"crear+subir" (`uploadHeroImage`, `uploadGaleriaMedia`,
`uploadServicioImage`, `uploadTestimonioFoto`, y los `create*` que
dependen de traer una imagen) **no están en las tools del LLM**: se
resuelven con reglas deterministas en `mediaPlacement.js` en cuanto llega
un mensaje con foto/video. El LLM solo interpreta lenguaje natural puro
(listar, editar, eliminar, aprobar, cambiar precios, etc.).

## Seguridad

- **Secreto del webhook**: `api/telegram.js` compara el header
  `X-Telegram-Bot-Api-Secret-Token` contra `TELEGRAM_WEBHOOK_SECRET` antes
  de procesar nada. Si no coincide, responde `401` sin tocar el agente.
- **Autorización por usuario**: `server/agent/authorization.js` compara
  `message.from.id` (numérico, no falsificable por el usuario) contra
  `ALLOWED_TELEGRAM_USER_IDS`. El username de Telegram nunca se usa como
  mecanismo de seguridad.
- **`service_role` aislado**: vive solo en `server/lib/supabaseServerClient.js`
  (Fase 1), fuera de `src/`. Este proyecto verificó que ningún archivo de
  `src/` la referencia (ver informe de verificación).
- **El LLM no toca Supabase**: solo elige entre las tools del whitelist
  (`actionRegistry.js`) y da sus parámetros. `core.js` vuelve a validar
  que el nombre de la acción exista en el registro antes de ejecutar nada
  — si alguna vez el modelo "alucinara" un nombre de acción, no pasaría de
  ahí.
- **Confirmación obligatoria**: toda acción de escritura (`create`,
  `update`, `delete`, `approve`, `remove*`) pasa primero por una
  confirmación explícita ("sí"/"no"). Las de lectura (`list*`, `getContacto`)
  se ejecutan directo.

## Limitación importante: estado conversacional en memoria

`conversationStore.js` guarda las confirmaciones y los pasos pendientes
**en memoria del proceso**, con una expiración de 10 minutos. En Vercel,
cada invocación del webhook puede caer en una instancia serverless
distinta (especialmente tras un "cold start" o baja actividad), así que
este estado **no está garantizado** entre mensajes.

En la práctica, para una conversación activa (mensajes seguidos en pocos
segundos) esto funciona bien porque Vercel suele reutilizar la misma
instancia. En el peor caso (instancia reciclada), el bot simplemente no
encuentra el contexto pendiente y lo dice explícitamente en vez de
ejecutar algo no confirmado o fallar en silencio — el usuario solo tiene
que repetir el paso.

Se evaluó deliberadamente NO crear una tabla nueva de sesión en Supabase
para esto, seleccionado como el punto de "no sobrediseñar" de esta fase.
Si más adelante se quiere continuidad garantizada, es la única pieza que
habría que cambiar — el resto del agente solo conoce la interfaz
`getPendingState/setPendingState/clearPendingState`, nunca su
implementación.

## Variables de entorno a agregar en Vercel

(Ver también `.env.example` en la raíz del proyecto.)

| Variable | Para qué sirve |
|---|---|
| `SUPABASE_URL` | Ya la tenías de la Fase 1 — URL del proyecto de Supabase, para el cliente server-side. |
| `SUPABASE_SERVICE_ROLE_KEY` | Ya la tenías de la Fase 1 — permite a AdminActions saltarse RLS de forma controlada, server-side únicamente. |
| `TELEGRAM_BOT_TOKEN` | Token que te da @BotFather al crear el bot. Se usa para llamar a la Bot API (enviar mensajes, descargar archivos). |
| `TELEGRAM_WEBHOOK_SECRET` | Cadena secreta que inventas tú (ej. una contraseña larga aleatoria). Protege `/api/telegram` de requests que no vengan realmente de Telegram. |
| `ALLOWED_TELEGRAM_USER_IDS` | IDs numéricos de Telegram autorizados a administrar, separados por coma. Consíguelos escribiéndole a `@userinfobot` desde cada cuenta autorizada. |
| `GEMINI_API_KEY` | API key de Google Gemini — el agente la usa para interpretar lenguaje natural (nunca accede a Supabase). Se consigue gratis en Google AI Studio (aistudio.google.com/apikey). El proyecto usa el Free Tier — no requiere configurar billing en Google Cloud. |

No hace falta ninguna variable nueva con prefijo `VITE_` — el frontend
sigue exactamente igual.

## Configuración manual que debes hacer tú

1. **Crear el bot**: hablar con `@BotFather` en Telegram, `/newbot`, y
   guardar el token que te da (`TELEGRAM_BOT_TOKEN`).
2. **Obtener tu Telegram User ID**: hablar con `@userinfobot`, copiar el
   número (no el username). Repetir por cada persona que vaya a
   administrar por Telegram, y juntarlos separados por coma en
   `ALLOWED_TELEGRAM_USER_IDS`.
3. **Inventar un secreto para el webhook** (`TELEGRAM_WEBHOOK_SECRET`) —
   cualquier cadena larga y aleatoria que solo tú conozcas.
4. **Cargar las 6 variables de la tabla de arriba en Vercel** (Project
   Settings → Environment Variables) y hacer un deploy.
5. **Registrar el webhook**, una sola vez, desde tu máquina (no desde
   Vercel — es un script de línea de comandos a propósito, ver
   `server/telegram/setWebhook.js`):
   ```bash
   TELEGRAM_BOT_TOKEN=xxxx TELEGRAM_WEBHOOK_SECRET=xxxx \
     npm run telegram:webhook:set -- https://tu-dominio.vercel.app/api/telegram
   ```
   Puedes verificar que quedó bien con:
   ```bash
   TELEGRAM_BOT_TOKEN=xxxx npm run telegram:webhook:status
   ```
6. Listo — escríbele al bot desde una cuenta autorizada.

## Límite de tiempo de la función (Vercel)

Se agregó `"functions": { "api/telegram.js": { "maxDuration": 30 } }` a
`vercel.json`, porque una respuesta típica involucra una llamada al LLM
más una o dos idas a Supabase, lo que puede superar el límite por defecto
de 10s de algunos planes. Ajusta ese número según tu plan de Vercel si
hace falta (Hobby y Pro tienen límites distintos).

## Qué NO se implementó (fuera de alcance, a propósito)

- WhatsApp (la arquitectura queda lista, pero no se construyó el
  adaptador — no había forma de probarlo en esta fase).
- Callback buttons / teclados inline de Telegram: las confirmaciones son
  por texto ("sí"/"no"), como en los ejemplos del pedido original.
- Memoria vectorial, RAG, o cualquier "memoria" más allá del estado
  conversacional de 10 minutos descrito arriba.
- Dashboard de administración del propio agente (logs, métricas) — los
  logs viven en Vercel (stdout), no hay UI adicional.
- Tabla de auditoría en Supabase — el logging usa stdout/logs de Vercel,
  no una tabla nueva (ver "Limitación importante" arriba, mismo criterio).
- Reintentos automáticos si Telegram tarda en descargar un archivo grande
  (el límite de la Bot API de Telegram para descargar archivos es 20 MB —
  si un video supera eso, la descarga falla y el bot responde con el
  mensaje de error genérico).

## Troubleshooting: "Faltan las variables de entorno SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"

`server/lib/supabaseServerClient.js` lee estas dos variables directamente
de `process.env` (nombres exactos, sin prefijo `VITE_`, sin runtime Edge).
Si ves este error en los logs de Vercel **aunque las variables estén
configuradas en el proyecto**, el código no es la causa — casi siempre es
una de estas tres cosas, en orden de probabilidad:

1. **Las variables se agregaron/editaron después del último deploy.**
   Vercel no las inyecta retroactivamente en un deployment ya construido
   — hace falta un **redeploy** (Deployments → ⋯ → Redeploy) después de
   guardarlas.
2. **Están configuradas para el Environment equivocado.** En Vercel, cada
   variable se puede scopear a Production / Preview / Development por
   separado. Si el webhook de Telegram quedó apuntando a una URL de
   Preview (o a una URL de deployment específica, tipo
   `proyecto-abc123.vercel.app`, en vez del dominio de Production), esa
   invocación corre con las variables de Preview, no las de Production.
   Verifica con `npm run telegram:webhook:status` a qué URL está
   apuntando el webhook ahora mismo, y confirma que sea tu dominio de
   Production.
3. **Nombre o valor con un typo/espacio.** El log ahora te dice
   exactamente cuál de las dos variables falta (`SUPABASE_URL` y/o
   `SUPABASE_SERVICE_ROLE_KEY`, nunca sus valores) — si el log dice que
   falta solo una, revisa esa variable puntual en Vercel.

Ninguna de estas se puede resolver desde el código: son configuración del
proyecto en Vercel.
