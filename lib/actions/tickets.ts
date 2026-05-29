'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { tickets, ticketStatusHistory } from '@/lib/db/schema'
import { requireUser } from '@/lib/auth'
import {
  createTicketSchema,
  type CreateTicketInput,
} from '@/lib/validations/ticket'

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