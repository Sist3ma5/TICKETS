'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import {
  AttachmentDropzone,
  attachmentsToUpload,
  type PickedAttachment,
} from '@/components/tickets/attachment-picker'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import { createTicket } from '@/lib/actions/tickets'
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  formatTicketCode,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  TICKET_CATEGORIES,
} from '@/lib/constants'
import type { TicketPriority } from '@/lib/db/schema'
import { cn } from '@/lib/utils'
import {
  createTicketSchema,
  type CreateTicketInput,
} from '@/lib/validations/ticket'

const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high']

interface NewTicketFormProps {
  /** Siguiente folio, para mostrar el "ID automático" en vivo. */
  nextNumber: number
  /** Si se pasa, se llama tras crear en vez de navegar (uso en modal). */
  onSuccess?: (ticketId: string) => void
  /** Si se pasa, controla el botón Cancelar (uso en modal). */
  onCancel?: () => void
}

export function NewTicketForm({
  nextNumber,
  onSuccess,
  onCancel,
}: NewTicketFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [attachments, setAttachments] = useState<PickedAttachment[]>([])

  const form = useForm<CreateTicketInput>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
    },
  })

  // Para el preview del folio en vivo.
  const selectedCategory = form.watch('category')

  function onSubmit(values: CreateTicketInput) {
    startTransition(async () => {
      const files = await attachmentsToUpload(attachments)
      const result = await createTicket({ ...values, attachments: files })

      if (!result.ok) {
        toast.error(result.message)
        return
      }

      toast.success('Ticket creado')

      if (onSuccess) {
        onSuccess(result.ticketId)
      } else {
        router.push(`/ticket/${result.ticketId}`)
      }
      router.refresh()
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Categoría — grid con iconos para identificarla de un vistazo */}
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>¿Qué tipo de ayuda necesitas?</FormLabel>
              <FormControl>
                <div className="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-4">
                  {TICKET_CATEGORIES.map((cat) => {
                    const Icon = CATEGORY_ICONS[cat]
                    const color = CATEGORY_COLORS[cat]
                    const selected = field.value === cat

                    return (
                      <button
                        key={cat}
                        type="button"
                        disabled={isPending}
                        aria-pressed={selected}
                        onClick={() => field.onChange(cat)}
                        className={cn(
                          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border p-4 text-center transition-colors',
                          'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                          selected
                            ? 'text-foreground'
                            : 'border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                        )}
                        style={
                          selected
                            ? {
                                borderColor: color,
                                backgroundColor: `${color}18`,
                              }
                            : undefined
                        }
                      >
                        <Icon
                          className="size-6 shrink-0"
                          style={{ color }}
                          aria-hidden
                        />
                        <span className="text-xs leading-tight font-medium">
                          {CATEGORY_LABELS[cat]}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Título */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título</FormLabel>
              <FormControl>
                <Input
                  placeholder="Resume el problema en una línea"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Descripción */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormDescription>
                Incluye qué pasó, desde cuándo y qué has intentado.
              </FormDescription>
              <FormControl>
                <Textarea
                  placeholder="Describe el problema con el mayor detalle posible..."
                  rows={6}
                  className="resize-none"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Prioridad + preview del folio que se asignará */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridad</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isPending}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{
                            backgroundColor: PRIORITY_COLORS[field.value],
                          }}
                          aria-hidden
                        />
                        <SelectValue placeholder="Selecciona una prioridad" />
                      </span>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: PRIORITY_COLORS[p] }}
                          aria-hidden
                        />
                        {PRIORITY_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="border-border bg-muted/20 flex flex-col justify-center rounded-md border px-3 py-2">
            <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
              ID automático
            </span>
            <span
              className="mt-1 font-mono text-sm font-bold tracking-wider"
              style={{
                color: selectedCategory
                  ? CATEGORY_COLORS[selectedCategory]
                  : undefined,
              }}
            >
              {selectedCategory
                ? formatTicketCode(selectedCategory, nextNumber)
                : '—'}
            </span>
          </div>
        </div>

        {/* Adjuntos — capturas o documentos para ayuda remota */}
        <div className="space-y-2">
          <p className="text-sm leading-none font-medium">
            Adjuntos{' '}
            <span className="text-muted-foreground font-normal">
              Opcional · máximo 10 MB por archivo
            </span>
          </p>
          <AttachmentDropzone
            value={attachments}
            onChange={setAttachments}
            disabled={isPending}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => (onCancel ? onCancel() : router.back())}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Crear ticket
          </Button>
        </div>
      </form>
    </Form>
  )
}
