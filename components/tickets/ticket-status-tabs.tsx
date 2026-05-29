'use client'

import type { TicketStatus } from '@/lib/db/schema'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

type StatusFilter = 'all' | TicketStatus

const TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'open', label: 'Abiertos' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'waiting_user', label: 'Esperando' },
  { value: 'resolved', label: 'Resueltos' },
  { value: 'closed', label: 'Cerrados' },
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
    <nav className="flex items-center gap-1 border-b">
      {TABS.map((tab) => {
        const isActive = activeStatus === tab.value
        return (
          <Link
            key={tab.value}
            href={buildHref(tab.value)}
            scroll={false}
            className={cn(
              '-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'border-foreground text-foreground'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            {tab.label}
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-xs font-medium',
                isActive
                  ? 'bg-foreground/10'
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
