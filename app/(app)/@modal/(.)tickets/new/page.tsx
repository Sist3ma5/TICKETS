import { getActiveCategories } from '@/lib/db/queries/categories'
import { NewTicketDialog } from '@/components/tickets/new-ticket-dialog'
import { getNextTicketNumber } from '@/lib/db/queries/tickets'

export const dynamic = 'force-dynamic'

export default async function NewTicketModal() {
  const nextNumber = await getNextTicketNumber()

  return (
    <NewTicketDialog
      nextNumber={nextNumber}
      categorias={(await getActiveCategories()).map((c) => c.key)}
    />
  )
}
