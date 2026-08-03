'use client'

import { Trash2 } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * Aviso de "ticket eliminado" que se muestra al volver a la lista.
 *
 * No se puede enseñar en la pantalla del ticket: al borrarlo, la Server Action
 * revalida y el router vuelve a pedir esa ruta, que ya no existe, y sale un
 * 404. Por eso la confirmación viaja en la URL hasta la lista y se muestra
 * aquí, donde sí hay algo que mostrar.
 *
 * El parámetro se limpia solo, para que recargar no reviva el aviso.
 */
export function TicketDeletedBanner() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const code = searchParams.get('eliminado')

  // Se guarda cuál folio ya se ocultó en vez de un booleano: así la
  // visibilidad se deriva del parámetro actual y no hay que sincronizar
  // estado dentro del efecto.
  const [ocultado, setOcultado] = useState<string | null>(null)
  const visible = Boolean(code) && ocultado !== code

  useEffect(() => {
    if (!code) return

    const ocultar = setTimeout(() => setOcultado(code), 4000)
    const limpiar = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('eliminado')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    }, 4400)

    return () => {
      clearTimeout(ocultar)
      clearTimeout(limpiar)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  if (!code || !visible) return null

  return (
    <div
      role="status"
      className="animate-in fade-in slide-in-from-top-2 flex items-center gap-3 rounded-lg border border-[#dc2626]/30 bg-[#dc2626]/10 px-4 py-3 duration-300"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#dc2626]">
        <Trash2 className="size-4.5 text-white" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">Ticket eliminado</p>
        <p className="text-muted-foreground text-xs">
          El folio <span className="font-mono font-medium">{code}</span> se
          borró definitivamente junto con sus comentarios y adjuntos.
        </p>
      </div>
    </div>
  )
}
