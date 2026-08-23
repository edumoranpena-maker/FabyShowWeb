// ============================================================================
// Registro de acciones administrativas — EL whitelist.
//
// Esta es la única fuente de verdad de qué puede hacer el agente. Sirve
// para dos cosas a la vez:
//
//   1. Generar las "tools" que se le ofrecen al LLM (server/agent/llm.js),
//      para que solo pueda elegir entre estas — nunca inventar una acción
//      ni ejecutar SQL.
//   2. Ejecutar la acción real, SIEMPRE delegando en server/adminActions/*
//      (Fase 1) — nunca hay lógica de Supabase acá, solo orquestación:
//      resolver el "match" de texto libre a un id real, y llamar al
//      AdminAction correspondiente.
//
// Las acciones de subida de archivos (crear+subir imagen/video) NO están
// acá: las maneja server/agent/mediaPlacement.js de forma determinista
// (sin LLM), porque requieren bytes reales que el modelo no tiene forma de
// producir. Ver AGENT.md para el detalle de esta separación.
//
// `requiresConfirmation: true` es lo único que decide si una escritura pide
// confirmación antes de ejecutarse — lo evalúa el núcleo (core.js), no cada
// acción individualmente. Por defecto (sin el flag) una escritura con datos
// completos se EJECUTA DIRECTO; solo las que borran contenido o archivos de
// Storage (`delete*`, `remove*Image`, `remove*Media`) lo llevan.
// ============================================================================

import * as AdminActions from '../adminActions/index.js'
import { extractStoragePathFromPublicUrl } from '../../src/services/contentService.js'
import {
  resolveHeroSlide,
  resolveGaleriaItem,
  resolveGaleriaMediaForDeletion,
  resolveServicio,
  resolvePaquete,
  resolveTestimonio,
  resolveFaq,
} from './resolvers.js'
import {
  describeHeroSlide,
  describeGaleriaItem,
  describeGaleriaMedia,
  describeServicio,
  describePaquete,
  describeTestimonio,
  describeFaq,
  formatList,
} from './formatters.js'

const matchProp = (desc) => ({ type: 'string', description: desc })

