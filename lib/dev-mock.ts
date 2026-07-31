import 'server-only'

import type {
  ITUser,
  TicketDetails,
  TicketFilters,
  TicketWithUsers,
} from '@/lib/db/queries/tickets'
import { emptyCategoryCounts } from '@/lib/constants'
import type { TicketCategory, TicketStatus, User } from '@/lib/db/schema'

/**
 * ⚠️  SOLO DESARROLLO / TRABAJO VISUAL  ⚠️
 * ---------------------------------------------------------------------------
 * Bypass de autenticación + datos de ejemplo para poder ver y estilar la app
 * SIN base de datos real ni Google OAuth.
 *
 * Se activa con  DEV_BYPASS_AUTH=true  en .env.local  (archivo que NO se sube).
 * Si la variable no está, todo el código de abajo queda inerte.
 *
 * 👉 BORRAR este archivo y sus dos usos (lib/auth.ts y lib/db/queries/tickets.ts)
 *    antes de ir a producción.
 * ---------------------------------------------------------------------------
 */
// Blindaje: el bypass NUNCA se activa en producción, aunque la variable
// estuviera puesta. Solo funciona en desarrollo local.
export const DEV_BYPASS_AUTH =
  process.env.NODE_ENV !== 'production' &&
  process.env.DEV_BYPASS_AUTH === 'true'

// En modo demo, crear un ticket redirige a este detalle de ejemplo.
export const MOCK_CREATED_TICKET_ID = '10000000-0000-0000-0000-000000000001'

// Usuario ficticio "ya logueado".
// Cambia `role` a 'user' | 'it' | 'admin' para probar cada vista.
// 'admin' ve todo (incluida la sección de Administración).
export const MOCK_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Alfredo Santos',
  email: 'alfredo.santos@bailmex.com.mx',
  emailVerified: true,
  image: null,
  role: 'admin',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
}

// ─── Panel de administración ──────────────────────────────────────────────
export interface AdminUser {
  id: string
  name: string
  email: string
  role: 'user' | 'it' | 'admin'
  // Categorías que atiende (solo aplica a IT); los tickets de esas
  // categorías se le asignan automáticamente al crearse.
  categories: TicketCategory[]
}

export const MOCK_ADMIN_USERS: AdminUser[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Alfredo Santos',
    email: 'alfredo.santos@bailmex.com.mx',
    role: 'admin',
    categories: [],
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Freddy Santos',
    email: 'freddy.santos@bailmex.com.mx',
    role: 'it',
    categories: ['software', 'entorno', 'cyscap'],
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Carlos Ruiz',
    email: 'carlos.ruiz@bailmex.com.mx',
    role: 'it',
    categories: ['hardware', 'network', 'access'],
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    name: 'Paty Gómez',
    email: 'paty.gomez@bailmex.com.mx',
    role: 'it',
    categories: ['zazu', 'goodteam', 'compras'],
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    name: 'Mariana López',
    email: 'mariana.lopez@bailmex.com.mx',
    role: 'user',
    categories: [],
  },
  {
    id: '00000000-0000-0000-0000-000000000006',
    name: 'Valeria Carrillo',
    email: 'valeria.carrillo@bailmex.com.mx',
    role: 'user',
    categories: [],
  },
]

// Personas de ejemplo (solo se leen name/email en la UI).
const person = (name: string, email: string) => ({ id: email, name, email })
const IT = person('Demo IT', 'demo@bailmex.com.mx')

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000)

