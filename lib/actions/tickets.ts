'use server'

import { requireITUser, requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import type { TicketStatus } from '@/lib/db/schema'
import {
  ticketAssignmentHistory,
  ticketComments,
  tickets,
  ticketStatusHistory,
} from '@/lib/db/schema'
import {
  createTicketSchema,
  type CreateTicketInput,
} from '@/lib/validations/ticket'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

type CreateTicketResult =
  | { ok: true; ticketId: string }
  | {
      ok: false
      message: string
      fieldErrors?: Record<string, string[] | undefined>
    }

export async function createTicket(
  input: CreateTicketInput,
): Promise<CreateTicketResult> {
  const user = await requireUser()

  const parsed = createTicketSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      message: 'Datos inválidos',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const data = parsed.data

  try {
    const [newTicket] = await db
      .insert(tickets)
      .values({
        title: data.title,
        description: data.description,
        priority: data.priority,
        category: data.category,
        createdById: user.id,
      })
      .returning({ id: tickets.id })

    try {
      await db.insert(ticketStatusHistory).values({
        ticketId: newTicket.id,
        changedById: user.id,
        fromStatus: null,
        toStatus: 'open',
      })
    } catch (historyErr) {
      console.error(
        'No se pudo registrar el historial inicial del ticket:',
        historyErr,
      )
    }

    // 5. TODO: notificar a IT por email
    // await notifyNewTicket({ ticketId: newTicket.id, createdBy: user })

    // 6. Invalidar las páginas que listan tickets
    revalidatePath('/tickets')
    revalidatePath('/tickets/all')

    return { ok: true, ticketId: newTicket.id }
  } catch (err) {
    console.error('Error creando ticket:', err)
    return {
      ok: false,
      message: 'No se pudo crear el ticket. Inténtalo de nuevo.',
    }
  }
}

export async function addComment(input: { ticketId: string; body: string }) {
  const user = await requireUser()

  // Validación combinada (body del usuario + ticketId que controlamos)
  const parsed = z
    .object({
      ticketId: z.string().uuid(),
      body: z.string().trim().min(1).max(2000),
    })
    .safeParse(input)

  if (!parsed.success) {
    return {
      ok: false as const,
      message: 'Datos inválidos',
    }
  }

  const { ticketId, body } = parsed.data

  // Verificar que el usuario puede comentar (misma regla que canView)
  const [ticket] = await db
    .select({
      createdById: tickets.createdById,
      assignedToId: tickets.assignedToId,
    })
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1)

  if (!ticket) {
    return { ok: false as const, message: 'Ticket no encontrado' }
  }

  const canComment =
    user.role === 'it' ||
    ticket.createdById === user.id ||
    ticket.assignedToId === user.id

  if (!canComment) {
    return { ok: false as const, message: 'No tienes permiso para comentar' }
  }

  try {
    await db.insert(ticketComments).values({
      ticketId,
      authorId: user.id,
      body,
    })

    // TODO: notificar por email (al creador si comenta IT, a IT si comenta usuario)

    return { ok: true as const }
  } catch (err) {
    console.error('Error agregando comentario:', err)
    return {
      ok: false as const,
      message: 'No se pudo agregar el comentario',
    }
  }
}

export async function updateTicketDetails(input: {
  ticketId: string
  status?: TicketStatus
  assignedToId?: string | null
}) {
  const user = await requireITUser()

  const { ticketId, status: newStatus, assignedToId: newAssignedToId } = input

  // Estado actual del ticket
  const [current] = await db
    .select({
      status: tickets.status,
      assignedToId: tickets.assignedToId,
      closedAt: tickets.closedAt,
    })
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1)

  if (!current) {
    return { ok: false as const, message: 'Ticket no encontrado' }
  }

  if (current.closedAt) {
    return {
      ok: false as const,
      message: 'No se puede editar un ticket cerrado',
    }
  }

  // Detectar qué cambió
  const statusChanged = newStatus !== undefined && newStatus !== current.status

  const assignmentChanged =
    newAssignedToId !== undefined && newAssignedToId !== current.assignedToId

  if (!statusChanged && !assignmentChanged) {
    return { ok: true as const } // Nada cambió
  }

  // Construir el update del ticket
  const updates: Partial<{
    status: TicketStatus
    assignedToId: string | null
    resolvedAt: Date | null
    closedAt: Date | null
  }> = {}

  if (statusChanged) {
    updates.status = newStatus!
    if (newStatus === 'resolved') updates.resolvedAt = new Date()
    if (newStatus === 'closed') updates.closedAt = new Date()
  }

  if (assignmentChanged) {
    updates.assignedToId = newAssignedToId ?? null
  }

  try {
    // Actualizar el ticket
    await db.update(tickets).set(updates).where(eq(tickets.id, ticketId))

    // Registrar historial de estado (best-effort)
    if (statusChanged) {
      try {
        await db.insert(ticketStatusHistory).values({
          ticketId,
          changedById: user.id,
          fromStatus: current.status,
          toStatus: newStatus!,
        })
      } catch (err) {
        console.error('Error al registrar historial de estado:', err)
      }
    }

    // Registrar historial de asignación (best-effort)
    if (assignmentChanged) {
      try {
        await db.insert(ticketAssignmentHistory).values({
          ticketId,
          changedById: user.id,
          fromUserId: current.assignedToId ?? null,
          toUserId: newAssignedToId ?? null,
        })
      } catch (err) {
        console.error('Error al registrar historial de asignación:', err)
      }
    }

    // Revalidar listas (no el detalle — eso lo hace router.refresh() en el cliente)
    revalidatePath('/tickets')
    revalidatePath('/tickets/all')

    return { ok: true as const }
  } catch (err) {
    console.error('Error al actualizar ticket:', err)
    return { ok: false as const, message: 'No se pudo actualizar el ticket' }
  }
}

export async function deleteTicket(ticketId: string) {
  await requireITUser()

  const [ticket] = await db
    .select({ id: tickets.id, closedAt: tickets.closedAt })
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1)

  if (!ticket) return { ok: false as const, message: 'Ticket no encontrado' }

  try {
    await db.delete(tickets).where(eq(tickets.id, ticketId))

    revalidatePath('/tickets')
    revalidatePath('/tickets/all')

    return { ok: true as const }
  } catch (err) {
    console.error('Error al eliminar ticket:', err)
    return { ok: false as const, message: 'No se pudo eliminar el ticket' }
  }
}
