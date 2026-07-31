import 'server-only'

import ExcelJS from 'exceljs'

import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  formatMonthLabel,
} from '@/lib/constants'
import {
  getBacklogAging,
  getFirstResponseHours,
  getMonthlyFlow,
  getPriorityCounts,
  getReopenedCount,
  getResolutionByCategory,
  getResolutionStats,
  getTopRequesters,
  getUnassignedActive,
  getWorkloadByTech,
} from '@/lib/db/queries/stats'
import { getCategoryCounts, getStatusCounts } from '@/lib/db/queries/tickets'
import type { TicketCategory, TicketPriority, TicketStatus } from '@/lib/db/schema'

import type { ChartSpec } from './charts'
import { injectCharts } from './inject-charts'

const HEADER_FILL = 'FF1F2937'
const HEADER_FONT = 'FFFFFFFF'

/** Encabezado con estilo, y anchos de columna razonables. */
function addTable(
  sheet: ExcelJS.Worksheet,
  headers: string[],
  rows: (string | number)[][],
  widths: number[],
) {
  const head = sheet.addRow(headers)
  head.font = { bold: true, color: { argb: HEADER_FONT } }
  head.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: HEADER_FILL },
  }
  head.alignment = { vertical: 'middle' }
  head.height = 20

  rows.forEach((r) => sheet.addRow(r))
  widths.forEach((w, i) => {
    sheet.getColumn(i + 1).width = w
  })
}

function formatDays(d: number): string {
  if (!d) return '—'
  return d < 1 ? `${Math.round(d * 24)} h` : `${d} d`
}

/**
 * Genera el .xlsx de Estadísticas para un mes (o para todo el histórico si
 * `month` es null). Incluye gráficas nativas de Excel, vinculadas a las
 * celdas: si se editan los datos, la gráfica se actualiza.
 */
