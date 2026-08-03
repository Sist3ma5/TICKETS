'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { assignCategoryResponsible } from '@/lib/actions/admin'
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  TICKET_CATEGORIES,
} from '@/lib/constants'
import type { AdminUser } from '@/lib/dev-mock'
import type { TicketCategory } from '@/lib/db/schema'

const UNASSIGNED = 'unassigned'

export function CategoryRouting({ itUsers }: { itUsers: AdminUser[] }) {
  // Mapa inicial categoría → responsable, derivado de las categorías
  // que cada técnico tiene asignadas hoy (primer técnico que la atiende).
  const [assignments, setAssignments] = useState<
    Record<string, string | null>
  >(() => {
    const map: Record<string, string | null> = {}
    for (const cat of TICKET_CATEGORIES) {
      const tech = itUsers.find((u) => u.categories.includes(cat))
      map[cat] = tech?.id ?? null
    }
    return map
  })
  const [isPending, startTransition] = useTransition()

  function assign(category: TicketCategory, userId: string | null) {
    setAssignments((prev) => ({ ...prev, [category]: userId }))
    startTransition(async () => {
      const result = await assignCategoryResponsible({ category, userId })
      if (!result.ok) toast.error(result.message)
      else toast.success('Responsable actualizado')
    })
  }

  return (
    // overflow-x-auto: en celular la tabla se desliza en vez de desbordar.
    <div className="border-border overflow-x-auto rounded-lg border">
      <table className="w-full min-w-120 text-sm">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr className="text-left">
            <th className="px-4 py-3 font-medium">Categoría</th>
            <th className="px-4 py-3 font-medium">
              Responsable (recibe los tickets)
            </th>
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {TICKET_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat]
            const color = CATEGORY_COLORS[cat]
            return (
              <tr key={cat}>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2 font-medium">
                    <Icon className="size-4 shrink-0" style={{ color }} />
                    {CATEGORY_LABELS[cat]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Select
                    value={assignments[cat] ?? UNASSIGNED}
                    disabled={isPending}
                    onValueChange={(v) =>
                      assign(cat, v === UNASSIGNED ? null : v)
                    }
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED}>
                        <span className="italic">Sin asignar</span>
                      </SelectItem>
                      {itUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
