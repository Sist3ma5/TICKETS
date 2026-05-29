import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NewTicketButton() {
  return (
    <Button asChild size="lg">
      <Link href="/tickets/new">
        <Plus className="size-4" />
        Nuevo ticket
      </Link>
    </Button>
  )
}