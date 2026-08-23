// ============================================================================
// Resolución de intención en lenguaje natural → acción estructurada.
//
// Usa function calling de Gemini (@google/genai): el modelo recibe SOLO
// las tools generadas desde el whitelist de actionRegistry.js y elige
// como máximo una, con sus parámetros. No tiene acceso a Supabase, no
// puede ejecutar SQL, y no puede inventar una acción que no esté en la
// lista — y aunque lo intentara, core.js vuelve a validar el nombre
// contra el registro antes de ejecutar nada (defensa en profundidad).
//
// Si el mensaje no corresponde a ninguna acción (saludo, pregunta fuera
// de tema, falta un dato obligatorio), el modelo responde en texto plano
// en vez de llamar una tool, y ese texto se reenvía tal cual al usuario.
//
// PROVEEDOR: Google Gemini (Free Tier), NO Anthropic. La API key sale
// exclusivamente de process.env.GEMINI_API_KEY. No hay fallback a ningún
// otro proveedor: si Gemini no está disponible, el agente responde con un
// error controlado (ver core.js) en vez de gastar en otro proveedor.
//
// Modelo centralizado en GEMINI_MODEL, más abajo, para poder cambiarlo en
// un solo lugar si Google ajusta qué modelo tiene Free Tier.
// ============================================================================

import { GoogleGenAI } from '@google/genai'
import { getGeminiApiKey } from '../lib/env.js'
import { getLlmTools } from './actionRegistry.js'

/**
 * Modelo de Gemini a usar. `gemini-2.5-flash` tiene Free Tier (con límites
 * de requests/minuto y por día — más que suficientes para un bot
 * administrativo de uso interno) y suficiente calidad de razonamiento
 * para elegir bien entre ~30 tools en español.
 *
 * Si en algún momento se necesita más margen de cuota gratuita a cambio
 * de algo menos de calidad, `gemini-2.5-flash-lite` es la alternativa más
 * liviana dentro del mismo Free Tier — bastaría con cambiar esta
 * constante, nada más en el archivo depende del nombre del modelo.
 */
export const GEMINI_MODEL = 'gemini-2.5-flash'

const SYSTEM_PROMPT = `Eres el intérprete de intención del agente administrativo de Faby Show (empresa de shows infantiles).

Tu única función es leer el mensaje del administrador y, si describe una acción administrativa, elegir la función correspondiente y completar sus parámetros con los datos que el usuario dio. Nunca inventes valores que el usuario no mencionó. Si falta un dato obligatorio para completar una función, NO la llames: responde en texto pidiendo específicamente el dato que falta.

Si el mensaje es una pregunta de lectura ("¿qué...?", "¿cuánto...?", "muéstrame...", "lista..."), usa la función de lectura (list*/get*) correspondiente.

Si el mensaje no tiene relación con administrar el contenido de Faby Show (saludo, charla casual, pregunta de otro tema), responde brevemente en texto plano, sin llamar ninguna función, aclarando con amabilidad que solo puedes ayudar a administrar el contenido de Faby Show (Hero, Galería, Servicios, Paquetes, Testimonios, FAQ, Contacto).

Nunca menciones Supabase, bases de datos, SQL, tokens, service_role ni ningún detalle técnico interno — el usuario solo debe ver lenguaje natural sobre su contenido.

CONTEXTO DE TURNO ANTERIOR: si el historial incluye un turno tuyo anterior (una pregunta tuya) y el mensaje nuevo del usuario es corto y parece responderla (ej. contestó solo el dato que le pediste), COMBINA ambos turnos y llama la función correspondiente con todos los datos juntos — no le pidas de nuevo el mismo dato ni trates el mensaje nuevo como aislado. Si en cambio el mensaje nuevo claramente habla de otra cosa, ignora el turno anterior y trata el mensaje como una instrucción nueva e independiente.`

let cachedClient = null

function getClient() {
  if (cachedClient) return cachedClient

  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no está configurada — el agente no puede interpretar lenguaje natural todavía.')
  }

  cachedClient = new GoogleGenAI({ apiKey })
  return cachedClient
}

/** Convierte el whitelist de actionRegistry.js al formato de function declarations de Gemini. */
function buildGeminiTools() {
  const functionDeclarations = getLlmTools().map((tool) => ({
    name: tool.name,
    description: tool.description,
    // `parametersJsonSchema` acepta JSON Schema estándar tal cual —
    // exactamente la misma forma que ya usa actionRegistry.js
    // (type/properties/required), así que no hace falta traducir nada.
    parametersJsonSchema: tool.input_schema,
  }))
  return [{ functionDeclarations }]
}

/**
 * @param {string} userText
 * @param {{ previousUserText: string, previousModelText: string }|null} [context] -
 *   turno anterior (pregunta de Gemini + lo que el usuario respondía) cuando
 *   este mensaje puede estar completando una intención pendiente de texto
 *   (ver conversationStore.js, estado `pending_text_intent` en core.js).
 *   Parámetro opcional — omitirlo reproduce exactamente el comportamiento
 *   anterior de esta función.
 * @returns {Promise<{ type: 'tool', name: string, input: object } | { type: 'text', text: string }>}
 */
export async function resolveIntent(userText, context = null) {
  const ai = getClient()

  const contents = []
  if (context?.previousUserText && context?.previousModelText) {
    contents.push({ role: 'user', parts: [{ text: context.previousUserText }] })
    contents.push({ role: 'model', parts: [{ text: context.previousModelText }] })
  }
  contents.push({ role: 'user', parts: [{ text: userText }] })

  let response
  try {
    response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: buildGeminiTools(),
        toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
      },
    })
  } catch (err) {
    throw new Error(`Fallo la llamada al modelo: ${err?.message ?? err}`)
  }

  const functionCalls = response.functionCalls ?? []
  if (functionCalls.length > 0) {
    const call = functionCalls[0]
    return { type: 'tool', name: call.name, input: call.args ?? {} }
  }

  const text = (response.text ?? '').trim()
  return { type: 'text', text: text || 'No entendí bien esa instrucción, ¿puedes reformularla?' }
}
