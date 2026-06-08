'use client'

import { format, formatDistanceToNow, formatDistanceToNowStrict } from 'date-fns'
import { es } from 'date-fns/locale'
import { Check, Loader2, Pencil, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
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
import { TicketCommentForm } from '@/components/tickets/ticket-comment-form'
import { TicketPriorityBadge } from '@/components/tickets/ticket-priority-badge'
import { TicketStatusBadge } from '@/components/tickets/ticket-status-badge'

import { deleteTicket, updateTicketDetails } from '@/lib/actions/tickets'
import { CATEGORY_LABELS, STATUS_LABELS } from '@/lib/constants'
import type {
  ITUser,
  TicketComment,
  TicketDetails,
} from '@/lib/db/queries/tickets'
import type { TicketStatus, UserRole } from '@/lib/db/schema'

const STATUS_OPTIONS: TicketStatus[] = [
  'open',
  'in_progress',
  'waiting_user',
  'resolved',
  'closed',
]

export type TimelineItem =
  | { kind: 'comment'; data: TicketComment; createdAt: Date }
  | { kind: 'activity'; data: ActivityItem; createdAt: Date }

interface TicketInteractiveSectionProps {
  ticket: TicketDetails['ticket']
  creator: TicketDetails['creator']
  assignee: TicketDetails['assignee']
  itUsers: ITUser[]
  currentUserRole: UserRole
  timeline: TimelineItem[]
}

export function TicketInteractiveSection({
  ticket,
  creator,
  assignee,
  itUsers,
  currentUserRole,
  timeline,
}: TicketInteractiveSectionProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<TicketStatus>(
    ticket.status,
  )
  const [pendingAssignedToId, setPendingAssignedToId] = useState<string | null>(
    ticket.assignedToId ?? null,
  )

  const canEdit = currentUserRole === 'it' && !ticket.closedAt

  function handleEdit() {
    setPendingStatus(ticket.status)
    setPendingAssignedToId(ticket.assignedToId ?? null)
    setIsEditing(true)
  }

  function handleCancel() {
    setIsEditing(false)
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await updateTicketDetails({
        ticketId: ticket.id,
        ...(pendingStatus !== ticket.status && { status: pendingStatus }),
        ...(pendingAssignedToId !== (ticket.assignedToId ?? null) && {
          assignedToId: pendingAssignedToId,
        }),
      })

      if (!result.ok) {
        toast.error(result.message)
        return
      }

      toast.success('Ticket actualizado')
      setIsEditing(false)
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
      toast.success('Ticket eliminado')
      router.push('/tickets')
    })
  }

  return (
    <div className="space-y-8">
      {/* Detalles */}
      <Separator />
      <section className="space-y-5">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          Detalles
        </h2>

        <MetaField label="Estado">
          <div className="flex min-h-9 items-center">
            {isEditing ? (
              <Select
                value={pendingStatus}
                onValueChange={(v) => setPendingStatus(v as TicketStatus)}
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
            ) : (
              <TicketStatusBadge status={ticket.status} />
            )}
          </div>
        </MetaField>

        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          <MetaField label="Prioridad">
            <TicketPriorityBadge priority={ticket.priority} />
          </MetaField>
          <MetaField label="Categoría">
            <Badge>{CATEGORY_LABELS[ticket.category]}</Badge>
          </MetaField>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          <MetaField label="Reporta">
            <div className="font-medium flex min-h-8 items-center">{creator.name ?? creator.email}</div>
          </MetaField>
          <MetaField label="Atiende">
            <div className="font-medium flex min-h-8 items-center">
              {isEditing ? (
                <Select
                  value={pendingAssignedToId ?? 'unassigned'}
                  onValueChange={(v) =>
                    setPendingAssignedToId(v === 'unassigned' ? null : v)
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
                <div className="font-medium">
                  {assignee.name ?? assignee.email}
                </div>
              ) : (
                <div className="text-muted-foreground italic">Sin asignar</div>
              )}
            </div>
          </MetaField>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          <MetaField label="Creado">
            <div>
              {format(ticket.createdAt, "d 'de' MMM, yyyy", { locale: es })}
            </div>
          </MetaField>
          <MetaField label="Última actualización">
            <div suppressHydrationWarning>
              {formatDistanceToNow(ticket.updatedAt, {
                addSuffix: true,
                locale: es,
              })}
            </div>
          </MetaField>
          {ticket.resolvedAt && (
            <MetaField label="Resuelto">
              <div>
                {format(ticket.resolvedAt, "d 'de' MMM, yyyy", { locale: es })}
              </div>
            </MetaField>
          )}
        </div>
      </section>

      {/* Actividad */}
      <Separator />
      <section className="space-y-4">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          Actividad
        </h2>

        {timeline.length > 0 && (
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
                    <p className="whitespace-pre-wrap wrap-break-words text-sm leading-relaxed">
                      {comment.body}
                    </p>
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

      {/* Acciones IT — al fondo del ticket */}
      {canEdit && (
        <>
          <Separator />
          <div className="flex items-center justify-between pb-2">
            {isEditing ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    disabled={isPending}
                  >
                    <Trash2 className="size-4" />
                    Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar este ticket?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. El ticket, sus
                      comentarios y todo su historial serán eliminados
                      permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={isPending}
                    >
                      {isPending && <Loader2 className="size-4 animate-spin" />}
                      Sí, eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isPending}
                  >
                    <X className="size-4" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConfirm}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    Confirmar
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Pencil className="size-4" />
                  Editar
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function MetaField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
        {label}
      </div>
      {children}
    </div>
  )
}
