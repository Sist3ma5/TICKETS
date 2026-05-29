'use client'

import { useEffect, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

export function TicketsSearch() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [value, setValue] = useState(() => searchParams.get('q') ?? '')

  useEffect(() => {
    const timer = setTimeout(() => {
      const currentQ = searchParams.get('q') ?? ''
      if (value === currentQ) return

      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set('q', value)
      } else {
        params.delete('q')
      }
      const qs = params.toString()

      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      })
    }, 300)

    return () => clearTimeout(timer)
    // intencionalmente sin searchParams en deps para evitar loops:
    // este efecto solo debe correr cuando el usuario tipea, no cuando
    // otros componentes (tabs, filters) cambian la URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="relative w-full max-w-sm">
      {isPending ? (
        <Loader2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      ) : (
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      )}
      <Input
        type="text"
        placeholder="Buscar por título..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-9 pr-9"
      />
      {value && !isPending && (
        <button
          type="button"
          onClick={() => setValue('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Limpiar búsqueda"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}