export async function buildStatsWorkbook(month: string | null): Promise<Buffer> {
  const periodo = month ? { month } : {}

  const [
    statusCounts,
    categoryCounts,
    priorityCounts,
    resolution,
    byCategory,
    firstResponse,
    aging,
    unassigned,
    reopened,
    workload,
    requesters,
    monthly,
  ] = await Promise.all([
    getStatusCounts(periodo),
    getCategoryCounts(periodo),
    getPriorityCounts(periodo),
    getResolutionStats(periodo),
    getResolutionByCategory(periodo),
    getFirstResponseHours(periodo),
    getBacklogAging(periodo),
    getUnassignedActive(periodo),
    getReopenedCount(periodo),
    getWorkloadByTech(periodo),
    getTopRequesters(20, periodo),
    getMonthlyFlow(12),
  ])

  const periodLabel = month ? formatMonthLabel(month) : 'Todo el histórico'
  const total = statusCounts.all
  const closeRate = total > 0 ? Math.round((statusCounts.closed / total) * 100) : 0

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Bailmex IT Tickets'
  wb.created = new Date()

  const charts = new Map<number, ChartSpec[]>()

  // ── 1. Resumen ──────────────────────────────────────────────────────────
  const resumen = wb.addWorksheet('Resumen')
  resumen.addRow([`Estadísticas de soporte — ${periodLabel}`]).font = {
    bold: true,
    size: 16,
  }
  resumen.addRow([])
  addTable(
    resumen,
    ['Indicador', 'Valor'],
    [
      ['Tickets del periodo', total],
      ['Sin cerrar', total - statusCounts.closed],
      ['Tasa de cierre', `${closeRate}%`],
      ['Mediana de resolución', formatDays(resolution.medianDays)],
      ['Promedio de resolución', formatDays(resolution.avgDays)],
      ['El más lento', formatDays(resolution.maxDays)],
      [
        'Primera respuesta (mediana)',
        firstResponse.medianHours > 0 ? `${firstResponse.medianHours} h` : '—',
      ],
      ['Tickets con respuesta', firstResponse.answered],
      ['Activos sin asignar', unassigned],
      ['Reabiertos', reopened],
    ],
    [32, 22],
  )

  // ── 2. Por estado (pastel) ──────────────────────────────────────────────
  const estados = wb.addWorksheet('Por estado')
  const statusKeys = Object.keys(STATUS_LABELS) as TicketStatus[]
  const statusRows = statusKeys.map((k) => [
    STATUS_LABELS[k],
    statusCounts[k] ?? 0,
  ])
  addTable(estados, ['Estado', 'Tickets'], statusRows, [24, 12])
  charts.set(2, [
    {
      kind: 'pie',
      title: `Tickets por estado — ${periodLabel}`,
      sheet: 'Por estado',
      headerRow: 1,
      firstRow: 2,
      lastRow: 1 + statusRows.length,
      labelCol: 'A',
      valueCol: 'B',
      anchor: { col: 3, row: 1 },
      colors: statusKeys.map((k) => STATUS_COLORS[k]),
    },
  ])

  // ── 3. Por prioridad (pastel) ───────────────────────────────────────────
  const prioridades = wb.addWorksheet('Por prioridad')
  const prioKeys: TicketPriority[] = ['high', 'medium', 'low']
  const prioRows = prioKeys.map((k) => [
    PRIORITY_LABELS[k],
    priorityCounts[k] ?? 0,
  ])
  addTable(prioridades, ['Prioridad', 'Tickets'], prioRows, [24, 12])
  charts.set(3, [
    {
      kind: 'pie',
      title: `Tickets por prioridad — ${periodLabel}`,
      sheet: 'Por prioridad',
      headerRow: 1,
      firstRow: 2,
      lastRow: 1 + prioRows.length,
      labelCol: 'A',
      valueCol: 'B',
      anchor: { col: 3, row: 1 },
      colors: prioKeys.map((k) => PRIORITY_COLORS[k]),
    },
  ])

  // ── 4. Por categoría (barras) ───────────────────────────────────────────
  const categorias = wb.addWorksheet('Por categoría')
  const catRows = (Object.keys(categoryCounts) as TicketCategory[])
    .map((k) => [CATEGORY_LABELS[k] ?? k, categoryCounts[k] ?? 0] as [string, number])
    .filter((r) => r[1] > 0)
    .sort((a, b) => b[1] - a[1])
  addTable(categorias, ['Categoría', 'Tickets'], catRows, [26, 12])
  if (catRows.length > 0) {
    charts.set(4, [
      {
        kind: 'bar',
        title: `Tickets por categoría — ${periodLabel}`,
        sheet: 'Por categoría',
        headerRow: 1,
        firstRow: 2,
        lastRow: 1 + catRows.length,
        labelCol: 'A',
        valueCol: 'B',
        anchor: { col: 3, row: 1 },
        colors: catRows.map(
          ([label]) =>
            CATEGORY_COLORS[
              (Object.keys(CATEGORY_LABELS) as TicketCategory[]).find(
                (k) => CATEGORY_LABELS[k] === label,
              ) ?? 'other'
            ],
        ),
      },
    ])
  }

  // ── 5. Tiempos de resolución por categoría (barras) ─────────────────────
  const tiempos = wb.addWorksheet('Tiempos por categoría')
  const tiempoRows = byCategory.map((r) => [
    CATEGORY_LABELS[r.category] ?? r.category,
    r.medianDays,
    r.closed,
  ])
  addTable(
    tiempos,
    ['Categoría', 'Mediana (días)', 'Cerrados'],
    tiempoRows,
    [26, 16, 12],
  )
  if (tiempoRows.length > 0) {
    charts.set(5, [
      {
        kind: 'bar',
        title: `Mediana de días para cerrar — ${periodLabel}`,
        sheet: 'Tiempos por categoría',
        headerRow: 1,
        firstRow: 2,
        lastRow: 1 + tiempoRows.length,
        labelCol: 'A',
        valueCol: 'B',
        anchor: { col: 4, row: 1 },
      },
    ])
  }

  // ── 6. Antigüedad del backlog (barras) ──────────────────────────────────
  const antiguedad = wb.addWorksheet('Antigüedad')
  const agingRows = aging.map((b) => [b.label, b.count])
  addTable(antiguedad, ['Antigüedad', 'Tickets abiertos'], agingRows, [24, 18])
  charts.set(6, [
    {
      kind: 'bar',
      title: `Antigüedad de lo que sigue abierto — ${periodLabel}`,
      sheet: 'Antigüedad',
      headerRow: 1,
      firstRow: 2,
      lastRow: 1 + agingRows.length,
      labelCol: 'A',
      valueCol: 'B',
      anchor: { col: 3, row: 1 },
    },
  ])

  // ── 7. Carga por técnico (barras) ───────────────────────────────────────
  const tecnicos = wb.addWorksheet('Carga por técnico')
  const techRows = workload.map((w) => [w.name ?? '—', w.total, w.active])
  addTable(
    tecnicos,
    ['Técnico', 'Asignados', 'Sin cerrar'],
    techRows,
    [30, 14, 14],
  )
  if (techRows.length > 0) {
    charts.set(7, [
      {
        kind: 'bar',
        title: `Carga por técnico — ${periodLabel}`,
        sheet: 'Carga por técnico',
        headerRow: 1,
        firstRow: 2,
        lastRow: 1 + techRows.length,
        labelCol: 'A',
        valueCol: 'B',
        anchor: { col: 4, row: 1 },
      },
    ])
  }

  // ── 8. Quién levanta más tickets (barras) ───────────────────────────────
  const solicitantes = wb.addWorksheet('Solicitantes')
  const reqRows = requesters.map((r) => [r.name ?? '—', r.total])
  addTable(solicitantes, ['Persona', 'Tickets'], reqRows, [30, 12])
  if (reqRows.length > 0) {
    charts.set(8, [
      {
        kind: 'bar',
        title: `Quién levanta más tickets — ${periodLabel}`,
        sheet: 'Solicitantes',
        headerRow: 1,
        firstRow: 2,
        lastRow: 1 + reqRows.length,
        labelCol: 'A',
        valueCol: 'B',
        anchor: { col: 3, row: 1 },
      },
    ])
  }

  // ── 9. Tendencia mes a mes ──────────────────────────────────────────────
  // No se acota al mes: su utilidad es justamente comparar entre meses.
  const tendencia = wb.addWorksheet('Tendencia mensual')
  const flowRows = monthly.map((m) => [m.label, m.created, m.closed])
  addTable(
    tendencia,
    ['Mes', 'Creados', 'Cerrados'],
    flowRows,
    [18, 12, 12],
  )
  if (flowRows.length > 0) {
    charts.set(9, [
      {
        kind: 'bar',
        title: 'Creados por mes',
        sheet: 'Tendencia mensual',
        headerRow: 1,
        firstRow: 2,
        lastRow: 1 + flowRows.length,
        labelCol: 'A',
        valueCol: 'B',
        anchor: { col: 4, row: 1 },
      },
      {
        kind: 'bar',
        title: 'Cerrados por mes',
        sheet: 'Tendencia mensual',
        headerRow: 1,
        firstRow: 2,
        lastRow: 1 + flowRows.length,
        labelCol: 'A',
        valueCol: 'C',
        anchor: { col: 4, row: 20 },
      },
    ])
  }

  const buffer = await wb.xlsx.writeBuffer()
  return injectCharts(buffer, charts)
}
