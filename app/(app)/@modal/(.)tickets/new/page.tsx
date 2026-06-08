'use client'

import { useRouter } from 'next/navigation'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TicketForm } from '@/components/tickets/ticket-form'

export default function NewTicketModal() {
  const router = useRouter()

  function close() {
    router.back()
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo ticket</DialogTitle>
          <DialogDescription>
            Describe tu problema y el equipo de IT lo atenderá.
          </DialogDescription>
        </DialogHeader>
        <TicketForm onSuccess={close} onCancel={close} />
      </DialogContent>
    </Dialog>
  )
}