'use client'

import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { formatMonthLabel } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface MonthFilterProps {
  /**
   * Meses navegables, del más antiguo al más reciente y sin huecos.
   * Incluye los que no tienen tickets, para que las flechas avancen de uno
   * en uno sin saltarse periodos.
   */
  months: { month: string; total: number }[]
  /** Mes activo ('YYYY-MM'), o null cuando se ve todo el histórico. */
  current: string | null
}

export function MonthFilter({ months, current }: MonthFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const index = current ? months.findIndex((m) => m.month === current) : -1
  const activo = index >= 0 ? months[index] : null

  // Sin mes elegido, la flecha izquierda entra por el más reciente.
  const anterior = activo ? months[index - 1] : months[months.length - 1]
  const siguiente = activo ? months[index + 1] : undefined

  const total = months.reduce((sum, m) => sum + m.total, 0)

  function go(month: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (month === null) params.delete('month')
    else params.set('month', month)

    const query = params.toString()
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname)
    })
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-3', isPending && 'opacity-60')}>
      <div
        className="border-border bg-card flex items-center gap-1 rounded-lg border p-1"
        role="group"
        aria-label="Cambiar de mes"
      >
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={isPending || !anterior}
          onClick={() => anterior && go(anterior.month)}
          aria-label={
            anterior ? `Ir a ${formatMonthLabel(anterior.month)}` : 'Sin meses anteriores'
          }
        >
          <ChevronLeft className="size-4" />
        </Button>

        <div className="min-w-36 px-2 text-center sm:min-w-52">
          <p className="text-sm leading-tight font-semibold">
            {activo ? formatMonthLabel(activo.month) : 'Todo el histórico'}
          </p>
          <p className="text-muted-foreground text-xs leading-tight">
            {activo
              ? `${activo.total} ${activo.total === 1 ? 'ticket' : 'tickets'}`
              : `${total} tickets en total`}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={isPending || !siguiente}
          onClick={() => siguiente && go(siguiente.month)}
          aria-label={
            siguiente ? `Ir a ${formatMonthLabel(siguiente.month)}` : 'Ya estás en el mes más reciente'
          }
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {activo && (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => go(null)}
        >
          <CalendarRange className="size-4" />
          Ver todo el histórico
        </Button>
      )}
    </div>
  )
}
