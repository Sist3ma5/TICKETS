'use server'

import {
  saveAttachments,
  validateAttachments,
  type AttachmentInput,
} from '@/lib/attachments'
import { requireITUser, requireUser } from '@/lib/auth'
import { formatTicketCode } from '@/lib/constants'
import { db } from '@/lib/db'
import { getTechnicianForCategory } from '@/lib/db/queries/tickets'
import {
  DEV_BYPASS_AUTH,
  MOCK_CREATED_TICKET_ID,
  getMockNextTicketNumber,
} from '@/lib/dev-mock'
import type {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '@/lib/db/schema'
import {
  ticketAssignmentHistory,
  ticketComments,
  tickets,
  ticketStatusHistory,
  users,
} from '@/lib/db/schema'
import {
  createTicketSchema,
  type CreateTicketInput,
} from '@/lib/validations/ticket'
import { eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { after } from 'next/server'
import {
  notifyAssignment,
  notifyNewComment,
  notifyNewTicket,
  notifyStatusChange,
} from '@/lib/email/notifications'

type CreateTicketResult =
  // El folio va de regreso para poder confirmarle al usuario, con su número
  // real, que el ticket sí quedó registrado.
  | { ok: true; ticketId: string; ticketNumber: number }
  | {
      ok: false
      message: string
      fieldErrors?: Record<string, string[] | undefined>
    }

export async function createTicket(
  input: CreateTicketInput & { attachments?: AttachmentInput[] },
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
  const attachments = input.attachments ?? []
  const attErr = validateAttachments(attachments)
  if (attErr) return { ok: false, message: attErr }

  // ⚠️ Solo desarrollo/visual: no hay BD, simulamos la creación.
  if (DEV_BYPASS_AUTH) {
    return {
      ok: true,
      ticketId: MOCK_CREATED_TICKET_ID,
      ticketNumber: getMockNextTicketNumber(),
    }
  }

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
      .returning({ id: tickets.id, number: tickets.number })

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

    // Adjuntos del ticket (best-effort: el ticket ya existe).
    try {
      await saveAttachments({
        ticketId: newTicket.id,
        commentId: null,
        uploadedById: user.id,
        items: attachments,
      })
    } catch (attErr2) {
      console.error('No se pudieron guardar los adjuntos del ticket:', attErr2)
    }

    // Enrutamiento por categoría: se asigna al técnico responsable y se le
    // avisa por correo (best-effort, después de responder al usuario).
    after(async () => {
      try {
        const tech = await getTechnicianForCategory(data.category)
        if (!tech) return

        await db
          .update(tickets)
          .set({ assignedToId: tech.id })
          .where(eq(tickets.id, newTicket.id))

        await notifyNewTicket({
          ticketId: newTicket.id,
          ticketTitle: data.title,
          ticketCode: formatTicketCode(data.category, newTicket.number),
          category: data.category,
          priority: data.priority,
          createdByName: user.name ?? user.email,
          recipient: { email: tech.email, name: tech.name },
        })
      } catch (err) {
        console.error('[email] Error al notificar nuevo ticket:', err)
      }
    })

    // Invalidar las páginas que listan tickets
    revalidatePath('/tickets')
    revalidatePath('/tickets/all')

    return { ok: true, ticketId: newTicket.id, ticketNumber: newTicket.number }
  } catch (err) {
    console.error('Error creando ticket:', err)
    return {
      ok: false,
      message: 'No se pudo crear el ticket. Inténtalo de nuevo.',
    }
  }
}

export async function addComment(input: {
  ticketId: string
  body: string
  attachments?: AttachmentInput[]
}) {
  const user = await requireUser()

  const parsed = z
    .object({
      ticketId: z.string().uuid(),
      // Puede ir vacío si el comentario trae adjuntos (se valida abajo).
      body: z.string().trim().max(2000),
    })
    .safeParse(input)

  if (!parsed.success) {
    return { ok: false as const, message: 'Datos inválidos' }
  }

  const { ticketId, body } = parsed.data
  const attachments = input.attachments ?? []
  const attErr = validateAttachments(attachments)
  if (attErr) return { ok: false as const, message: attErr }

  // Un comentario vacío solo se acepta si trae al menos un adjunto.
  if (!body && attachments.length === 0) {
    return {
      ok: false as const,
      message: 'Escribe un comentario o adjunta un archivo',
    }
  }

  // ⚠️ Solo desarrollo/visual: no hay BD, simulamos el comentario.
  if (DEV_BYPASS_AUTH) {
    return { ok: true as const }
  }

  const [ticket] = await db
    .select({
      title: tickets.title,
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
    user.role === 'admin' ||
    ticket.createdById === user.id ||
    ticket.assignedToId === user.id

  if (!canComment) {
    return { ok: false as const, message: 'No tienes permiso para comentar' }
  }

  // Insert del comentario — esto SÍ es crítico
  let commentId: string
  try {
    const [row] = await db
      .insert(ticketComments)
      .values({ ticketId, authorId: user.id, body })
      .returning({ id: ticketComments.id })
    commentId = row.id
  } catch (err) {
    console.error('Error agregando comentario:', err)
    return { ok: false as const, message: 'No se pudo agregar el comentario' }
  }

  // Adjuntos del comentario (best-effort: el comentario ya existe).
  try {
    await saveAttachments({
      ticketId,
      commentId,
      uploadedById: user.id,
      items: attachments,
    })
  } catch (attErr2) {
    console.error('No se pudieron guardar los adjuntos del comentario:', attErr2)
  }

  // Email — best-effort, corre DESPUÉS de responder al usuario.
  // Notifica al creador y al asignado, excluyendo a quien comentó.
  after(async () => {
    try {
      const recipientIds = [
        ...new Set(
          [ticket.createdById, ticket.assignedToId].filter(
            (id): id is string => !!id && id !== user.id,
          ),
        ),
      ]
      if (recipientIds.length === 0) return

      const recipients = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(inArray(users.id, recipientIds))

      await notifyNewComment({
        ticketId,
        ticketTitle: ticket.title,
        // Si solo mandaron archivos, el correo lo dice en vez de ir vacío.
        commentBody:
          body ||
          (attachments.length === 1
            ? 'Adjuntó 1 archivo.'
            : `Adjuntó ${attachments.length} archivos.`),
        authorName: user.name ?? user.email,
        recipients,
      })
    } catch (err) {
      console.error('[email] Error al notificar nuevo comentario:', err)
    }
  })

  return { ok: true as const }
}

export async function updateTicketDetails(input: {
  ticketId: string
  status?: TicketStatus
  assignedToId?: string | null
  category?: TicketCategory
  priority?: TicketPriority
}) {
  const user = await requireITUser()
  const {
    ticketId,
    status: newStatus,
    assignedToId: newAssignedToId,
    category: newCategory,
    priority: newPriority,
  } = input

  // ⚠️ Solo desarrollo/visual: no hay BD, simulamos la actualización.
  if (DEV_BYPASS_AUTH) {
    return { ok: true as const }
  }

  // Estado actual del ticket
  const [current] = await db
    .select({
      status: tickets.status,
      assignedToId: tickets.assignedToId,
      category: tickets.category,
      priority: tickets.priority,
      closedAt: tickets.closedAt,
      createdById: tickets.createdById, // ← para notificar al creador
      title: tickets.title, // ← para el asunto del correo
      number: tickets.number, // ← para armar el folio del aviso de asignación
    })
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1)

  if (!current) {
    return { ok: false as const, message: 'Ticket no encontrado' }
  }

  // Un ticket cerrado queda congelado para IT, pero el admin sí puede
  // moverlo: es quien responde por el histórico y necesita poder reabrir
  // algo que se cerró por error.
  if (current.closedAt && user.role !== 'admin') {
    return {
      ok: false as const,
      message: 'Este ticket está cerrado. Pide a un administrador que lo reabra.',
    }
  }

  // Detectar qué cambió
  const statusChanged = newStatus !== undefined && newStatus !== current.status
  const assignmentChanged =
    newAssignedToId !== undefined && newAssignedToId !== current.assignedToId
  const categoryChanged =
    newCategory !== undefined && newCategory !== current.category
  const priorityChanged =
    newPriority !== undefined && newPriority !== current.priority

  if (
    !statusChanged &&
    !assignmentChanged &&
    !categoryChanged &&
    !priorityChanged
  ) {
    return { ok: true as const } // Nada cambió
  }

  // Construir el update del ticket
  const updates: Partial<{
    status: TicketStatus
    assignedToId: string | null
    category: TicketCategory
    priority: TicketPriority
    resolvedAt: Date | null
    closedAt: Date | null
  }> = {}

  if (categoryChanged) {
    updates.category = newCategory!
  }

  if (priorityChanged) {
    updates.priority = newPriority!
  }

  if (statusChanged) {
    updates.status = newStatus!

    // Las marcas de tiempo se recalculan SIEMPRE, no solo al avanzar.
    //
    // Antes solo se ponían: al reabrir un ticket cerrado, closed_at se
    // quedaba con la fecha vieja. El ticket decía "Abierto" pero para la
    // base seguía cerrado, así que no aparecía en el filtro "Sin atender"
    // ni contaba como activo en Estadísticas.
    if (newStatus === 'closed') {
      updates.closedAt = new Date()
    } else if (newStatus === 'resolved') {
      updates.resolvedAt = new Date()
      updates.closedAt = null
    } else {
      // open / in_progress / waiting_user: vuelve a estar vivo.
      updates.closedAt = null
      updates.resolvedAt = null
    }
  }

  if (assignmentChanged) {
    updates.assignedToId = newAssignedToId ?? null
  }

  // Update + historiales — crítico
  try {
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
  } catch (err) {
    console.error('Error al actualizar ticket:', err)
    return { ok: false as const, message: 'No se pudo actualizar el ticket' }
  }

  // Email del cambio de estado al creador — best-effort, post-respuesta.
  // No se manda si el propio creador hizo el cambio.
  if (statusChanged && current.createdById !== user.id) {
    after(async () => {
      try {
        const [creator] = await db
          .select({ email: users.email, name: users.name })
          .from(users)
          .where(eq(users.id, current.createdById))
          .limit(1)

        await notifyStatusChange({
          ticketId,
          ticketTitle: current.title,
          fromStatus: current.status,
          toStatus: newStatus!,
          recipient: creator ?? null,
        })
      } catch (err) {
        console.error('[email] Error al notificar cambio de estado:', err)
      }
    })
  }

  // Aviso a quien acaba de recibir el ticket. No se manda si alguien se lo
  // asignó a sí mismo: ya lo sabe.
  if (assignmentChanged && newAssignedToId && newAssignedToId !== user.id) {
    after(async () => {
      try {
        const [assignee, creator] = await Promise.all([
          db
            .select({ email: users.email, name: users.name })
            .from(users)
            .where(eq(users.id, newAssignedToId))
            .limit(1),
          db
            .select({ name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, current.createdById))
            .limit(1),
        ])

        await notifyAssignment({
          ticketId,
          ticketTitle: current.title,
          ticketCode: formatTicketCode(
            newCategory ?? current.category,
            current.number,
          ),
          category: newCategory ?? current.category,
          priority: newPriority ?? current.priority,
          createdByName: creator[0]?.name ?? creator[0]?.email ?? 'un usuario',
          assignedByName: user.name ?? user.email,
          recipient: assignee[0] ?? null,
        })
      } catch (err) {
        console.error('[email] Error al notificar la asignación:', err)
      }
    })
  }

  return { ok: true as const }
}

export async function deleteTicket(ticketId: string) {
  // El admin borra cualquiera; IT solo lo que tiene asignado.
  const user = await requireITUser()

  // ⚠️ Solo desarrollo/visual: no hay BD, simulamos el borrado.
  if (DEV_BYPASS_AUTH) {
    return { ok: true as const }
  }

  const [ticket] = await db
    .select({ id: tickets.id, assignedToId: tickets.assignedToId })
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1)

  if (!ticket) return { ok: false as const, message: 'Ticket no encontrado' }

  // La regla se valida aquí, no solo escondiendo el botón: la interfaz se
  // puede saltar llamando la acción directo.
  const puedeBorrar =
    user.role === 'admin' || ticket.assignedToId === user.id

  if (!puedeBorrar) {
    return {
      ok: false as const,
      message: 'Solo puedes eliminar tickets que tengas asignados.',
    }
  }

  try {
    await db.delete(tickets).where(eq(tickets.id, ticketId))

    // A propósito NO se llama revalidatePath aquí.
    //
    // Revalidar invalida la caché del router en el cliente, y eso hace que
    // Next vuelva a pedir la ruta en la que está el usuario: /ticket/[id].
    // Como el ticket acaba de borrarse, esa página responde notFound() y
    // aparecía un 404 justo después de eliminar.
    //
    // No hace falta: las listas son force-dynamic, así que se arman de nuevo
    // en el servidor en cuanto se navega a ellas.

    return { ok: true as const }
  } catch (err) {
    console.error('Error al eliminar ticket:', err)
    return { ok: false as const, message: 'No se pudo eliminar el ticket' }
  }
}
