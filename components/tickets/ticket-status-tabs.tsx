'use client'

import { STATUS_COLORS } from '@/lib/constants'
import type { TicketStatus } from '@/lib/db/schema'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

type StatusFilter = 'all' | TicketStatus

const TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'open', label: 'Abierto' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'waiting_user', label: 'Esperando' },
  { value: 'resolved', label: 'Resuelto' },
  { value: 'closed', label: 'Cerrado' },
]

interface TicketStatusTabsProps {
  counts: Record<StatusFilter, number>
}

export function TicketStatusTabs({ counts }: TicketStatusTabsProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeStatus = (searchParams.get('status') ?? 'all') as StatusFilter

  function buildHref(value: StatusFilter) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('status')
    } else {
      params.set('status', value)
    }
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  return (
    <nav className="border-border flex flex-wrap items-center gap-x-6 gap-y-1 border-b">
      {TABS.map((tab) => {
        const isActive = activeStatus === tab.value
        return (
          <Link
            key={tab.value}
            href={buildHref(tab.value)}
            scroll={false}
            className={cn(
              '-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors',
              isActive
                ? 'border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            {tab.value !== 'all' && (
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[tab.value] }}
                aria-hidden
              />
            )}
            {tab.label}
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[11px] font-semibold',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {counts[tab.value]}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
