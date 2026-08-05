'use client'

import { useRouter } from 'next/navigation'

import { NewTicketForm } from '@/components/tickets/new-ticket-form'
import type { TicketCategory } from '@/lib/db/schema'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function NewTicketDialog({
  nextNumber,
  categorias,
}: {
  nextNumber: number
  /** Categorías activas del catálogo. */
  categorias?: TicketCategory[]
}) {
  const router = useRouter()

  function close() {
    router.back()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <p className="text-primary text-[10px] font-semibold tracking-[0.12em] uppercase">
            Nueva solicitud
          </p>
          <DialogTitle>Crear ticket</DialogTitle>
          <DialogDescription className="sr-only">
            Formulario para crear un nuevo ticket de soporte.
          </DialogDescription>
        </DialogHeader>

        <NewTicketForm
          nextNumber={nextNumber}
          categorias={categorias}
          onSuccess={close}
          onCancel={close}
        />
      </DialogContent>
    </Dialog>
  )
}
