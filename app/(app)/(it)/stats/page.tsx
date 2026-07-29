import {
  AlertTriangle,
  RotateCcw,
  Tag,
  UserX,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'

import {
  BarList,
  GroupedBarList,
  type BarRow,
} from '@/components/stats/bar-list'
import { DonutChart, type DonutSlice } from '@/components/stats/donut-chart'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TICKET_CATEGORIES,
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
import type {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

/**
 * Etiqueta e icono de una categoría que viene de la BD.
 *
 * Las categorías de estas consultas salen de la tabla, no del arreglo fijo del
 * código. Si algún día se agrega un valor al enum sin darlo de alta aquí, un
 * acceso directo devolvería `undefined` y React tronaría al intentar pintarlo
 * como componente. Con el respaldo, esa categoría simplemente sale con nombre
 * genérico en vez de tumbar toda la página.
 */
function categoryLabel(category: TicketCategory): string {
  return CATEGORY_LABELS[category] ?? category
}

function categoryIcon(category: TicketCategory): LucideIcon {
  return CATEGORY_ICONS[category] ?? Tag
}

/** Días con una unidad legible: menos de un día se entiende mejor en horas. */
function formatDays(days: number): string {
  if (days <= 0) return '—'
  if (days < 1) return `${Math.round(days * 24)} h`
  return `${days.toFixed(1).replace(/\.0$/, '')} d`
}

const STATUS_ORDER: TicketStatus[] = [
  'open',
  'in_progress',
  'waiting_user',
  'resolved',
  'closed',
]

const STATUS_VARS: Record<TicketStatus, string> = {
  open: 'var(--viz-st-open)',
  in_progress: 'var(--viz-st-progress)',
  waiting_user: 'var(--viz-st-waiting)',
  resolved: 'var(--viz-st-resolved)',
  closed: 'var(--viz-st-closed)',
}

// Prioridad es una escala ordenada, así que lleva rampa de un solo tono.
const PRIORITY_VARS: Record<TicketPriority, string> = {
  high: 'var(--viz-prio-high)',
  medium: 'var(--viz-prio-medium)',
  low: 'var(--viz-prio-low)',
}

/** Ranuras del pastel de categorías. */
const CATEGORY_SLOTS = [
  'var(--viz-cat-1)',
  'var(--viz-cat-2)',
  'var(--viz-cat-3)',
  'var(--viz-cat-4)',
  'var(--viz-cat-5)',
  'var(--viz-cat-6)',
]

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

export default async function StatsPage() {
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
    getStatusCounts({}),
    getCategoryCounts(),
    getPriorityCounts(),
    getResolutionStats(),
    getResolutionByCategory(),
    getFirstResponseHours(),
    getBacklogAging(),
    getUnassignedActive(),
    getReopenedCount(),
    getWorkloadByTech(),
    getTopRequesters(),
    getMonthlyFlow(),
  ])

  const total = statusCounts.all
  const active = total - statusCounts.closed
  const closeRate =
    total > 0 ? Math.round((statusCounts.closed / total) * 100) : 0

  const stats = [
    {
      label: 'Tickets totales',
      value: total,
      hint: 'Desde que arrancó el sistema',
    },
    {
      label: 'Sin cerrar',
      value: active,
      hint: `Ya se cerró el ${closeRate}% del total`,
    },
    {
      label: 'Mediana de resolución',
      value: formatDays(resolution.medianDays),
      hint: `La mitad se cierra antes · el más lento tardó ${formatDays(resolution.maxDays)}`,
    },
    {
      label: 'Primera respuesta',
      value:
        firstResponse.medianHours > 0 ? `${firstResponse.medianHours} h` : '—',
      hint: `Mediana sobre ${firstResponse.answered} tickets con respuesta`,
    },
  ]

  // ── Pastel de estado ──────────────────────────────────────────────────────
  const statusSlices: DonutSlice[] = STATUS_ORDER.filter(
    (s) => statusCounts[s] > 0,
  ).map((s) => ({
    key: s,
    label: STATUS_LABELS[s],
    value: statusCounts[s],
    color: STATUS_VARS[s],
  }))

  // ── Pastel de prioridad (de más urgente a menos) ──────────────────────────
  const prioritySlices: DonutSlice[] = (
    ['high', 'medium', 'low'] as TicketPriority[]
  )
    .filter((p) => priorityCounts[p] > 0)
    .map((p) => ({
      key: p,
      label: PRIORITY_LABELS[p],
      value: priorityCounts[p],
      color: PRIORITY_VARS[p],
    }))

  // ── Pastel de categoría: las 5 con más volumen y el resto agrupado ────────
  const rankedCategories = TICKET_CATEGORIES.map((c) => ({
    category: c,
    value: categoryCounts[c] ?? 0,
  }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value)

  const topCategories = rankedCategories.slice(0, 5)
  const restTotal = rankedCategories
    .slice(5)
    .reduce((sum, c) => sum + c.value, 0)

  const categorySlices: DonutSlice[] = [
    ...topCategories.map((c, i) => ({
      key: c.category,
      label: categoryLabel(c.category),
      value: c.value,
      color: CATEGORY_SLOTS[i],
    })),
    ...(restTotal > 0
      ? [
          {
            key: 'otras',
            label: 'Otras categorías',
            value: restTotal,
            color: CATEGORY_SLOTS[5],
          },
        ]
      : []),
  ]

  // ── Barras ────────────────────────────────────────────────────────────────
  const resolutionRows: BarRow[] = byCategory.map((c) => ({
    key: c.category,
    label: categoryLabel(c.category),
    value: c.medianDays,
    display: formatDays(c.medianDays),
    hint: `${c.closed} cerrados`,
    icon: categoryIcon(c.category),
  }))

  const workloadRows: BarRow[] = workload.map((w) => ({
    key: w.name,
    label: w.name,
    value: w.total,
    display: String(w.total),
    hint: w.active > 0 ? `${w.active} sin cerrar` : 'Todo cerrado',
  }))

  const agingRows: BarRow[] = aging.map((b) => ({
    key: b.key,
    label: b.label,
    value: b.count,
    display: String(b.count),
    critical: b.critical && b.count > 0,
    icon: b.critical && b.count > 0 ? AlertTriangle : undefined,
  }))

  const requesterRows: BarRow[] = requesters.map((r) => ({
    key: r.name,
    label: r.name,
    value: r.total,
    display: String(r.total),
  }))

  const oldest = aging.find((b) => b.critical)?.count ?? 0

  const alerts = [
    {
      icon: UserX,
      label: 'Sin asignar',
      value: unassigned,
      hint: 'Tickets activos sin responsable',
      warn: unassigned > 0,
    },
    {
      icon: AlertTriangle,
      label: 'Más de 30 días',
      value: oldest,
      hint: 'Siguen abiertos y ya se pasaron',
      warn: oldest > 0,
    },
    {
      icon: RotateCcw,
      label: 'Reabiertos',
      value: reopened,
      hint: 'Se cerraron y hubo que volver a abrirlos',
      warn: reopened > 0,
    },
  ]

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Estadísticas</h1>
          <p className="text-muted-foreground text-sm">
            Análisis de {total} tickets registrados.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/tickets/all">Ver tickets</Link>
        </Button>
      </header>

      {/* Indicadores principales */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="space-y-2 p-5">
              <p className="text-muted-foreground text-sm">{stat.label}</p>
              <p className="text-4xl font-bold tracking-tight">{stat.value}</p>
              <p className="text-muted-foreground text-xs">{stat.hint}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Focos rojos */}
      <section className="grid gap-4 sm:grid-cols-3">
        {alerts.map((alert) => (
          <Card key={alert.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <alert.icon
                className={
                  alert.warn
                    ? 'text-destructive size-5 shrink-0'
                    : 'text-muted-foreground size-5 shrink-0'
                }
                aria-hidden
              />
              <div className="min-w-0 space-y-0.5">
                <p className="text-2xl font-bold tracking-tight">
                  {alert.value}
                </p>
                <p className="text-sm font-medium">{alert.label}</p>
                <p className="text-muted-foreground text-xs">{alert.hint}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Pasteles */}
      <section className="grid gap-4 xl:grid-cols-2">
        <Section
          title="Tickets por estado"
          description="En qué punto del proceso está cada solicitud"
        >
          <DonutChart
            slices={statusSlices}
            centerValue={total}
            centerLabel="tickets"
          />
        </Section>

        <Section
          title="Tickets por prioridad"
          description="Qué tan urgente se marca lo que entra"
        >
          <DonutChart
            slices={prioritySlices}
            centerValue={total}
            centerLabel="tickets"
          />
        </Section>
      </section>

      <Section
        title="Tickets por categoría"
        description="Las cinco con más volumen; el resto va agrupado. Abajo está el desglose completo."
      >
        <DonutChart
          slices={categorySlices}
          centerValue={total}
          centerLabel="tickets"
        />

        {/* El desglose completo, sin depender del color para leerse. */}
        <div className="overflow-x-auto pt-2">
          <table className="w-full min-w-100 text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs">
                <th className="pb-2 font-medium">Categoría</th>
                <th className="pb-2 text-right font-medium">Tickets</th>
                <th className="pb-2 text-right font-medium">Del total</th>
              </tr>
            </thead>
            <tbody>
              {rankedCategories.map((c) => {
                const Icon = categoryIcon(c.category)
                return (
                  <tr key={c.category} className="border-b last:border-0">
                    <td className="py-2">
                      <span className="flex items-center gap-2">
                        <Icon
                          className="text-muted-foreground size-4 shrink-0"
                          aria-hidden
                        />
                        {categoryLabel(c.category)}
                      </span>
                    </td>
                    <td className="py-2 text-right font-semibold tabular-nums">
                      {c.value}
                    </td>
                    <td className="text-muted-foreground py-2 text-right tabular-nums">
                      {total > 0 ? Math.round((c.value / total) * 100) : 0}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Tiempos */}
      <section className="grid gap-4 xl:grid-cols-2">
        <Section
          title="Qué tanto tarda cada categoría"
          description="Mediana de días entre que se levanta el ticket y se cierra"
        >
          <BarList rows={resolutionRows} labelWidth="w-36" />
        </Section>

        <Section
          title="Antigüedad de lo que sigue abierto"
          description="Cuánto llevan esperando los tickets sin cerrar"
        >
          <BarList rows={agingRows} labelWidth="w-32" />
        </Section>
      </section>

      {/* Personas */}
      <section className="grid gap-4 xl:grid-cols-2">
        <Section
          title="Carga por técnico"
          description="Tickets que ha recibido cada persona de sistemas"
        >
          <BarList rows={workloadRows} labelWidth="w-44" />
        </Section>

        <Section
          title="Quién levanta más tickets"
          description="Personas y áreas que más apoyo piden"
        >
          <BarList rows={requesterRows} labelWidth="w-44" />
        </Section>
      </section>

      {/* Tendencia */}
      <Section
        title="Creados contra cerrados por mes"
        description="Si los creados le ganan seguido a los cerrados, el rezago crece"
      >
        <GroupedBarList
          rows={monthly.map((m) => ({
            key: m.month,
            label: m.label,
            created: m.created,
            closed: m.closed,
          }))}
        />
      </Section>
    </div>
  )
}
