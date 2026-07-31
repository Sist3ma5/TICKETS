import type {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '@/lib/db/schema'
import {
  AppWindow,
  Boxes,
  CircleHelp,
  Code2,
  Database,
  KeyRound,
  Laptop,
  ShoppingCart,
  Users,
  Wifi,
  type LucideIcon,
} from 'lucide-react'

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Abierto',
  in_progress: 'En progreso',
  waiting_user: 'Esperando usuario',
  resolved: 'Resuelto',
  closed: 'Cerrado',
}

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
}

// Color por prioridad: alta = rojo, media = amarillo, baja = gris.
export const PRIORITY_COLORS: Record<TicketPriority, string> = {
  high: '#ef4444', // rojo
  medium: '#facc15', // amarillo
  low: '#9ca3af', // gris
}

// Color por estado (proceso del ticket).
export const STATUS_COLORS: Record<TicketStatus, string> = {
  open: '#60a5fa', // azul
  in_progress: '#facc15', // amarillo
  waiting_user: '#fb923c', // naranja
  resolved: '#22c55e', // verde
  closed: '#9ca3af', // gris
}

/**
 * Orden en que se muestran las categorías en toda la app
 * (sidebar, formulario, selectores y estadísticas).
 */
export const TICKET_CATEGORIES: TicketCategory[] = [
  'software',
  'hardware',
  'network',
  'access',
  'entorno',
  'zazu',
  'cyscap',
  'goodteam',
  'compras',
  'other',
]

/** Objeto de conteos por categoría inicializado en 0. */
export function emptyCategoryCounts(): Record<TicketCategory, number> {
  return Object.fromEntries(TICKET_CATEGORIES.map((c) => [c, 0])) as Record<
    TicketCategory,
    number
  >
}

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  hardware: 'Hardware',
  software: 'Software',
  network: 'Red',
  access: 'Credenciales',
  entorno: 'Entorno',
  zazu: 'Zazu',
  // La clave interna sigue siendo 'cyscap' (valor del enum en Postgres);
  // aquí se corrige solo el nombre que ve la gente.
  cyscap: 'Syscap',
  goodteam: 'Good Team',
  compras: 'Compras de Equipo',
  other: 'Otro',
}

// Icono por categoría — ayuda al usuario a identificarla de un vistazo
// al crear un ticket y en toda la interfaz.
export const CATEGORY_ICONS: Record<TicketCategory, LucideIcon> = {
  software: Code2, // </>
  hardware: Laptop, // 💻
  network: Wifi, // 🛜
  access: KeyRound, // 🔑 Credenciales
  entorno: Boxes, // 📊
  zazu: AppWindow,
  cyscap: Database,
  goodteam: Users,
  compras: ShoppingCart,
  other: CircleHelp,
}

// Color de acento por categoría (tomado del prototipo).
// Se aplica al icono y al fondo translúcido del chip.
export const CATEGORY_COLORS: Record<TicketCategory, string> = {
  software: '#a78bfa', // violeta
  hardware: '#60a5fa', // azul
  network: '#2dd4bf', // turquesa
  access: '#fbbf24', // ámbar
  entorno: '#fb7185', // rosa
  zazu: '#818cf8', // índigo
  cyscap: '#22d3ee', // cian
  goodteam: '#34d399', // verde
  compras: '#f97316', // naranja
  other: '#8993a5', // gris
}

// Prefijo del folio por categoría. Ej: Hardware #83 → HDW-0083
export const CATEGORY_PREFIXES: Record<TicketCategory, string> = {
  hardware: 'HDW',
  software: 'SFW',
  network: 'RED',
  access: 'CRD', // Credenciales
  entorno: 'ENT',
  zazu: 'ZZU',
  cyscap: 'SYS',
  goodteam: 'GDT',
  compras: 'CMP',
  other: 'OTR',
}

/**
 * Construye el folio legible de un ticket.
 * formatTicketCode('hardware', 83) → 'HDW-0083'
 */
export function formatTicketCode(
  category: TicketCategory,
  ticketNumber: number | null | undefined,
): string {
  const prefix = CATEGORY_PREFIXES[category] ?? 'TKT'
  if (ticketNumber == null) return prefix
  return `${prefix}-${String(ticketNumber).padStart(4, '0')}`
}

export const ROLE_LABELS: Record<'user' | 'it' | 'admin', string> = {
  user: 'Usuario',
  it: 'IT',
  admin: 'Administrador',
}

// ─── Periodos (filtro de mes en Estadísticas) ─────────────────────────────

/** Un mes en formato 'YYYY-MM', que es como viaja en la URL. */
export const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

export function isValidMonth(month: string | undefined | null): boolean {
  return typeof month === 'string' && MONTH_PATTERN.test(month)
}

/**
 * 'Julio de 2026' a partir de '2026-07'.
 *
 * Se fija la zona en UTC para que la etiqueta no se corra un mes cuando el
 * servidor está en una zona negativa: sin esto, '2026-07' renderizado en
 * GMT-6 puede mostrarse como junio.
 */
export function formatMonthLabel(month: string): string {
  if (!isValidMonth(month)) return month

  const [year, m] = month.split('-').map(Number)
  const label = new Intl.DateTimeFormat('es-MX', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, m - 1, 1)))

  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** 'julio-2026' — para nombrar archivos exportados. */
export function monthSlug(month: string): string {
  return formatMonthLabel(month).toLowerCase().replace(/\s+de\s+/, '-')
}

/** El mes en curso, en UTC para que coincida con el corte de la base. */
export function currentMonth(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Suma (o resta) meses a un 'YYYY-MM'. */
export function addMonths(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(year, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/**
 * Todos los meses entre dos extremos, ambos incluidos y sin huecos.
 *
 * Las flechas del selector deben avanzar de uno en uno aunque algún mes no
 * tenga tickets; si solo se listaran los meses con datos, saltarían de junio
 * a agosto y parecería que falta información.
 */
export function monthSequence(from: string, to: string): string[] {
  if (!isValidMonth(from) || !isValidMonth(to) || from > to) return []

  const out: string[] = []
  let cursor = from
  // Tope de seguridad: 10 años, por si llegara una fecha corrupta.
  for (let i = 0; cursor <= to && i < 120; i += 1) {
    out.push(cursor)
    cursor = addMonths(cursor, 1)
  }
  return out
}
