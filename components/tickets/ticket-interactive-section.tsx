'use client'

import { format, formatDistanceToNow, formatDistanceToNowStrict } from 'date-fns'
import { es } from 'date-fns/locale'
import { Loader2, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

import {
  TicketActivityItem,
  type ActivityItem,
} from '@/components/tickets/ticket-activity-item'
import { AttachmentView } from '@/components/tickets/attachment-picker'
import { TicketCategoryBadge } from '@/components/tickets/ticket-category-badge'
import { TicketCommentForm } from '@/components/tickets/ticket-comment-form'
import { TicketPriorityBadge } from '@/components/tickets/ticket-priority-badge'
import { TicketStatusBadge } from '@/components/tickets/ticket-status-badge'

import { deleteTicket, updateTicketDetails } from '@/lib/actions/tickets'
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  TICKET_CATEGORIES,
  formatTicketCode,
} from '@/lib/constants'
import type {
  ITUser,
  TicketAttachmentItem,
  TicketComment,
  TicketDetails,
} from '@/lib/db/queries/tickets'
import type {
  TicketCategory,
  TicketPriority,
  TicketStatus,
  UserRole,
} from '@/lib/db/schema'

const STATUS_OPTIONS: TicketStatus[] = [
  'open',
  'in_progress',
  'waiting_user',
  'resolved',
  'closed',
]

const PRIORITY_OPTIONS: TicketPriority[] = ['low', 'medium', 'high']

export type TimelineItem =
  | { kind: 'comment'; data: TicketComment; createdAt: Date }
  | { kind: 'activity'; data: ActivityItem; createdAt: Date }

interface TicketInteractiveSectionProps {
  ticket: TicketDetails['ticket']
  creator: TicketDetails['creator']
  assignee: TicketDetails['assignee']
  attachments: TicketAttachmentItem[]
  itUsers: ITUser[]
  currentUserRole: UserRole
  timeline: TimelineItem[]
}

