import Link from 'next/link'

import { Button } from '@/components/ui/button'

/** Cuántas tarjetas se muestran de entrada y cuántas suma cada clic. */
export const TAMANO_PAGINA = 30

interface TicketsLoadMoreProps {
  /** Tarjetas visibles ahora mismo. */
  mostrando: number
  /** Cuántas hay en total con los filtros puestos. */
  total: number
  /** searchParams actuales, para conservar filtros y búsqueda. */
  params: Record<string, string | undefined>
  pathname: string
}

/**
 * Paginación por enlace, sin estado en el cliente.
 *
 * Es un `<Link>` normal que sube el parámetro `ver`, así que el servidor
 * manda solo las tarjetas pedidas. Antes se pintaban todas de una: con 149
 * tickets ya se notaba, y la lista crece ~100 al mes.
 */
export function TicketsLoadMore({
  mostrando,
  total,
  params,
  pathname,
}: TicketsLoadMoreProps) {
  if (mostrando >= total) {
    return total > TAMANO_PAGINA ? (
      <p className="text-muted-foreground py-2 text-center text-sm">
        Se muestran los {total} tickets.
      </p>
    ) : null
  }

  const siguientes = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v && k !== 'ver') siguientes.set(k, v)
  }
  siguientes.set('ver', String(mostrando + TAMANO_PAGINA))

  const faltan = total - mostrando

  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <Button asChild variant="outline">
        <Link href={`${pathname}?${siguientes.toString()}`} scroll={false}>
          Ver más tickets
        </Link>
      </Button>
      <p className="text-muted-foreground text-xs">
        Mostrando {mostrando} de {total} · faltan {faltan}
      </p>
    </div>
  )
}
