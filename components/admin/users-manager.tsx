'use client'

import { ChevronDown, Search } from 'lucide-react'
import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { updateUserCategories, updateUserRole } from '@/lib/actions/admin'
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  ROLE_LABELS,
  TICKET_CATEGORIES,
} from '@/lib/constants'
import type { AdminUser } from '@/lib/dev-mock'
import type { TicketCategory, UserRole } from '@/lib/db/schema'

const ROLES: UserRole[] = ['user', 'it', 'admin']

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export function UsersManager({ users }: { users: AdminUser[] }) {
  const [rows, setRows] = useState(users)
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    )
  }, [rows, query])

  function changeRole(userId: string, role: UserRole) {
    setRows((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, role, categories: role === 'it' ? u.categories : [] }
          : u,
      ),
    )
    startTransition(async () => {
      const result = await updateUserRole({ userId, role })
      if (!result.ok) toast.error(result.message)
      else toast.success('Rol actualizado')
    })
  }

  function toggleCategory(userId: string, category: TicketCategory) {
    let next: TicketCategory[] = []
    setRows((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u
        next = u.categories.includes(category)
          ? u.categories.filter((c) => c !== category)
          : [...u.categories, category]
        return { ...u, categories: next }
      }),
    )
    startTransition(async () => {
      const result = await updateUserCategories({ userId, categories: next })
      if (!result.ok) toast.error(result.message)
    })
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar usuario por nombre o correo..."
          className="pl-9"
        />
      </div>

      <div className="border-border overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr className="text-left">
            <th className="px-4 py-3 font-medium">Usuario</th>
            <th className="px-4 py-3 font-medium">Rol</th>
            <th className="px-4 py-3 font-medium">Categorías que atiende</th>
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {visible.length === 0 && (
            <tr>
              <td
                colSpan={3}
                className="text-muted-foreground px-4 py-8 text-center text-sm"
              >
                No se encontraron usuarios.
              </td>
            </tr>
          )}
          {visible.map((u) => (
            <tr key={u.id} className="align-middle">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">
                      {initials(u.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{u.name}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {u.email}
                    </p>
                  </div>
                </div>
              </td>

              <td className="px-4 py-3">
                <Select
                  value={u.role}
                  disabled={isPending}
                  onValueChange={(v) => changeRole(u.id, v as UserRole)}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>

              <td className="px-4 py-3">
                {u.role === 'it' ? (
                  <CategoryPicker
                    selected={u.categories}
                    disabled={isPending}
                    onToggle={(c) => toggleCategory(u.id, c)}
                  />
                ) : (
                  <span className="text-muted-foreground text-xs italic">
                    No aplica
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </div>
  )
}

function CategoryPicker({
  selected,
  disabled,
  onToggle,
}: {
  selected: TicketCategory[]
  disabled?: boolean
  onToggle: (category: TicketCategory) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selected.length > 0 ? (
        selected.map((c) => {
          const Icon = CATEGORY_ICONS[c]
          const color = CATEGORY_COLORS[c]
          return (
            <Badge
              key={c}
              variant="outline"
              className="gap-1"
              style={{ borderColor: `${color}55`, color }}
            >
              <Icon className="size-3" />
              {CATEGORY_LABELS[c]}
            </Badge>
          )
        })
      ) : (
        <span className="text-muted-foreground text-xs italic">
          Sin categorías
        </span>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={disabled}>
            Asignar
            <ChevronDown className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuLabel className="text-[10px] tracking-wider uppercase">
            Categorías que atiende
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {TICKET_CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICONS[c]
            return (
              <DropdownMenuCheckboxItem
                key={c}
                checked={selected.includes(c)}
                onCheckedChange={() => onToggle(c)}
                onSelect={(e) => e.preventDefault()}
              >
                <Icon
                  className="size-4"
                  style={{ color: CATEGORY_COLORS[c] }}
                />
                {CATEGORY_LABELS[c]}
              </DropdownMenuCheckboxItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
