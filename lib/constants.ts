import type {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '@/lib/db/schema'

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

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  hardware: 'Hardware',
  software: 'Software',
  network: 'Red',
  access: 'Accesos',
  goodteam: 'Good Team',
  compras: 'Compras de Equipo',
  other: 'Otro',
}

export const ROLE_LABELS = {
  it: 'IT',
  user: 'Usuario',
} as const
