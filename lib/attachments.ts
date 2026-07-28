import 'server-only'

import { db } from '@/lib/db'
import { ticketAttachments } from '@/lib/db/schema'

export const MAX_ATTACHMENTS = 5
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024 // 10 MB

export interface AttachmentInput {
  fileName: string
  mimeType: string
  fileSize: number
  /** Contenido del archivo en base64 (sin el prefijo "data:..."). */
  data: string
}

/** Devuelve un mensaje de error si algo no cumple, o null si todo bien. */
export function validateAttachments(items: AttachmentInput[]): string | null {
  if (!Array.isArray(items)) return 'Adjuntos inválidos.'
  if (items.length > MAX_ATTACHMENTS)
    return `Máximo ${MAX_ATTACHMENTS} archivos por envío.`
  for (const a of items) {
    if (!a?.fileName || typeof a.data !== 'string' || a.data.length === 0)
      return 'Un adjunto no es válido.'
    if (a.fileSize > MAX_ATTACHMENT_BYTES)
      return `"${a.fileName}" supera los 10 MB.`
  }
  return null
}

/** Guarda los adjuntos en la BD, ligados a un ticket (y opcionalmente a un comentario). */
export async function saveAttachments(args: {
  ticketId: string
  commentId: string | null
  uploadedById: string
  items: AttachmentInput[]
}): Promise<void> {
  if (!args.items?.length) return
  await db.insert(ticketAttachments).values(
    args.items.map((a) => ({
      ticketId: args.ticketId,
      commentId: args.commentId,
      uploadedById: args.uploadedById,
      fileName: a.fileName.slice(0, 255),
      fileSize: a.fileSize,
      mimeType: a.mimeType || 'application/octet-stream',
      data: a.data,
    })),
  )
}
