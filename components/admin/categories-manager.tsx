'use client'

import { Pencil, Plus, Tag, Trash2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import {
  createCategory,
  deleteCategory,
  updateCategory,
} from '@/lib/actions/admin'
import { CATEGORY_ICONS } from '@/lib/constants'
import { cn } from '@/lib/utils'

export interface CategoryItem {
  key: string
  label: string
  prefix: string
  color: string
}

const PRESET_COLORS = [
  '#a78bfa',
  '#60a5fa',
  '#2dd4bf',
  '#fbbf24',
  '#fb7185',
  '#818cf8',
  '#22d3ee',
  '#34d399',
  '#f97316',
  '#f472b6',
  '#8993a5',
]

function iconFor(key: string) {
  return CATEGORY_ICONS[key as keyof typeof CATEGORY_ICONS] ?? Tag
}

export function CategoriesManager({ categories }: { categories: CategoryItem[] }) {
  const [rows, setRows] = useState(categories)
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState<CategoryItem | null>(null)
  const [creating, setCreating] = useState(false)

  function handleDelete(key: string) {
    setRows((prev) => prev.filter((c) => c.key !== key))
    startTransition(async () => {
      const result = await deleteCategory({ key })
      if (!result.ok) toast.error(result.message)
      else toast.success('Categoría eliminada')
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          Agregar categoría
        </Button>
      </div>

      <div className="border-border overflow-hidden rounded-lg border">
        <ul className="divide-border divide-y">
          {rows.map((cat) => {
            const Icon = iconFor(cat.key)
            return (
              <li
                key={cat.key}
                className="flex items-center gap-3 px-4 py-3"
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-md border"
                  style={{
                    color: cat.color,
                    backgroundColor: `${cat.color}18`,
                    borderColor: `${cat.color}33`,
                  }}
                >
                  <Icon className="size-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{cat.label}</p>
                  <p className="text-muted-foreground font-mono text-xs tracking-wider">
                    {cat.prefix}-0000
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditing(cat)}
                  aria-label={`Editar ${cat.label}`}
                >
                  <Pencil className="size-4" />
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      aria-label={`Quitar ${cat.label}`}
                      disabled={isPending}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        ¿Quitar la categoría “{cat.label}”?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Los tickets existentes de esta categoría deberán
                        reasignarse a otra. Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(cat.key)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Sí, quitar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Editar */}
      <CategoryDialog
        open={!!editing}
        mode="edit"
        initial={editing}
        pending={isPending}
        onOpenChange={(o) => !o && setEditing(null)}
        onSubmit={(data) => {
          setRows((prev) =>
            prev.map((c) => (c.key === data.key ? { ...c, ...data } : c)),
          )
          startTransition(async () => {
            const result = await updateCategory(data)
            if (!result.ok) toast.error(result.message)
            else toast.success('Categoría actualizada')
          })
          setEditing(null)
        }}
      />

      {/* Agregar */}
      <CategoryDialog
        open={creating}
        mode="create"
        initial={null}
        pending={isPending}
        onOpenChange={setCreating}
        onSubmit={(data) => {
          startTransition(async () => {
            const result = await createCategory({
              label: data.label,
              prefix: data.prefix,
              color: data.color,
            })
            if (!result.ok) {
              toast.error(result.message)
              return
            }
            setRows((prev) => [
              ...prev,
              { ...data, key: data.label.toLowerCase().replace(/\s+/g, '-') },
            ])
            toast.success('Categoría agregada')
          })
          setCreating(false)
        }}
      />
    </div>
  )
}

function CategoryDialog({
  open,
  mode,
  initial,
  pending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  mode: 'create' | 'edit'
  initial: CategoryItem | null
  pending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CategoryItem) => void
}) {
  const [label, setLabel] = useState('')
  const [prefix, setPrefix] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])

  // Sincroniza los campos cada vez que se abre.
  const [lastOpen, setLastOpen] = useState(false)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) {
      setLabel(initial?.label ?? '')
      setPrefix(initial?.prefix ?? '')
      setColor(initial?.color ?? PRESET_COLORS[0])
    }
  }

  const Icon = initial ? iconFor(initial.key) : Tag

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Agregar categoría' : 'Editar categoría'}
          </DialogTitle>
          <DialogDescription>
            El nombre, prefijo y color se usan en toda la app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cat-label">Nombre</Label>
            <Input
              id="cat-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ej. Impresoras"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cat-prefix">Prefijo del folio (2–4 letras)</Label>
            <Input
              id="cat-prefix"
              value={prefix}
              maxLength={4}
              onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              placeholder="Ej. IMP"
              className="font-mono uppercase"
            />
            <p className="text-muted-foreground text-xs">
              Vista previa:{' '}
              <span className="font-mono" style={{ color }}>
                {(prefix || 'XXX').padEnd(3, 'X')}-0083
              </span>
            </p>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${c}`}
                  onClick={() => setColor(c)}
                  className={cn(
                    'size-7 rounded-full border-2 transition-transform',
                    color === c
                      ? 'scale-110 border-foreground'
                      : 'border-transparent',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="bg-muted/40 flex items-center gap-2 rounded-md border p-3">
            <span
              className="flex size-8 items-center justify-center rounded-md"
              style={{ color, backgroundColor: `${color}18` }}
            >
              <Icon className="size-4" />
            </span>
            <span className="text-sm font-medium">
              {label || 'Nombre de la categoría'}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={pending || label.trim().length < 2}
            onClick={() =>
              onSubmit({
                key: initial?.key ?? label.toLowerCase().replace(/\s+/g, '-'),
                label: label.trim(),
                prefix: (prefix || 'XXX').toUpperCase(),
                color,
              })
            }
          >
            {mode === 'create' ? 'Agregar' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
