import { eq } from 'drizzle-orm'
import { NextResponse, type NextRequest } from 'next/server'

import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { ticketAttachments } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

// Sirve el archivo adjunto guardado en la BD (base64) como binario.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) {
    return new NextResponse('No autorizado', { status: 401 })
  }

  const { id } = await params

  const [att] = await db
    .select({
      data: ticketAttachments.data,
      mimeType: ticketAttachments.mimeType,
      fileName: ticketAttachments.fileName,
    })
    .from(ticketAttachments)
    .where(eq(ticketAttachments.id, id))
    .limit(1)

  if (!att || !att.data) {
    return new NextResponse('No encontrado', { status: 404 })
  }

  const bytes = Buffer.from(att.data, 'base64')

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      'Content-Type': att.mimeType || 'application/octet-stream',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(att.fileName)}`,
      'Content-Length': String(bytes.length),
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