// Lista base de tickets de ejemplo (contexto IT de Bailmex).
const BASE_TICKETS = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    number: 83,
    title: 'No enciende la laptop de recepción',
    description:
      'La laptop de recepción no da señal de encendido. Ya se probó con otro cargador y otra toma de corriente.',
    status: 'open',
    priority: 'high',
    category: 'hardware',
    createdAt: hoursAgo(2),
    createdBy: person('Ana López', 'ana.lopez@bailmex.com.mx'),
    assignedTo: IT,
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    number: 112,
    title: 'Solicito acceso a la carpeta compartida de Contabilidad',
    description:
      'Necesito permisos de lectura/escritura sobre \\\\servidor\\contabilidad para cerrar el mes.',
    status: 'in_progress',
    priority: 'medium',
    category: 'access',
    createdAt: hoursAgo(9),
    createdBy: person('Carlos Ramírez', 'carlos.ramirez@bailmex.com.mx'),
    assignedTo: IT,
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    number: 97,
    title: 'Excel se cierra solo al abrir el reporte mensual',
    description:
      'Al abrir "Reporte_Mensual.xlsx" el Excel se congela y se cierra a los pocos segundos.',
    status: 'waiting_user',
    priority: 'medium',
    category: 'software',
    createdAt: hoursAgo(26),
    createdBy: person('María Fernández', 'maria.fernandez@bailmex.com.mx'),
    assignedTo: IT,
  },
  {
    id: '10000000-0000-0000-0000-000000000004',
    number: 120,
    title: 'Sin internet en el área de almacén',
    description:
      'Se cayó la conexión en todo el almacén desde la mañana. El switch tiene las luces apagadas.',
    status: 'open',
    priority: 'high',
    category: 'network',
    createdAt: hoursAgo(4),
    createdBy: person('Jorge Núñez', 'jorge.nunez@bailmex.com.mx'),
    assignedTo: null,
  },
  {
    id: '10000000-0000-0000-0000-000000000005',
    number: 64,
    title: 'Compra de 2 monitores para el equipo de diseño',
    description:
      'Solicito cotización y compra de 2 monitores 27" para las nuevas estaciones de diseño.',
    status: 'resolved',
    priority: 'low',
    category: 'compras',
    createdAt: hoursAgo(50),
    createdBy: person('Laura Méndez', 'laura.mendez@bailmex.com.mx'),
    assignedTo: IT,
  },
  {
    id: '10000000-0000-0000-0000-000000000007',
    number: 80,
    title: 'Ambiente de pruebas no refleja los últimos cambios',
    description:
      'El entorno de QA sigue mostrando la versión anterior después del último despliegue.',
    status: 'in_progress',
    priority: 'medium',
    category: 'entorno',
    createdAt: hoursAgo(6),
    createdBy: person('Diego Salas', 'diego.salas@bailmex.com.mx'),
    assignedTo: IT,
  },
  {
    id: '10000000-0000-0000-0000-000000000008',
    number: 71,
    title: 'Zazu no deja registrar la salida del turno',
    description:
      'Al marcar salida en Zazu aparece un error y no guarda el registro del turno.',
    status: 'open',
    priority: 'high',
    category: 'zazu',
    createdAt: hoursAgo(3),
    createdBy: person('Karla Ibarra', 'karla.ibarra@bailmex.com.mx'),
    assignedTo: null,
  },
  {
    id: '10000000-0000-0000-0000-000000000009',
    number: 58,
    title: 'Syscap no genera el reporte de pólizas',
    description:
      'Al exportar el reporte mensual de pólizas en Syscap el archivo sale vacío.',
    status: 'waiting_user',
    priority: 'medium',
    category: 'cyscap',
    createdAt: hoursAgo(30),
    createdBy: person('Raúl Vega', 'raul.vega@bailmex.com.mx'),
    assignedTo: IT,
  },
  {
    id: '10000000-0000-0000-0000-000000000006',
    number: 45,
    title: 'Alta de nuevo integrante en Good Team',
    description:
      'Dar de alta a un nuevo colaborador en la plataforma de Good Team y asignar su correo.',
    status: 'closed',
    priority: 'low',
    category: 'goodteam',
    createdAt: hoursAgo(120),
    createdBy: person('Sofía Torres', 'sofia.torres@bailmex.com.mx'),
    assignedTo: IT,
  },
] as const

// Aplica los mismos filtros que la consulta real (menos los de dueño/asignado,
// que ignoramos para que siempre se vean tickets en modo demo).
export function getMockTickets(filters: TicketFilters): TicketWithUsers[] {
  let rows = BASE_TICKETS.filter((t) => {
    if (filters.status && t.status !== filters.status) return false
    if (filters.priority && t.priority !== filters.priority) return false
    if (filters.category && t.category !== filters.category) return false
    if (filters.q && !t.title.toLowerCase().includes(filters.q.toLowerCase()))
      return false
    return true
  })

  rows =
    filters.sort === 'asc'
      ? [...rows].sort((a, b) => +a.createdAt - +b.createdAt)
      : [...rows].sort((a, b) => +b.createdAt - +a.createdAt)

  return rows as unknown as TicketWithUsers[]
}

export function getMockStatusCounts(
  filters: Omit<TicketFilters, 'status' | 'sort'>,
): Record<TicketStatus | 'all', number> {
  const counts: Record<TicketStatus | 'all', number> = {
    all: 0,
    open: 0,
    in_progress: 0,
    waiting_user: 0,
    resolved: 0,
    closed: 0,
  }

  for (const t of BASE_TICKETS) {
    if (filters.priority && t.priority !== filters.priority) continue
    if (filters.category && t.category !== filters.category) continue
    if (filters.q && !t.title.toLowerCase().includes(filters.q.toLowerCase()))
      continue
    counts[t.status] += 1
    counts.all += 1
  }

  return counts
}

