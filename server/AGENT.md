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

## Identificación de media y eliminación por búsqueda (Galería)

Ampliación sobre la Fase 2A: cuando se sube una foto/video a la Galería, además de `src/categoria/tipo/alto/orden/activo` se guarda:

- `telegram_file_id`, `telegram_message_id`, `telegram_user_id` — origen en Telegram.
- `alias` — identificación humana corta generada por Gemini analizando la imagen (ej. "Piñata Peppa Pig 23-08"). Para video, o si el análisis visual falla, se usa un alias de respaldo (categoría/sección + fecha) — **nunca bloquea la subida**.
- `descripcion` — una oración breve, también generada por Gemini (fallback: el caption del usuario, o un texto genérico).

El `id` (uuid) real de Supabase **no cambia de rol** — el alias es solo una forma de referirse al registro en lenguaje natural, nunca reemplaza al id técnico.

Requiere la migración `supabase/migrations/20260821000000_add_media_metadata_to_faby_galeria_items.sql` (aditiva, `ADD COLUMN IF NOT EXISTS`, no toca columnas/datos existentes) — hay que correrla en Supabase antes de que estas columnas existan.

**Subir con todo en un mensaje** (Objetivo 1): el caption que acompaña la foto/video se analiza con Gemini (`extractMediaPlacementIntent` en `llm.js`, function calling — no matching de frase exacta) para extraer destino + categoría/servicio/testimonio de una vez; solo se pregunta lo que falte.

**Eliminar por búsqueda** (Objetivo 2.6-2.9): `deleteGaleriaItem` ahora resuelve con `resolveGaleriaMediaForDeletion` (`resolvers.js`), que reconoce "la última foto/video que envié" (por `telegram_user_id` + `created_at`, no por texto), y si no, busca por alias/descripción/categoría. Nunca elimina sin mostrar primero la(s) foto(s) candidata(s) (`sendPhoto` en `telegramClient.js`) y pedir confirmación explícita — sigue siendo `requiresConfirmation: true`. Con varias coincidencias, el admin puede elegir por número o por nombre, reutilizando el mecanismo de desambiguación ya existente.

**Limitaciones conocidas:**
- El análisis visual (Gemini Vision) es solo para fotos — los videos no se analizan por frames en esta fase, usan un alias de respaldo.
- La fecha del alias (`DD-MM`) se calcula en UTC (hora del servidor de Vercel), no en la zona horaria de Perú — puede diferir en un día cerca de la medianoche.
- Esta identificación (alias/descripción/telegram_*) solo se guarda para Galería — Hero/Servicios/Testimonios no se tocaron (fuera del alcance de esta fase).

## Contexto conversacional unificado (`activeTask` + `recentContext`)

Ampliación arquitectónica: `conversationStore.js` dejó de usar un `Map` en memoria de proceso — ahora persiste en Supabase (tabla `agent_conversation_state`, migración `supabase/migrations/20260822000000_create_agent_conversation_state.sql`). Esto corrige la causa raíz de que el contexto se perdiera entre mensajes en Vercel (dos invocaciones consecutivas pueden caer en instancias serverless distintas — el Map anterior no sobrevivía a eso). Cero variables de entorno nuevas: reutiliza `getServerSupabaseClient()` de la Fase 1.

**`active_task`** — una sola tarea en curso por usuario (mismo concepto que antes, ahora persistido). El flujo de subida de media (`placeMedia`) pasó de 4 tipos de estado separados (`media_awaiting_destination/categoria/target_servicio/target_testimonio`) a **uno solo con slots parciales** (`{slots, missingSlots, lastPrompt}`), que se va completando turno a turno sin perder lo ya conocido. `confirmation`, `disambiguation` y `pending_text_intent` (comandos de texto) mantienen su forma anterior, sin cambios de comportamiento.

**`recent_context`** — concepto nuevo y separado, TTL corto (3 min): cuando se cancela una confirmación destructiva, se conserva la lista de candidatas (no la tarea completa) para poder retomarla ("entonces elimina la 2") sin repetir la búsqueda. Si el siguiente mensaje no se refiere claramente a esas candidatas, se ignora en silencio y el mensaje se procesa como una intención nueva — nunca se fuerza la tarea vieja.

