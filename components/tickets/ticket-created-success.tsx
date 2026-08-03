'use client'

import { Check } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'

interface TicketCreatedSuccessProps {
  ticketId: string
  /** Folio ya formateado, ej. "SFW-0152". */
  ticketCode: string
  /** Cierra el diálogo. Si no viene, se muestra solo el enlace al ticket. */
  onClose?: () => void
}

/**
 * Confirmación que aparece al crear un ticket.
 *
 * Antes el formulario solo lanzaba un aviso pequeño y cerraba: el usuario se
 * quedaba viendo la pantalla anterior sin saber si su solicitud se registró.
 * Aquí se le dice explícitamente que sí quedó, con su folio, para que tenga
 * algo concreto a qué referirse después.
 */
export function TicketCreatedSuccess({
  ticketId,
  ticketCode,
  onClose,
}: TicketCreatedSuccessProps) {
  return (
    <div className="flex flex-col items-center gap-6 px-4 py-10 text-center">
      {/* Palomita: el aro crece y se desvanece una sola vez. */}
      <div className="relative flex size-20 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-[#16a34a]/25 [animation-iteration-count:2]" />
        <span className="animate-in zoom-in-50 relative flex size-20 items-center justify-center rounded-full bg-[#16a34a] duration-500">
          <Check className="size-10 text-white" strokeWidth={3} aria-hidden />
        </span>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 space-y-2 delay-150 duration-500">
        <h2 className="text-xl font-semibold tracking-tight">
          ¡Gracias por tu ticket!
        </h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          En seguida tendremos tu solución. Te avisaremos por correo en cuanto
          alguien lo tome y cada vez que haya novedades.
        </p>
      </div>

      <div className="animate-in fade-in space-y-1 delay-300 duration-500">
        <p className="text-muted-foreground text-[10px] font-medium tracking-[0.18em] uppercase">
          Tu folio
        </p>
        <p className="font-mono text-lg font-bold tracking-tight">
          {ticketCode}
        </p>
      </div>

      <div className="animate-in fade-in flex flex-wrap justify-center gap-2 delay-500 duration-500">
        <Button asChild variant="outline">
          <Link href={`/ticket/${ticketId}`}>Ver mi ticket</Link>
        </Button>
        {onClose && <Button onClick={onClose}>Listo</Button>}
      </div>
    </div>
  )
}
