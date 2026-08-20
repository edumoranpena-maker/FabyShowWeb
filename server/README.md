# Arquitectura administrativa server-side (Fase 1)

> Para la Fase 2 (agente de Telegram construido sobre esta base), ver
> [`AGENT.md`](./AGENT.md) en este mismo directorio.

Este directorio es **nuevo** y vive deliberadamente **fuera de `src/`**, para
que Vite nunca pueda incluirlo en el bundle del navegador. Es la mitad
"server" de la arquitectura descrita en la tarea:

```
Admin Web (browser)                    Futuro Agente (Telegram, etc.)
      │                                          │
      ▼                                          ▼
Supabase Browser Client              server/lib/supabaseServerClient.js
(anon key + JWT + RLS)                  (service_role — SOLO server)
      │                                          │
      ▼                                          ▼
src/services/*.js  ◄──── misma lógica ────►  src/services/*.js
      │                                          │
      ▼                                          ▼
              Supabase (misma base de datos)
```

`src/services/*.js` es la única capa que sabe hablar con Supabase. Tanto el
Admin como el futuro agente pasan por ahí — nadie duplica lógica de negocio.

## Qué hay en `server/`

- **`lib/supabaseServerClient.js`** — cliente Supabase con `service_role`,
  creado de forma perezosa a partir de `process.env.SUPABASE_URL` /
  `process.env.SUPABASE_SERVICE_ROLE_KEY` (sin prefijo `VITE_`, para que
  Vite jamás lo exponga al navegador). **Nada lo invoca todavía.**
- **`adminActions/*.js`** — fachada semántica administrativa. Cada función
  (`listHeroSlides`, `createHeroSlide`, `deleteTestimonio`,
  `approveTestimonio`, etc.) delega en el `create*Service(client)`
  correspondiente de `src/services/`, construido con el cliente server.
  **Nada lo invoca todavía** — es lo que en la Fase 2 llamará el agente de
  Telegram.

No hay ningún endpoint HTTP, webhook, ni dependencia de Telegram — eso
pertenece a la siguiente fase, tal como se pidió.

## Validaciones actuales (documentadas, no reescritas)

Hoy todas las validaciones viven **solo en el formulario del Admin**
(`src/admin/components/FormField.jsx` + el array `fields` de cada vista):
son atributos HTML5 (`required`, `min`, `max`) que el navegador aplica antes
de enviar. No hay validación a nivel de servicio ni de base de datos (salvo
una excepción de RLS, ver abajo). Esto significa que **si el futuro agente
llama a `AdminActions` directamente, hoy no hay nada que le impida mandar
datos inválidos** (ej. un testimonio sin `nombre`, un slide con `orden`
negativo).

Resumen por sección (campo → regla actual, solo en el form):

| Sección | Campo | Regla |
|---|---|---|
| Hero | — | ninguna (todos opcionales salvo la imagen, que no es `required` en el form) |
| Galería | `categoria` | `required` |
| Servicios | `titulo` | `required` |
| Paquetes | `nombre`, `duracion`, `precio` | `required` |
| Testimonios | `nombre`, `texto` | `required`; `estrellas` limitado a `min=1 max=5` |
| FAQ | `pregunta`, `respuesta` | `required` |
| Contacto | `direccion`, `horario`, `whatsapp_number` | `required` |

**Excepción ya reforzada en base de datos:** el envío público de reseñas
(`testimoniosService.submitPublico`) fuerza `aprobado=false` en el cliente,
y además la política RLS de `INSERT` para el rol `anon` exige
`aprobado=false` — así que ni siquiera manipulando el cliente se puede
publicar una reseña ya aprobada sin pasar por el Admin.

**Recomendación para la Fase 2** (no implementada aquí, por alcance): mover
estas reglas mínimas (`required`, rangos numéricos) a una validación
compartida dentro de `AdminActions` o de los propios servicios, para que
tanto el Admin como el agente de Telegram queden protegidos por la misma
regla, en el mismo lugar. Se puede hacer de forma 100% compatible con el
Admin actual (el form seguiría validando en el navegador como hoy; la capa
compartida sería una revalidación adicional, no un reemplazo visual).

## Eliminaciones: comportamiento actual vs. futuro

**Hoy**, `SectionCrudView.handleDelete()` (Admin) llama a
`service.remove(id)`, que **solo borra la fila de la tabla**. El archivo de
Storage asociado (`image_url`, `src`, `imagen_url`, `foto_url`) **no se
borra** — queda huérfano en el bucket. Este comportamiento **no se tocó**
en esta fase (regla de "no romper el Admin").

**En `AdminActions`**, las funciones de borrado (`deleteHeroSlide`,
`deleteGaleriaItem`, `deleteServicio`, `deleteTestimonio`) sí implementan el
comportamiento correcto para el futuro agente:

1. Leen el registro (`getById`) para obtener la URL pública del archivo.
2. Convierten esa URL pública a la ruta interna de Storage con
   `extractStoragePathFromPublicUrl(url, bucket)` (nuevo helper en
   `src/services/contentService.js`).
3. Si se pudo determinar la ruta, borran el archivo del bucket
   (**best-effort**: si falla, se registra el error con `console.error`
   pero no se bloquea el borrado de la fila — preferimos una fila sin
   archivo huérfano hasta perder ambos por un error de red).
4. Borran la fila.

`Paquetes` y `FAQ` no tienen campos de archivo, así que su borrado es un
`remove(id)` simple.

**Riesgo a revisar:** `extractStoragePathFromPublicUrl` asume el formato
estándar de `getPublicUrl()` de Supabase
(`/storage/v1/object/public/<bucket>/<path>`). Si en el futuro se sirven
estos buckets detrás de un dominio/CDN custom, este helper dejaría de
reconocer la ruta y el borrado de Storage se saltaría silenciosamente (la
fila igual se borraría). No es un problema hoy porque las URLs son las que
genera Supabase directamente.

## Buckets y Storage

Sin cambios: `faby_hero`, `faby_galeria`, `faby_servicios`,
`faby_testimonios`. No se crearon buckets nuevos ni se cambió la
estructura interna de Storage.

`uploadContentFile()` y los métodos `upload*`/`create*Service(...).upload*`
ya aceptaban (y siguen aceptando) cualquier tipo que Supabase Storage sepa
subir: `File` (navegador), y también `Blob`/`Buffer`/`Uint8Array` (Node) —
no hubo que cambiar esa parte. Lo único que se generalizó fue el cálculo
del **nombre** del archivo (antes dependía de `file.name`, que un
`Buffer` descargado de Telegram no va a tener): ahora
`resolveFileName(file, explicitName)` en `src/services/contentService.js`
usa `file.name` si existe, o el `explicitName` que se le pase, o un nombre
de respaldo. El comportamiento desde el navegador es idéntico al de antes.

## Qué falta para Telegram (Fase 2 — explícitamente fuera de esta fase)

- `/api/telegram` (webhook)
- Configuración de BotFather / `TELEGRAM_BOT_TOKEN`
- Descarga de archivos desde la API de Telegram → convertirlos a
  `Buffer`/`Blob` → pasarlos a `uploadHeroImage(buffer, nombreDelArchivo)`
  (la firma ya está preparada para esto)
- Agente / IA / procesamiento de lenguaje natural
- Autenticación del lado de Telegram (quién puede administrar vía chat)
- La validación compartida descrita arriba, si se quiere evitar que el
  agente pueda mandar datos inválidos
