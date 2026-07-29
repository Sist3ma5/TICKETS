import { cn } from '@/lib/utils'

export interface DonutSlice {
  key: string
  label: string
  value: number
  /** Color CSS, normalmente una variable var(--viz-…). */
  color: string
}

interface DonutChartProps {
  slices: DonutSlice[]
  /** Número grande del centro. Por defecto, la suma. */
  centerValue?: number | string
  centerLabel?: string
  className?: string
}

const SIZE = 180
const RADIUS = 68
const STROKE = 26
// Separación entre gajos: se ve el fondo, no un borde pintado.
const GAP = 2

/**
 * Dona de proporciones, dibujada como SVG en el servidor.
 *
 * Se dibuja con `stroke-dasharray` sobre círculos: cada gajo es un arco y la
 * separación entre ellos deja ver la superficie de la tarjeta, en lugar de
 * trazar un borde encima.
 *
 * Los gajos van SIEMPRE en el orden fijo que recibe, no ordenados por tamaño:
 * así cada categoría conserva su color aunque cambien los números.
 *
 * El color nunca es el único portador del dato — la leyenda de al lado trae
 * etiqueta, cantidad y porcentaje, y hace las veces de tabla.
 */
export function DonutChart({
  slices,
  centerValue,
  centerLabel,
  className,
}: DonutChartProps) {
  const visible = slices.filter((s) => s.value > 0)
  const total = visible.reduce((sum, s) => sum + s.value, 0)

  const circumference = 2 * Math.PI * RADIUS
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0)

  // Sin datos: se dibuja un aro apagado en vez de una tarjeta vacía.
  if (total === 0) {
    return (
      <div className={cn('flex items-center gap-6', className)}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="shrink-0"
          role="img"
          aria-label="Sin datos para mostrar"
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-muted"
          />
        </svg>
        <p className="text-muted-foreground text-sm italic">Sin datos aún.</p>
      </div>
    )
  }

  // Se calcula el arranque de cada arco antes de dibujar, para no ir
  // acumulando una variable durante el render.
  const arcs = visible.map((slice, i) => {
    const start = visible
      .slice(0, i)
      .reduce((sum, prev) => sum + prev.value / total, 0)
    const fraction = slice.value / total
    // Un solo gajo cubre todo el aro: no hay de quién separarlo.
    const length =
      visible.length === 1
        ? circumference
        : Math.max(fraction * circumference - GAP, 0.5)

    return { slice, start, length }
  })

  return (
    <div className={cn('flex flex-wrap items-center gap-x-8 gap-y-5', className)}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-45 w-45 shrink-0"
        role="img"
        aria-label={
          `Total ${total}. ` +
          visible
            .map((s) => `${s.label}: ${s.value} (${Math.round(pct(s.value))}%)`)
            .join('. ')
        }
      >
        {arcs.map(({ slice, start, length }) => (
          <circle
            key={slice.key}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={slice.color}
            strokeWidth={STROKE}
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={-start * circumference}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          >
            {/* Tooltip nativo del navegador, sin JavaScript. */}
            <title>{`${slice.label}: ${slice.value} (${Math.round(pct(slice.value))}%)`}</title>
          </circle>
        ))}

        <text
          x={SIZE / 2}
          y={centerLabel ? SIZE / 2 - 4 : SIZE / 2 + 6}
          textAnchor="middle"
          className="fill-foreground text-[30px] font-bold"
        >
          {centerValue ?? total}
        </text>
        {centerLabel && (
          <text
            x={SIZE / 2}
            y={SIZE / 2 + 18}
            textAnchor="middle"
            className="fill-muted-foreground text-[11px]"
          >
            {centerLabel}
          </text>
        )}
      </svg>

      {/* Leyenda: es también la vista de tabla del gráfico. */}
      <ul className="min-w-45 flex-1 space-y-2">
        {slices.map((slice) => (
          <li key={slice.key} className="flex items-center gap-2.5 text-sm">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ backgroundColor: slice.color }}
            />
            <span className="min-w-0 flex-1 truncate">{slice.label}</span>
            <span className="font-semibold tabular-nums">{slice.value}</span>
            <span className="text-muted-foreground w-10 text-right text-xs tabular-nums">
              {Math.round(pct(slice.value))}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