export function TicketInteractiveSection({
  ticket,
  creator,
  assignee,
  attachments,
  itUsers,
  currentUserRole,
  timeline,
}: TicketInteractiveSectionProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const isAdmin = currentUserRole === 'admin'
  const isStaff = currentUserRole === 'it' || isAdmin
  // Un ticket cerrado se congela para IT, pero el admin puede reabrirlo o
  // corregirlo. Sin esto, un cierre por error quedaba sin arreglo posible.
  const canEdit = isStaff && (!ticket.closedAt || isAdmin)
  // El borrado es exclusivo del rol Admin, incluso en tickets cerrados.
  const canDelete = isAdmin

  // Adjuntos del ticket (sin comentario). Los de comentarios se muestran
  // dentro de cada comentario en la Actividad.
  const ticketFiles = attachments.filter((a) => !a.commentId)

  /** Guarda al instante cualquier cambio de los selects. */
  function save(
    patch: Parameters<typeof updateTicketDetails>[0] extends infer T
      ? Omit<Extract<T, object>, 'ticketId'>
      : never,
  ) {
    startTransition(async () => {
      const result = await updateTicketDetails({
        ticketId: ticket.id,
        ...patch,
      })

      if (!result.ok) {
        toast.error(result.message)
        return
      }

      toast.success('Ticket actualizado')
      router.refresh()
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTicket(ticket.id)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      // Se sale con una recarga real del navegador, no con el router.
      //
      // Una navegación del router mantiene viva la aplicación y Next alcanza
      // a re-renderizar esta ruta —cuyo ticket ya no existe— antes de irse:
      // ahí es donde asomaba el 404. Al recargar, el navegador abandona la
      // página por completo y la lista se pide limpia al servidor.
      //
      // `replace` en vez de `assign`: el ticket borrado no queda en el
      // historial, así "Atrás" no regresa a una página muerta.
      const code = formatTicketCode(ticket.category, ticket.number)
      window.location.replace(
        `/tickets/all?eliminado=${encodeURIComponent(code)}`,
      )
    })
  }

  return (
    <div className="space-y-8">
      {/* Se avisa que está cerrado pero editable: si no, el admin no entiende
          por qué a él sí le dejan mover los campos y a los demás no. */}
      {ticket.closedAt && isAdmin && (
        <p className="text-muted-foreground bg-muted/40 rounded-md border px-3 py-2 text-xs">
          Este ticket está cerrado. Como administrador puedes reabrirlo
          cambiando su estado, o eliminarlo.
        </p>
      )}

      {/* Estado · Categoría · Prioridad — siempre a la vista */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Field label="Estado">
          {canEdit ? (
            <Select
              value={ticket.status}
              disabled={isPending}
              onValueChange={(v) => save({ status: v as TicketStatus })}
            >
              <SelectTrigger className="w-full">
                <span className="flex min-w-0 items-center gap-2">
                  <Dot color={STATUS_COLORS[ticket.status]} />
                  <SelectValue />
                </span>
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    <Dot color={STATUS_COLORS[s]} />
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <TicketStatusBadge status={ticket.status} />
          )}
        </Field>

        <Field label="Categoría">
          {canEdit ? (
            <Select
              value={ticket.category}
              disabled={isPending}
              onValueChange={(v) => save({ category: v as TicketCategory })}
            >
              {/* Cerrado: solo el icono de la categoría.
                  Abierto: los nombres de todas las categorías. */}
              <SelectTrigger
                className="w-full"
                aria-label={CATEGORY_LABELS[ticket.category]}
              >
                {(() => {
                  const Icon = CATEGORY_ICONS[ticket.category]
                  return (
                    <Icon
                      className="size-4 shrink-0"
                      style={{ color: CATEGORY_COLORS[ticket.category] }}
                      aria-hidden
                    />
                  )
                })()}
              </SelectTrigger>
              <SelectContent>
                {TICKET_CATEGORIES.map((c) => {
                  const Icon = CATEGORY_ICONS[c]
                  return (
                    <SelectItem key={c} value={c}>
                      <Icon
                        className="size-4 shrink-0"
                        style={{ color: CATEGORY_COLORS[c] }}
                        aria-hidden
                      />
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          ) : (
            <TicketCategoryBadge category={ticket.category} />
          )}
        </Field>

        <Field label="Prioridad">
          {canEdit ? (
            <Select
              value={ticket.priority}
              disabled={isPending}
              onValueChange={(v) => save({ priority: v as TicketPriority })}
            >
              <SelectTrigger className="w-full">
                <span className="flex min-w-0 items-center gap-2">
                  <Dot color={PRIORITY_COLORS[ticket.priority]} />
                  <SelectValue />
                </span>
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    <Dot color={PRIORITY_COLORS[p]} />
                    {PRIORITY_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <TicketPriorityBadge priority={ticket.priority} />
          )}
        </Field>
      </section>

      {/* Personas y fechas */}
      <section className="grid grid-cols-2 gap-4 text-sm">
        <Field label="Reporta">
          <span className="font-medium">{creator.name ?? creator.email}</span>
        </Field>
        <Field label="Atiende">
          {canEdit ? (
            <Select
              value={ticket.assignedToId ?? 'unassigned'}
              disabled={isPending}
              onValueChange={(v) =>
                save({ assignedToId: v === 'unassigned' ? null : v })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">
                  <span className="italic">Sin asignar</span>
                </SelectItem>
                {itUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name ?? u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : assignee ? (
            <span className="font-medium">
              {assignee.name ?? assignee.email}
            </span>
          ) : (
            <span className="text-muted-foreground italic">Sin asignar</span>
          )}
        </Field>
        <Field label="Creado">
          <span>{format(ticket.createdAt, "d 'de' MMM, yyyy", { locale: es })}</span>
        </Field>
        <Field label="Actualizado">
          <span suppressHydrationWarning>
            {formatDistanceToNow(ticket.updatedAt, {
              addSuffix: true,
              locale: es,
            })}
          </span>
        </Field>
      </section>

      {/* Archivos adjuntos del ticket (los de comentarios se ven en Actividad) */}
      <Separator />
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
          <span className="text-muted-foreground">Archivos adjuntos</span>
          <Badge variant="secondary" className="text-[10px]">
            {ticketFiles.length}
          </Badge>
        </h2>

        {ticketFiles.length === 0 ? (
          <p className="text-muted-foreground text-sm italic">
            Sin archivos adjuntos.
          </p>
        ) : (
          <AttachmentView items={ticketFiles} />
        )}
      </section>

      {/* Actividad */}
      <Separator />
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
          <span className="text-muted-foreground">Actividad</span>
          <Badge variant="secondary" className="text-[10px]">
            {timeline.length}
          </Badge>
        </h2>

        {timeline.length === 0 ? (
          <p className="text-muted-foreground text-sm italic">
            Aún no hay comentarios. Agrega el primer seguimiento.
          </p>
        ) : (
          <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
            {timeline.map((item) => {
              if (item.kind === 'comment') {
                const { comment, author } = item.data
                return (
                  <div
                    key={`comment-${comment.id}`}
                    className="bg-muted space-y-2 rounded-md p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold">
                        {author.name ?? author.email}
                      </span>
                      {author.role === 'it' && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] tracking-wider uppercase"
                        >
                          IT
                        </Badge>
                      )}
                      <span
                        className="text-muted-foreground ml-auto text-xs"
                        suppressHydrationWarning
                      >
                        {formatDistanceToNowStrict(comment.createdAt, {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                    </div>
                    {/* Un comentario de solo adjuntos no lleva texto. */}
                    {comment.body && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-words">
                        {comment.body}
                      </p>
                    )}
                    <AttachmentView
                      items={attachments.filter(
                        (a) => a.commentId === comment.id,
                      )}
                    />
                  </div>
                )
              }

              return (
                <TicketActivityItem
                  key={`${item.data.type}-${item.data.entry.id}`}
                  item={item.data}
                  createdAt={item.createdAt}
                />
              )
            })}
          </div>
        )}

        <TicketCommentForm ticketId={ticket.id} />
      </section>

      {/* Eliminar — solo Admin */}
      {canDelete && (
        <>
          <Separator />
          <div className="flex justify-start pb-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  Eliminar ticket
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar este ticket?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. El ticket, sus comentarios
                    y todo su historial serán eliminados permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isPending}
                  >
                    Sí, eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      )}
    </div>
  )
}

function Dot({ color }: { color: string }) {
  return (
    <span
      className="size-2 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
        {label}
      </div>
      <div className="flex min-h-9 items-center">{children}</div>
    </div>
  )
}
