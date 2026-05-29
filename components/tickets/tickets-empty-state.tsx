import Link from 'next/link'
import { Inbox, SearchX } from 'lucide-react'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Button } from '@/components/ui/button'

interface TicketsEmptyStateProps {
  hasFilters: boolean
  pathname: string
}

export function TicketsEmptyState({
  hasFilters,
  pathname,
}: TicketsEmptyStateProps) {
  if (hasFilters) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX />
          </EmptyMedia>
          <EmptyTitle>Ningún ticket encontrado</EmptyTitle>
          <EmptyDescription>
            Ajusta o limpia los filtros para ver más resultados.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" asChild>
            <Link href={pathname}>Limpiar filtros</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox />
        </EmptyMedia>
        <EmptyTitle>Aún no hay tickets</EmptyTitle>
        <EmptyDescription>
          Cuando se creen tickets, aparecerán aquí.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}