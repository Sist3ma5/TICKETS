'use client'

import { Download, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { formatMonthLabel } from '@/lib/constants'

/**
 * Descarga el Excel del periodo que se está viendo.
 *
 * Se hace con fetch en vez de un <a href> para poder mostrar el estado de
 * carga y avisar si falla: el archivo se arma en el servidor y con muchos
 * tickets tarda un momento, así que un enlace suelto parecería no responder.
 */
export function ExportMonthButton({ month }: { month: string | null }) {
  const [isPending, setIsPending] = useState(false)

  async function download() {
    setIsPending(true)
    try {
      const url = month
        ? `/api/stats/export?month=${encodeURIComponent(month)}`
        : '/api/stats/export'

      const res = await fetch(url)
      if (!res.ok) throw new Error(await res.text())

      const blob = await res.blob()

      // El nombre lo decide el servidor en Content-Disposition; se lee de ahí
      // para no repetir la lógica en dos lugares.
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match = disposition.match(/filename\*=UTF-8''([^;]+)/)
      const fileName = match
        ? decodeURIComponent(match[1])
        : 'estadisticas.xlsx'

      const href = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = href
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(href)

      toast.success(`Excel de ${month ? formatMonthLabel(month) : 'todo el histórico'} descargado`)
    } catch (err) {
      console.error(err)
      toast.error('No se pudo generar el Excel')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Button onClick={download} disabled={isPending}>
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
      Exportar a Excel
    </Button>
  )
}
