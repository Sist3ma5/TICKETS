import { NewTicketDialog } from '@/components/tickets/new-ticket-dialog'
import { getNextTicketNumber } from '@/lib/db/queries/tickets'

export default async function NewTicketModal() {
  const nextNumber = await getNextTicketNumber()

  return <NewTicketDialog nextNumber={nextNumber} />
}
