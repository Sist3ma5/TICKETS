import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface BarRow {
  key: string
  label: string
  /** Lo que define el largo de la barra. */
  value: number
  /** Texto que se muestra a la derecha. Por defecto, el valor. */
  display?: string
  /** Aclaración discreta bajo la etiqueta (ej. "18 cerrados"). */
  hint?: string
  icon?: LucideIcon
  /** Pinta la fila con el color reservado de alerta. Siempre con icono y etiqueta. */
  critical?: boolean
}

interface BarListProps {
  rows: BarRow[]
  className?: string
  /** Ancho de la columna de etiquetas. */
  labelWidth?: string
  emptyMessage?: string
}

/**
 * Lista de barras horizontales para comparar magnitudes.
 *
 * Todas las barras van del MISMO color: el largo ya codifica el valor, así que
 * pintar cada fila de un color distinto gastaría el canal de identidad en
 * repetir lo que la barra ya dice. La única excepción es `critical`, que usa el
 * color reservado de alerta y siempre viene acompañado de icono y etiqueta.
 */
export function BarList({
  rows,
  className,
  labelWidth = 'w-32',
  emptyMessage = 'Sin datos aún.',
}: BarListProps) {
  if (!rows.length) {
    return <p className="text-muted-foreground text-sm italic">{emptyMessage}</p>
  }

  const max = Math.max(1, ...rows.map((r) => r.value))

  return (
    <ul className={cn('space-y-3', className)}>
      {rows.map((row) => {
        const Icon = row.icon
        const width = Math.max((row.value / max) * 100, row.value > 0 ? 1.5 : 0)
        const color = row.critical ? 'var(--viz-critical)' : 'var(--viz-bar)'

        return (
          <li key={row.key} className="flex items-center gap-3">
            {Icon && (
              <Icon
                className={cn(
                  'size-4 shrink-0',
                  row.critical ? 'text-destructive' : 'text-muted-foreground',
                )}
                aria-hidden
              />
            )}

            <div className={cn('shrink-0', labelWidth)}>
              <p className="truncate text-sm font-medium">{row.label}</p>
              {row.hint && (
                <p className="text-muted-foreground truncate text-[11px]">
                  {row.hint}
                </p>
              )}
            </div>

            <div
              className="bg-muted h-2 flex-1 overflow-hidden rounded-full"
              role="img"
              aria-label={`${row.label}: ${row.display ?? row.value}`}
            >
              <div
                className="h-full rounded-r-[4px]"
                style={{ width: `${width}%`, backgroundColor: color }}
              />
            </div>

            <span className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums">
              {row.display ?? row.value}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export interface GroupedRow {
  key: string
  label: string
  created: number
  closed: number
}

/**
 * Dos series por fila (creados vs cerrados) sobre una sola escala.
 * Nunca dos ejes: ambas series se miden con el mismo máximo.
 */
export function GroupedBarList({
  rows,
  className,
}: {
  rows: GroupedRow[]
  className?: string
}) {
  if (!rows.length) {
    return (
      <p className="text-muted-foreground text-sm italic">Sin datos aún.</p>
    )
  }

  const max = Math.max(1, ...rows.flatMap((r) => [r.created, r.closed]))

  return (
    <div className={cn('space-y-4', className)}>
      {/* Con dos series la leyenda es obligatoria. */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-2.5 rounded-[3px]"
            style={{ backgroundColor: 'var(--viz-cat-1)' }}
          />
          Creados
        </span>
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-2.5 rounded-[3px]"
            style={{ backgroundColor: 'var(--viz-cat-3)' }}
          />
          Cerrados
        </span>
      </div>

      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-sm font-medium">
              {row.label}
            </span>

            <div className="flex-1 space-y-1">
              {(
                [
                  { v: row.created, c: 'var(--viz-cat-1)', n: 'Creados' },
                  { v: row.closed, c: 'var(--viz-cat-3)', n: 'Cerrados' },
                ] as const
              ).map((serie) => (
                <div
                  key={serie.n}
                  className="bg-muted h-2 overflow-hidden rounded-full"
                  role="img"
                  aria-label={`${row.label}, ${serie.n}: ${serie.v}`}
                >
                  <div
                    className="h-full rounded-r-[4px]"
                    style={{
                      width: `${Math.max((serie.v / max) * 100, serie.v > 0 ? 1.5 : 0)}%`,
                      backgroundColor: serie.c,
                    }}
                  />
                </div>
              ))}
            </div>

            <span className="w-16 shrink-0 text-right text-sm tabular-nums">
              <span className="font-semibold">{row.created}</span>
              <span className="text-muted-foreground"> / {row.closed}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
