import { NextResponse, type NextRequest } from 'next/server'

import { getCurrentUser } from '@/lib/auth'
import { isValidMonth, monthSlug } from '@/lib/constants'
import { buildStatsWorkbook } from '@/lib/excel/stats-workbook'

export const dynamic = 'force-dynamic'
// ExcelJS y JSZip necesitan APIs de Node, no corren en el runtime edge.
export const runtime = 'nodejs'

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** Descarga las estadísticas del periodo como Excel, con gráficas nativas. */
export async function GET(req: NextRequest) {
  // Los mismos permisos que la pantalla: el reporte tiene datos de todos.
  const user = await getCurrentUser()
  if (!user || (user.role !== 'it' && user.role !== 'admin')) {
    return new NextResponse('No autorizado', { status: 401 })
  }

  const raw = req.nextUrl.searchParams.get('month')
  const month = isValidMonth(raw) ? raw : null

  try {
    const buffer = await buildStatsWorkbook(month)

    const nombre = month
      ? `estadisticas-${monthSlug(month)}.xlsx`
      : 'estadisticas-historico.xlsx'

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': XLSX_MIME,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(nombre)}`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[export] No se pudo generar el Excel:', err)
    return new NextResponse('No se pudo generar el reporte', { status: 500 })
  }
}
