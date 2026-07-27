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
  cyscap: 'Cyscap',
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
  cyscap: 'CYS',
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
