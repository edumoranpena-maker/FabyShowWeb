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
 * Modelo de Gemini a usar. `gemini-3.6-flash` es el modelo oficial
 * designado para el agente: soporta function calling (necesario para que
 * Gemini elija entre las ~30 tools del whitelist) y tiene suficiente
 * calidad de razonamiento para resolver instrucciones en español.
 *
 * Si en algún momento se necesita otra variante (más barata, más rápida,
 * etc.), bastaría con cambiar esta constante — nada más en el archivo
 * depende del nombre del modelo.
 */
export const GEMINI_MODEL = 'gemini-3.6-flash'

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

// ============================================================================
// Extracción de destino de un caption de foto/video (Objetivo 1 del
// upgrade de identificación de media). Es una llamada de Gemini SEPARADA
// de resolveIntent(): no compite con el whitelist de AdminActions (subir
// no es una AdminAction en sí, la maneja mediaPlacement.js de forma
// determinista) — esto SOLO extrae texto→datos estructurados, reutilizando
// el mismo cliente/modelo/mecanismo de function calling.
// ============================================================================

const MEDIA_PLACEMENT_TOOL = {
  name: 'extractMediaPlacement',
  description: 'Extrae a dónde debe ir una foto/video de Faby Show y sus datos, a partir del texto que acompañó el envío.',
  parametersJsonSchema: {
    type: 'object',
    properties: {
      section: {
        type: 'string',
        enum: ['hero', 'galeria', 'servicios', 'testimonios'],
        description: 'A qué sección va el archivo, si el texto lo dice (ej. "Galería", "Hero", "portada").',
      },
      categoria: { type: 'string', description: 'Categoría de Galería, si el texto la menciona (ej. "Decoración").' },
      servicioNombre: { type: 'string', description: 'Nombre del servicio, si el destino es Servicios y el texto lo menciona.' },
      testimonioNombre: { type: 'string', description: 'Nombre de la persona del testimonio, si el destino es Testimonios y el texto lo menciona.' },
    },
    additionalProperties: false,
  },
}

const MEDIA_PLACEMENT_SYSTEM_PROMPT = `Analiza el texto que un administrador de Faby Show escribió junto con una foto o video que está subiendo. Extrae SOLO los datos que el texto realmente menciona, explícita o claramente. No inventes ni asumas datos que el texto no da — si no menciona un dato, omite esa propiedad por completo.`

/**
 * @param {string} captionText - el texto/caption que acompañó la foto/video
 * @returns {Promise<{ section?: string, categoria?: string, servicioNombre?: string, testimonioNombre?: string }>}
 */
export async function extractMediaPlacementIntent(captionText) {
  const ai = getClient()

  let response
  try {
    response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: captionText }] }],
      config: {
        systemInstruction: MEDIA_PLACEMENT_SYSTEM_PROMPT,
        tools: [{ functionDeclarations: [MEDIA_PLACEMENT_TOOL] }],
        toolConfig: { functionCallingConfig: { mode: 'ANY', allowedFunctionNames: ['extractMediaPlacement'] } },
      },
    })
  } catch (err) {
    throw new Error(`Fallo la extracción de destino del media: ${err?.message ?? err}`)
  }

  const call = (response.functionCalls ?? [])[0]
  return call?.args ?? {}
}

// ============================================================================
// Descripción visual de una foto recién subida (Objetivo 2.3/2.4 del
// upgrade): genera un alias corto + descripción breve analizando la
// imagen con Gemini (multimodal). Reutiliza el mismo cliente/modelo.
// ============================================================================

const DESCRIBE_MEDIA_TOOL = {
  name: 'describeMedia',
  description: 'Describe brevemente el contenido visual de una imagen para un catálogo interno de contenido.',
  parametersJsonSchema: {
    type: 'object',
    properties: {
      alias_base: {
        type: 'string',
        description:
          '2 a 4 palabras en español describiendo el contenido principal de la imagen, SIN fecha (la fecha se agrega aparte). Ej: "Piñata Peppa Pig", "Arco de Globos Frozen", "Decoración Spider-Man".',
      },
      descripcion: {
        type: 'string',
        description: 'Una oración breve (máximo 15 palabras) describiendo la imagen para uso interno del catálogo.',
      },
    },
    required: ['alias_base', 'descripcion'],
    additionalProperties: false,
  },
}

const DESCRIBE_MEDIA_SYSTEM_PROMPT = `Eres un asistente que cataloga fotos para Faby Show, una empresa de shows y decoración para fiestas infantiles. Describe brevemente el contenido visual de la imagen que se te muestra, en español, para que un administrador pueda encontrarla después buscando por texto.`

/**
 * @param {{ imageBase64: string, mimeType: string, categoria?: string, section?: string, captionText?: string }} params
 * @returns {Promise<{ aliasBase: string, descripcion: string }>}
 */
export async function generateMediaDescription({ imageBase64, mimeType, categoria, section, captionText }) {
  const ai = getClient()

  const contextLine = [
    categoria ? `Categoría: ${categoria}.` : null,
    section ? `Sección: ${section}.` : null,
    captionText ? `El usuario escribió al subirla: "${captionText}".` : null,
  ]
    .filter(Boolean)
    .join(' ')

  let response
  try {
    response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: 'user',
          parts: [{ inlineData: { mimeType, data: imageBase64 } }, { text: contextLine || 'Describe esta imagen.' }],
        },
      ],
      config: {
        systemInstruction: DESCRIBE_MEDIA_SYSTEM_PROMPT,
        tools: [{ functionDeclarations: [DESCRIBE_MEDIA_TOOL] }],
        toolConfig: { functionCallingConfig: { mode: 'ANY', allowedFunctionNames: ['describeMedia'] } },
      },
    })
  } catch (err) {
    throw new Error(`Fallo el análisis visual de la imagen: ${err?.message ?? err}`)
  }

  const call = (response.functionCalls ?? [])[0]
  if (!call?.args?.alias_base) {
    throw new Error('Gemini no devolvió una descripción utilizable para esta imagen.')
  }
  return { aliasBase: call.args.alias_base, descripcion: call.args.descripcion ?? '' }
}
