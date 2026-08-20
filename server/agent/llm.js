// ============================================================================
// Resolución de intención en lenguaje natural → acción estructurada.
//
// Usa "tool use" de la API de Anthropic: el modelo recibe SOLO las tools
// generadas desde el whitelist de actionRegistry.js y elige como máximo
// una, con sus parámetros. No tiene acceso a Supabase, no puede ejecutar
// SQL, y no puede inventar una acción que no esté en la lista — y aunque
// lo intentara, core.js vuelve a validar el nombre contra el registro
// antes de ejecutar nada (defensa en profundidad).
//
// Si el mensaje no corresponde a ninguna acción (saludo, pregunta fuera de
// tema, falta un dato obligatorio), el modelo responde en texto plano en
// vez de llamar una tool, y ese texto se reenvía tal cual al usuario.
// ============================================================================

import { getAnthropicApiKey } from '../lib/env.js'
import { getLlmTools } from './actionRegistry.js'

const MODEL = 'claude-haiku-4-5-20251001'
const API_URL = 'https://api.anthropic.com/v1/messages'

const SYSTEM_PROMPT = `Eres el intérprete de intención del agente administrativo de Faby Show (empresa de shows infantiles).

Tu única función es leer el mensaje del administrador y, si describe una acción administrativa, elegir la tool correspondiente y completar sus parámetros con los datos que el usuario dio. Nunca inventes valores que el usuario no mencionó. Si falta un dato obligatorio para completar una tool, NO la llames: responde en texto pidiendo específicamente el dato que falta.

Si el mensaje es una pregunta de lectura ("¿qué...?", "¿cuánto...?", "muéstrame...", "lista..."), usa la tool de lectura (list*/get*) correspondiente.

Si el mensaje no tiene relación con administrar el contenido de Faby Show (saludo, charla casual, pregunta de otro tema), responde brevemente en texto plano, sin llamar ninguna tool, aclarando con amabilidad que solo puedes ayudar a administrar el contenido de Faby Show (Hero, Galería, Servicios, Paquetes, Testimonios, FAQ, Contacto).

Nunca menciones Supabase, bases de datos, SQL, tokens, service_role ni ningún detalle técnico interno — el usuario solo debe ver lenguaje natural sobre su contenido.`

/**
 * @param {string} userText
 * @returns {Promise<{ type: 'tool', name: string, input: object } | { type: 'text', text: string }>}
 */
export async function resolveIntent(userText) {
  const apiKey = getAnthropicApiKey()
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY no está configurada — el agente no puede interpretar lenguaje natural todavía.')
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userText }],
      tools: getLlmTools(),
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Fallo la llamada al modelo (${response.status}): ${body.slice(0, 200)}`)
  }

  const data = await response.json()
  const toolUse = (data.content ?? []).find((block) => block.type === 'tool_use')
  if (toolUse) {
    return { type: 'tool', name: toolUse.name, input: toolUse.input ?? {} }
  }

  const text = (data.content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim()

  return { type: 'text', text: text || 'No entendí bien esa instrucción, ¿puedes reformularla?' }
}
