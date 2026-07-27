import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  TICKET_CATEGORIES,
} from '@/lib/constants'
import { getCategoryCounts, getStatusCounts } from '@/lib/db/queries/tickets'

export const dynamic = 'force-dynamic'

export default async function StatsPage() {
  const [statusCounts, categoryCounts] = await Promise.all([
    getStatusCounts({}),
    getCategoryCounts(),
  ])

  const total = statusCounts.all
  const completed = statusCounts.resolved + statusCounts.closed
  const closeRate = total > 0 ? Math.round((completed / total) * 100) : 0

  const stats = [
    {
      label: 'Tickets totales',
      value: total,
      hint: 'Solicitudes registradas',
    },
    {
      label: 'Abiertos',
      value: statusCounts.open,
      hint: 'Requieren atención',
    },
    {
      label: 'En proceso',
      value: statusCounts.in_progress,
      hint: 'Con seguimiento activo',
    },
    {
      label: 'Tasa de cierre',
      value: `${closeRate}%`,
      hint: 'Tickets completados',
    },
  ]

  // Escala de las barras respecto a la categoría con más tickets.
  const maxCount = Math.max(
    1,
    ...TICKET_CATEGORIES.map((c) => categoryCounts[c] ?? 0),
  )

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Estadísticas
          </h1>
          <p className="text-muted-foreground text-sm">
            Estado actual del servicio de soporte.
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

      {/* Distribución por categoría */}
      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">
              Tickets por categoría
            </h2>
            <p className="text-muted-foreground text-sm">
              Distribución de solicitudes registradas
            </p>
          </div>

          <ul className="space-y-3">
            {TICKET_CATEGORIES.map((category) => {
              const Icon = CATEGORY_ICONS[category]
              const color = CATEGORY_COLORS[category]
              const value = categoryCounts[category] ?? 0
              const pct = Math.round((value / maxCount) * 100)

              return (
                <li key={category} className="flex items-center gap-3">
                  <Icon
                    className="size-4 shrink-0"
                    style={{ color }}
                    aria-hidden
                  />
                  <span className="w-28 shrink-0 truncate text-sm font-medium">
                    {CATEGORY_LABELS[category]}
                  </span>

                  <div
                    className="bg-muted h-2 flex-1 overflow-hidden rounded-full"
                    role="img"
                    aria-label={`${CATEGORY_LABELS[category]}: ${value} tickets`}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>

                  <span className="w-6 shrink-0 text-right text-sm font-semibold tabular-nums">
                    {value}
                  </span>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