export const actionRegistry = {
  // -------------------------------------------------------------- Hero --
  listHeroSlides: {
    kind: 'read',
    llmTool: {
      name: 'listHeroSlides',
      description: 'Lista todos los slides (fotos) del carrusel del Hero, con su orden y visibilidad.',
      input_schema: { type: 'object', properties: {}, additionalProperties: false },
    },
    run: async () => AdminActions.listHeroSlides(),
    formatResult: (items) => formatList('Slides del Hero', items, describeHeroSlide),
  },

  updateHeroSlide: {
    kind: 'write',
    section: 'hero',
    llmTool: {
      name: 'updateHeroSlide',
      description: 'Cambia el orden o la visibilidad de un slide existente del Hero.',
      input_schema: {
        type: 'object',
        properties: {
          match: matchProp('Cómo identificar el slide: "la última", "la primera", o su número de orden.'),
          values: {
            type: 'object',
            properties: { orden: { type: 'number' }, activo: { type: 'boolean' } },
            additionalProperties: false,
          },
        },
        required: ['match', 'values'],
      },
    },
    resolve: (params) => resolveHeroSlide(params.match),
    describeTarget: describeHeroSlide,
    run: async (record, params) => AdminActions.updateHeroSlide(record.id, params.values),
    successMessage: () => '✅ Slide del Hero actualizado.',
  },

  deleteHeroSlide: {
    kind: 'write',
    requiresConfirmation: true, // destructiva: borra el registro y/o el archivo de Storage
    section: 'hero',
    llmTool: {
      name: 'deleteHeroSlide',
      description: 'Elimina un slide del Hero (borra la foto y el registro).',
      input_schema: {
        type: 'object',
        properties: { match: matchProp('Cómo identificar el slide: "la última", "la primera", o su número de orden.') },
        required: ['match'],
      },
    },
    resolve: (params) => resolveHeroSlide(params.match),
    describeTarget: describeHeroSlide,
    run: async (record) => AdminActions.deleteHeroSlide(record.id),
    successMessage: () => '✅ Slide del Hero eliminado.',
  },

  removeHeroImage: {
    kind: 'write',
    requiresConfirmation: true, // destructiva: borra el registro y/o el archivo de Storage
    section: 'hero',
    llmTool: {
      name: 'removeHeroImage',
      description:
        'Elimina SOLO el archivo de imagen de Storage de un slide del Hero, sin borrar el registro. Poco común — úsalo solo si el usuario lo pide explícitamente distinto de "eliminar el slide".',
      input_schema: {
        type: 'object',
        properties: { match: matchProp('Cómo identificar el slide.') },
        required: ['match'],
      },
    },
    resolve: (params) => resolveHeroSlide(params.match),
    describeTarget: describeHeroSlide,
    run: async (record) => {
      const path = extractStoragePathFromPublicUrl(record.image_url, 'faby_hero')
      if (!path) throw new Error('No se pudo determinar la ruta del archivo en Storage.')
      return AdminActions.removeHeroImage(path)
    },
    successMessage: () => '✅ Imagen eliminada del bucket del Hero.',
  },

  // ----------------------------------------------------------- Galería --
  listGaleriaItems: {
    kind: 'read',
    llmTool: {
      name: 'listGaleriaItems',
      description: 'Lista todos los elementos (fotos y videos) de la Galería.',
      input_schema: { type: 'object', properties: {}, additionalProperties: false },
    },
    run: async () => AdminActions.listGaleriaItems(),
    formatResult: (items) => formatList('Elementos de la Galería', items, describeGaleriaItem),
  },

  updateGaleriaItem: {
    kind: 'write',
    section: 'galeria',
    llmTool: {
      name: 'updateGaleriaItem',
      description: 'Actualiza un elemento existente de la Galería (categoría, tamaño en la grilla, orden, visibilidad).',
      input_schema: {
        type: 'object',
        properties: {
          match: matchProp('Categoría del elemento a modificar, ej. "Animación".'),
          values: {
            type: 'object',
            properties: {
              categoria: { type: 'string' },
              alto: { type: 'string', enum: ['medio', 'alto'] },
              orden: { type: 'number' },
              activo: { type: 'boolean' },
            },
            additionalProperties: false,
          },
        },
        required: ['match', 'values'],
      },
    },
    resolve: (params) => resolveGaleriaItem(params.match),
    describeTarget: describeGaleriaItem,
    run: async (record, params) => AdminActions.updateGaleriaItem(record.id, params.values),
    successMessage: () => '✅ Elemento de la Galería actualizado.',
  },

  deleteGaleriaItem: {
    kind: 'write',
    requiresConfirmation: true, // destructiva: borra el registro y/o el archivo de Storage
    section: 'galeria',
    // Campo usado por core.js para re-resolver la elección del usuario
    // cuando hay varias coincidencias ("2", "la primera", o el alias
    // exacto) — acá es "alias" en vez de "categoria" porque este flujo
    // busca por identificación humana, no por categoría (ver resolvers.js).
    disambiguationField: 'alias',
    llmTool: {
      name: 'deleteGaleriaItem',
      description:
        'Elimina una foto o video de la Galería. El usuario puede identificarla por su alias ("Piñata Peppa Pig 23-08"), por su descripción/contenido ("la de Spider-Man"), por categoría, o pidiendo "la última foto/video que envié".',
      input_schema: {
        type: 'object',
        properties: {
          match: matchProp(
            'Cómo identificar la foto/video: su alias, una descripción de lo que muestra, su categoría, o "la última foto/video que envié".'
          ),
        },
        required: ['match'],
      },
    },
    resolve: (params, context) => resolveGaleriaMediaForDeletion(params.match, context),
    describeTarget: describeGaleriaMedia,
    run: async (record) => AdminActions.deleteGaleriaItem(record.id),
    successMessage: () => '✅ Elemento de la Galería eliminado.',
  },

  removeGaleriaMedia: {
    kind: 'write',
    requiresConfirmation: true, // destructiva: borra el registro y/o el archivo de Storage
    section: 'galeria',
    llmTool: {
      name: 'removeGaleriaMedia',
      description:
        'Elimina SOLO el archivo (foto/video) de Storage de un elemento de la Galería, sin borrar el registro. Poco común.',
      input_schema: {
        type: 'object',
        properties: { match: matchProp('Categoría del elemento.') },
        required: ['match'],
      },
    },
    resolve: (params) => resolveGaleriaItem(params.match),
    describeTarget: describeGaleriaItem,
    run: async (record) => {
      const path = extractStoragePathFromPublicUrl(record.src, 'faby_galeria')
      if (!path) throw new Error('No se pudo determinar la ruta del archivo en Storage.')
      return AdminActions.removeGaleriaMedia(path)
    },
    successMessage: () => '✅ Archivo eliminado del bucket de la Galería.',
  },

  // ---------------------------------------------------------- Servicios --
  listServicios: {
    kind: 'read',
    llmTool: {
      name: 'listServicios',
      description: 'Lista todas las tarjetas de servicios ofrecidos por Faby Show.',
      input_schema: { type: 'object', properties: {}, additionalProperties: false },
    },
    run: async () => AdminActions.listServicios(),
    formatResult: (items) => formatList('Servicios', items, describeServicio),
  },

  createServicio: {
    kind: 'write',
    section: 'servicios',
    llmTool: {
      name: 'createServicio',
      description: 'Crea una nueva tarjeta de servicio (sin foto — la foto se agrega enviándola por Telegram).',
      input_schema: {
        type: 'object',
        properties: {
          values: {
            type: 'object',
            properties: {
              titulo: { type: 'string' },
              orden: { type: 'number' },
              activo: { type: 'boolean' },
            },
            required: ['titulo'],
            additionalProperties: false,
          },
        },
        required: ['values'],
      },
    },
    run: async (_record, params) => AdminActions.createServicio(params.values),
    successMessage: (data) => `✅ Servicio "${data.titulo}" creado.`,
  },

  updateServicio: {
    kind: 'write',
    section: 'servicios',
    llmTool: {
      name: 'updateServicio',
      description: 'Actualiza el nombre, orden o visibilidad de un servicio existente.',
      input_schema: {
        type: 'object',
        properties: {
          match: matchProp('Nombre (o parte del nombre) del servicio, ej. "Animación".'),
          values: {
            type: 'object',
            properties: { titulo: { type: 'string' }, orden: { type: 'number' }, activo: { type: 'boolean' } },
            additionalProperties: false,
          },
        },
        required: ['match', 'values'],
      },
    },
    resolve: (params) => resolveServicio(params.match),
    describeTarget: describeServicio,
    run: async (record, params) => AdminActions.updateServicio(record.id, params.values),
    successMessage: () => '✅ Servicio actualizado.',
  },

  deleteServicio: {
    kind: 'write',
    requiresConfirmation: true, // destructiva: borra el registro y/o el archivo de Storage
    section: 'servicios',
    llmTool: {
      name: 'deleteServicio',
      description: 'Elimina un servicio.',
      input_schema: {
        type: 'object',
        properties: { match: matchProp('Nombre (o parte del nombre) del servicio.') },
        required: ['match'],
      },
    },
    resolve: (params) => resolveServicio(params.match),
    describeTarget: describeServicio,
    run: async (record) => AdminActions.deleteServicio(record.id),
    successMessage: () => '✅ Servicio eliminado.',
  },

  // ----------------------------------------------------------- Paquetes --
  listPaquetes: {
    kind: 'read',
    llmTool: {
      name: 'listPaquetes',
      description: 'Lista todos los paquetes/planes con su precio.',
      input_schema: { type: 'object', properties: {}, additionalProperties: false },
    },
    run: async () => AdminActions.listPaquetes(),
    formatResult: (items) => formatList('Paquetes', items, describePaquete),
  },

  createPaquete: {
    kind: 'write',
    section: 'paquetes',
    llmTool: {
      name: 'createPaquete',
      description: 'Crea un paquete/plan nuevo.',
      input_schema: {
        type: 'object',
        properties: {
          values: {
            type: 'object',
            properties: {
              nombre: { type: 'string' },
              duracion: { type: 'string', description: 'Ej. "2.5 horas".' },
              precio: { type: 'string', description: 'Ej. "Desde S/ 650".' },
              incluye: { type: 'array', items: { type: 'string' } },
              destacado: { type: 'boolean' },
              orden: { type: 'number' },
              activo: { type: 'boolean' },
            },
            required: ['nombre', 'duracion', 'precio'],
            additionalProperties: false,
          },
        },
        required: ['values'],
      },
    },
    run: async (_record, params) => AdminActions.createPaquete(params.values),
    successMessage: (data) => `✅ Paquete "${data.nombre}" creado.`,
  },

  updatePaquete: {
    kind: 'write',
    section: 'paquetes',
    llmTool: {
      name: 'updatePaquete',
      description: 'Actualiza un paquete/plan existente (ej. cambiar el precio, la duración, o qué incluye).',
      input_schema: {
        type: 'object',
        properties: {
          match: matchProp('Nombre (o parte del nombre) del paquete, ej. "Premium".'),
          values: {
            type: 'object',
            properties: {
              nombre: { type: 'string' },
              duracion: { type: 'string' },
              precio: { type: 'string', description: 'Ej. "Desde S/ 700".' },
              incluye: { type: 'array', items: { type: 'string' } },
              destacado: { type: 'boolean' },
              orden: { type: 'number' },
              activo: { type: 'boolean' },
            },
            additionalProperties: false,
          },
        },
        required: ['match', 'values'],
      },
    },
    resolve: (params) => resolvePaquete(params.match),
    describeTarget: describePaquete,
    run: async (record, params) => AdminActions.updatePaquete(record.id, params.values),
    successMessage: () => '✅ Paquete actualizado.',
  },

  deletePaquete: {
    kind: 'write',
    requiresConfirmation: true, // destructiva: borra el registro y/o el archivo de Storage
    section: 'paquetes',
    llmTool: {
      name: 'deletePaquete',
      description: 'Elimina un paquete/plan.',
      input_schema: {
        type: 'object',
        properties: { match: matchProp('Nombre (o parte del nombre) del paquete.') },
        required: ['match'],
      },
    },
    resolve: (params) => resolvePaquete(params.match),
    describeTarget: describePaquete,
    run: async (record) => AdminActions.deletePaquete(record.id),
    successMessage: () => '✅ Paquete eliminado.',
  },

  // -------------------------------------------------------- Testimonios --
  listTestimonios: {
    kind: 'read',
    llmTool: {
      name: 'listTestimonios',
      description: 'Lista todos los testimonios (aprobados y pendientes).',
      input_schema: { type: 'object', properties: {}, additionalProperties: false },
    },
    run: async () => AdminActions.listTestimonios(),
    formatResult: (items) => formatList('Testimonios', items, describeTestimonio),
  },

  listPendingTestimonios: {
    kind: 'read',
    llmTool: {
      name: 'listPendingTestimonios',
      description: 'Lista solo los testimonios pendientes de aprobación (los que llegaron del sitio público y todavía no se muestran).',
      input_schema: { type: 'object', properties: {}, additionalProperties: false },
    },
    run: async () => AdminActions.listPendingTestimonios(),
    formatResult: (items) => formatList('Testimonios pendientes', items, describeTestimonio),
  },

  createTestimonio: {
    kind: 'write',
    section: 'testimonios',
    llmTool: {
      name: 'createTestimonio',
      description: 'Crea un testimonio nuevo escrito directamente por el administrador (sin foto — la foto se agrega enviándola por Telegram).',
      input_schema: {
        type: 'object',
        properties: {
          values: {
            type: 'object',
            properties: {
              nombre: { type: 'string' },
              evento: { type: 'string' },
              texto: { type: 'string' },
              estrellas: { type: 'number', minimum: 1, maximum: 5 },
              aprobado: { type: 'boolean' },
              orden: { type: 'number' },
            },
            required: ['nombre', 'texto'],
            additionalProperties: false,
          },
        },
        required: ['values'],
      },
    },
    run: async (_record, params) => AdminActions.createTestimonio(params.values),
    successMessage: (data) => `✅ Testimonio de ${data.nombre} creado.`,
  },

  updateTestimonio: {
    kind: 'write',
    section: 'testimonios',
    llmTool: {
      name: 'updateTestimonio',
      description: 'Edita un testimonio existente (texto, evento, estrellas, aprobado, orden).',
      input_schema: {
        type: 'object',
        properties: {
          match: matchProp('Nombre de la persona del testimonio, ej. "María".'),
          values: {
            type: 'object',
            properties: {
              nombre: { type: 'string' },
              evento: { type: 'string' },
              texto: { type: 'string' },
              estrellas: { type: 'number', minimum: 1, maximum: 5 },
              aprobado: { type: 'boolean' },
              orden: { type: 'number' },
            },
            additionalProperties: false,
          },
        },
        required: ['match', 'values'],
      },
    },
    resolve: (params) => resolveTestimonio(params.match),
    describeTarget: describeTestimonio,
    run: async (record, params) => AdminActions.updateTestimonio(record.id, params.values),
    successMessage: () => '✅ Testimonio actualizado.',
  },

  deleteTestimonio: {
    kind: 'write',
    requiresConfirmation: true, // destructiva: borra el registro y/o el archivo de Storage
    section: 'testimonios',
    llmTool: {
      name: 'deleteTestimonio',
      description: 'Elimina un testimonio.',
      input_schema: {
        type: 'object',
        properties: { match: matchProp('Nombre de la persona del testimonio.') },
        required: ['match'],
      },
    },
    resolve: (params) => resolveTestimonio(params.match),
    describeTarget: describeTestimonio,
    run: async (record) => AdminActions.deleteTestimonio(record.id),
    successMessage: () => '✅ Testimonio eliminado.',
  },

  approveTestimonio: {
    kind: 'write',
    section: 'testimonios',
    llmTool: {
      name: 'approveTestimonio',
      description: 'Aprueba un testimonio pendiente para que empiece a mostrarse en el sitio público.',
      input_schema: {
        type: 'object',
        properties: { match: matchProp('Nombre de la persona del testimonio pendiente, ej. "María".') },
        required: ['match'],
      },
    },
    resolve: (params) => resolveTestimonio(params.match, { pendingOnly: true }),
    describeTarget: describeTestimonio,
    run: async (record) => AdminActions.approveTestimonio(record.id),
    successMessage: (_data, record) => `✅ Testimonio de ${record.nombre} aprobado.`,
  },

  // -------------------------------------------------------------- FAQ --
  listFaqs: {
    kind: 'read',
    llmTool: {
      name: 'listFaqs',
      description: 'Lista todas las preguntas frecuentes.',
      input_schema: { type: 'object', properties: {}, additionalProperties: false },
    },
    run: async () => AdminActions.listFaqs(),
    formatResult: (items) => formatList('Preguntas frecuentes', items, describeFaq),
  },

  createFaq: {
    kind: 'write',
    section: 'faq',
    llmTool: {
      name: 'createFaq',
      description: 'Crea una nueva pregunta frecuente.',
      input_schema: {
        type: 'object',
        properties: {
          values: {
            type: 'object',
            properties: {
              pregunta: { type: 'string' },
              respuesta: { type: 'string' },
              orden: { type: 'number' },
              activo: { type: 'boolean' },
            },
            required: ['pregunta', 'respuesta'],
            additionalProperties: false,
          },
        },
        required: ['values'],
      },
    },
    run: async (_record, params) => AdminActions.createFaq(params.values),
    successMessage: () => '✅ Pregunta frecuente creada.',
  },

  updateFaq: {
    kind: 'write',
    section: 'faq',
    llmTool: {
      name: 'updateFaq',
      description: 'Edita una pregunta frecuente existente.',
      input_schema: {
        type: 'object',
        properties: {
          match: matchProp('Texto (o parte) de la pregunta a editar.'),
          values: {
            type: 'object',
            properties: {
              pregunta: { type: 'string' },
              respuesta: { type: 'string' },
              orden: { type: 'number' },
              activo: { type: 'boolean' },
            },
            additionalProperties: false,
          },
        },
        required: ['match', 'values'],
      },
    },
    resolve: (params) => resolveFaq(params.match),
    describeTarget: describeFaq,
    run: async (record, params) => AdminActions.updateFaq(record.id, params.values),
    successMessage: () => '✅ Pregunta frecuente actualizada.',
  },

  deleteFaq: {
    kind: 'write',
    requiresConfirmation: true, // destructiva: borra el registro y/o el archivo de Storage
    section: 'faq',
    llmTool: {
      name: 'deleteFaq',
      description: 'Elimina una pregunta frecuente.',
      input_schema: {
        type: 'object',
        properties: { match: matchProp('Texto (o parte) de la pregunta a eliminar.') },
        required: ['match'],
      },
    },
    resolve: (params) => resolveFaq(params.match),
    describeTarget: describeFaq,
    run: async (record) => AdminActions.deleteFaq(record.id),
    successMessage: () => '✅ Pregunta frecuente eliminada.',
  },

  // --------------------------------------------------------- Contacto --
  getContacto: {
    kind: 'read',
    llmTool: {
      name: 'getContacto',
      description: 'Consulta los datos de contacto actuales (dirección, horario, WhatsApp, redes sociales).',
      input_schema: { type: 'object', properties: {}, additionalProperties: false },
    },
    run: async () => AdminActions.getContacto(),
    formatResult: (c) =>
      `📍 ${c.direccion}\n🕐 ${c.horario}\n📱 WhatsApp: ${c.whatsapp_number}` +
      (c.instagram_url ? `\n📷 Instagram: ${c.instagram_url}` : '') +
      (c.tiktok_url ? `\n🎵 TikTok: ${c.tiktok_url}` : ''),
  },

  updateContacto: {
    kind: 'write',
    section: 'contacto',
    llmTool: {
      name: 'updateContacto',
      description: 'Actualiza los datos de contacto (dirección, horario, WhatsApp, Instagram, TikTok).',
      input_schema: {
        type: 'object',
        properties: {
          values: {
            type: 'object',
            properties: {
              direccion: { type: 'string' },
              horario: { type: 'string' },
              whatsapp_number: { type: 'string' },
              instagram_url: { type: 'string' },
              tiktok_url: { type: 'string' },
            },
            additionalProperties: false,
          },
        },
        required: ['values'],
      },
    },
    run: async (_record, params) => AdminActions.updateContacto(params.values),
    successMessage: () => '✅ Datos de contacto actualizados.',
  },
}

/** Todas las tools que se le ofrecen al LLM (solo acciones basadas en texto). */
export function getLlmTools() {
  return Object.values(actionRegistry).map((entry) => entry.llmTool)
}

export function getActionEntry(name) {
  return actionRegistry[name] ?? null
}