**Gemini en los turnos de seguimiento de media:** antes, después del primer mensaje, el flujo de media era 100% regex (esto causaba el bug de "Galería" interpretado como `listGaleriaItems`). Ahora, cuando el atajo determinista barato (palabra exacta de sección, categoría exacta) no resuelve, se llama a `extractMediaPlacementIntent(text, taskContext)` — la MISMA función acotada que ya se usaba para el caption inicial, nunca `resolveIntent()` con las 28 tools del whitelist — así Gemini interpreta lenguaje natural ("ponla en la galería") sin poder desviarse hacia una acción no relacionada.

**Selección de candidatas en lenguaje natural** ("la de la animadora", "esa no, la otra"): capas deterministas primero (número, ordinal, substring del alias); si ninguna resuelve, Gemini elige uno o más índices **restringidos a las descripciones reales ya mostradas** (`resolveSemanticCandidates` en `llm.js`, vía la capa reutilizable `server/agent/semanticResolve.js`) — nunca puede inventar ni ver un id real.

**Limitación conocida:** cada mensaje con `recentContext` activo dispara, en el peor caso, una llamada extra a Gemini para descartar que sea una referencia a las candidatas — aceptado como trade-off dado el TTL corto (3 min) y la baja frecuencia (solo tras cancelar un borrado).

## Resolución semántica generalizada (`semanticResolve.js`)

Ampliación: la resolución semántica (antes solo en el paso de *selección* de candidatos ya mostrados) ahora también actúa en la *búsqueda* inicial — sin duplicar lógica de Gemini por sección. Una sola capa reutilizable:

- **`resolveBySemanticMatch`** (búsqueda inicial, texto → uno o más registros reales): exacto → substring → si no fue inequívoco, Gemini interpreta lenguaje natural (typos, sinónimos, plural/singular, descripciones aproximadas o más largas que el alias/descripción guardados) sobre el universo real de esa entidad. La usan `resolveGaleriaMediaForDeletion`, `resolveGaleriaItem`, `resolveServicio`, `resolvePaquete`, `resolveTestimonio` y `resolveFaq` (`resolvers.js`). Hero se queda 100% determinista — no tiene un campo de texto real para comparar.
- **`selectAmongShownCandidates`** (selección entre candidatos ya numerados/mostrados: desambiguación y `recentContext`) — mismo mecanismo de la fase anterior, movido acá sin cambiar su comportamiento.
- **`filterBySemanticMatch`** (consultas de lectura con muchos resultados posibles, ej. `listGaleriaItems` con `busqueda` libre) — variante permisiva: no exige que el resultado sea único, es de solo lectura así que ser generoso es seguro.

Las tres comparten la misma llamada a Gemini (`resolveSemanticCandidates`, `llm.js`): el modelo solo recibe descripciones de texto ya armadas por el código y solo puede devolver posiciones (1-based) dentro de esa lista — nunca ve ni puede inventar un id. El código valida enteros/rango/duplicados antes de mapear a un registro real.

**Consultas de Galería con filtro:** `listGaleriaItems` ahora acepta `categoria` (una de las 5 reales, normalizada con `normalizeGaleriaCategory`) o `busqueda` (texto libre, vía `filterBySemanticMatch`) — Gemini decide cuál usar según la pregunta, sin necesitar una regex por variante de frase. La respuesta usa `describeGaleriaMedia` (alias real) en vez de la descripción genérica, y adjunta las fotos (`sendPhoto`, cero tokens de Gemini — es Telegram sirviendo URLs ya existentes) cuando el resultado filtrado es acotado (≤8).

**Costo:** cada búsqueda/selección que no resuelve por atajo determinista cuesta 1 llamada extra a Gemini — aceptado como trade-off explícito (prioridad: robustez conversacional sobre ahorro de tokens, según se pidió). Universo acotado a 40 candidatos por llamada como salvaguarda de tamaño de prompt, no como paginación real.