// Usuarios para el panel de administración.
export function getMockAdminUsers(): AdminUser[] {
  return MOCK_ADMIN_USERS
}

// Siguiente folio disponible (preview de "ID automático" al crear).
export function getMockNextTicketNumber(): number {
  return Math.max(...BASE_TICKETS.map((t) => t.number)) + 1
}

// Conteo de tickets por categoría (sidebar).
export function getMockCategoryCounts(): Record<TicketCategory, number> {
  const counts = emptyCategoryCounts()

  for (const t of BASE_TICKETS) {
    counts[t.category] += 1
  }

  return counts
}

/**
 * Meses con tickets de ejemplo, del más reciente al más antiguo.
 * Sirve para poder ver el filtro de periodo de Estadísticas sin BD.
 */
export function getMockTicketMonths(): { month: string; total: number }[] {
  const byMonth = new Map<string, number>()

  for (const t of BASE_TICKETS) {
    const key = `${t.createdAt.getFullYear()}-${String(
      t.createdAt.getMonth() + 1,
    ).padStart(2, '0')}`
    byMonth.set(key, (byMonth.get(key) ?? 0) + 1)
  }

  return [...byMonth.entries()]
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => b.month.localeCompare(a.month))
}

// Detalle de un ticket, con comentarios e historial de ejemplo.
export function getMockTicketById(id: string): TicketDetails {
  const base = BASE_TICKETS.find((t) => t.id === id) ?? BASE_TICKETS[0]
  const creator = { ...base.createdBy }
  const assignee = base.assignedTo ? { ...base.assignedTo } : null
  const t0 = base.createdAt.getTime()
  const plusMin = (m: number) => new Date(t0 + m * 60 * 1000)

  return {
    ticket: {
      id,
      number: base.number,
      title: base.title,
      description: base.description,
      status: base.status,
      priority: base.priority,
      category: base.category,
      createdById: creator.id,
      assignedToId: assignee?.id ?? null,
      createdAt: base.createdAt,
      updatedAt: plusMin(90),
      resolvedAt: base.status === 'resolved' ? plusMin(240) : null,
      closedAt: base.status === 'closed' ? plusMin(300) : null,
    },
    creator,
    assignee,
    comments: [
      {
        comment: {
          id: `c1-${id}`,
          ticketId: id,
          authorId: creator.id,
          body: 'Adjunto el contexto del problema. Quedo atento a cualquier duda.',
          createdAt: plusMin(30),
          updatedAt: plusMin(30),
        },
        author: { ...creator, role: 'user' },
      },
      {
        comment: {
          id: `c2-${id}`,
          ticketId: id,
          authorId: IT.id,
          body: 'Gracias por el reporte, ya lo estoy revisando. Te aviso en cuanto tenga novedades.',
          createdAt: plusMin(90),
          updatedAt: plusMin(90),
        },
        author: { ...IT, role: 'it' },
      },
    ],
    statusHistory: [
      {
        entry: {
          id: `s1-${id}`,
          ticketId: id,
          changedById: creator.id,
          fromStatus: null,
          toStatus: 'open',
          note: null,
          changedAt: base.createdAt,
        },
        changedBy: creator,
      },
    ],
    attachments: [
      {
        id: `f1-${id}`,
        fileName: 'conexion-monitor.jpg',
        fileSize: 148_480,
        mimeType: 'image/jpeg',
        url: '#',
      },
    ],
    assignmentHistory: assignee
      ? [
          {
            entry: {
              id: `a1-${id}`,
              ticketId: id,
              changedById: IT.id,
              fromUserId: null,
              toUserId: assignee.id,
              createdAt: plusMin(20),
            },
            changedBy: { ...IT },
            fromUser: null,
            toUser: assignee,
          },
        ]
      : [],
  } as unknown as TicketDetails
}

// Ingenieros de IT para el selector "Atiende".
export function getMockITUsers(): ITUser[] {
  return [
    { id: IT.id, name: IT.name, email: IT.email },
    {
      id: 'jose.hernandez@bailmex.com.mx',
      name: 'José Hernández',
      email: 'jose.hernandez@bailmex.com.mx',
    },
    {
      id: 'paty.gomez@bailmex.com.mx',
      name: 'Paty Gómez',
      email: 'paty.gomez@bailmex.com.mx',
    },
  ]
}
