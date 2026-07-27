import 'server-only'

import { NewCommentEmail } from '@/emails/new-comment'
import { NewTicketEmail } from '@/emails/new-ticket'
import { StatusChangeEmail } from '@/emails/status-change'
import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS } from '@/lib/constants'
import type { TicketCategory, TicketPriority, TicketStatus } from '@/lib/db/schema'

import { APP_URL } from './client'
import { sendEmail } from './send'

interface Recipient {
  email: string
  name: string | null
}

export async function notifyStatusChange(args: {
  ticketId: string
  ticketTitle: string
  fromStatus: TicketStatus
  toStatus: TicketStatus
  recipient: Recipient | null
}) {
  const { ticketTitle, fromStatus, toStatus, recipient } = args

  if (!recipient || !recipient.email) return

  await sendEmail({
    to: recipient.email,
    subject: `Tu ticket: ${ticketTitle} cambió a ${STATUS_LABELS[toStatus]}`,
    react: StatusChangeEmail({
      recipientName: recipient.name ?? recipient.email,
      ticketTitle,
      fromStatus: STATUS_LABELS[fromStatus],
      toStatus: STATUS_LABELS[toStatus],
      ticketUrl: `${APP_URL}/tickets`,
    }),
  })
}

/**
 * Aviso al técnico responsable cuando entra un ticket de su categoría
 * (mismo mecanismo que notifyStatusChange).
 */
export async function notifyNewTicket(args: {
  ticketId: string
  ticketTitle: string
  ticketCode: string
  category: TicketCategory
  priority: TicketPriority
  createdByName: string
  recipient: Recipient | null
}) {
  const { ticketTitle, ticketCode, category, priority, createdByName, recipient } =
    args

  if (!recipient || !recipient.email) return

  await sendEmail({
    to: recipient.email,
    subject: `Nuevo ticket ${ticketCode}: ${ticketTitle}`,
    react: NewTicketEmail({
      recipientName: recipient.name ?? recipient.email,
      ticketTitle,
      ticketCode,
      category: CATEGORY_LABELS[category],
      priority: PRIORITY_LABELS[priority],
      createdByName,
      ticketUrl: `${APP_URL}/ticket/${args.ticketId}`,
    }),
  })
}

export async function notifyNewComment(args: {
  ticketId: string
  ticketTitle: string
  commentBody: string
  authorName: string
  recipients: Recipient[]
}) {
  const { ticketTitle, commentBody, authorName, recipients } = args
  const emails = recipients.map((r) => r.email).filter(Boolean)
  if (emails.length === 0) return

  await sendEmail({
    to: emails,
    subject: `Nuevo comentario en: ${ticketTitle}`,
    react: NewCommentEmail({
      ticketTitle,
      authorName,
      commentBody,
      ticketUrl: `${APP_URL}/tickets`,
    }),
  })
}
