'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface TicketDetailSheetProps {
  children: React.ReactNode
}

export function TicketDetailSheet({ children }: TicketDetailSheetProps) {
  const router = useRouter()
  const [open, setOpen] = useState(true)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setTimeout(() => router.back(), 200)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-6 sm:max-w-2xl"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Detalle del ticket</SheetTitle>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  )
}