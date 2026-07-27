import { NewTicketForm } from '@/components/tickets/new-ticket-form'
import { getNextTicketNumber } from '@/lib/db/queries/tickets'

export default async function NewTicketPage() {
  const nextNumber = await getNextTicketNumber()

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-1">
        <p className="text-primary text-[10px] font-semibold tracking-[0.12em] uppercase">
          Nueva solicitud
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Crear ticket</h1>
        <p className="text-muted-foreground text-sm">
          Cuéntanos qué necesitas y el equipo de IT lo atenderá.
        </p>
      </header>

      <NewTicketForm nextNumber={nextNumber} />
    </div>
  )
}
