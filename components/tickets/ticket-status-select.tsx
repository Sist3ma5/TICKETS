'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TicketStatus } from '@/lib/db/schema'
import { STATUS_LABELS } from '@/lib/constants'

const STATUS_OPTIONS: TicketStatus[] = [
  'open',
  'in_progress',
  'waiting_user',
  'resolved',
  'closed',
]

interface TicketStatusSelectProps {
  ticketId: string
  currentStatus: TicketStatus
}

export function TicketStatusSelect({
  ticketId,
  currentStatus,
}: TicketStatusSelectProps) {
  return (
    <Select
      value={currentStatus}
      onValueChange={(value) => {
        // TODO: cablear updateTicketStatus action en el paso de IT actions
        console.log('Cambiar estado a:', value, 'ticket:', ticketId)
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((s) => (
          <SelectItem key={s} value={s}>
            {STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}