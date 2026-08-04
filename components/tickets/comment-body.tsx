'use client'

import { Check, Pencil, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { updateComment } from '@/lib/actions/tickets'
import { playSound } from '@/lib/sounds'
import { cn } from '@/lib/utils'

interface CommentBodyProps {
  commentId: string
  body: string
  createdAt: Date
  updatedAt: Date
  /** Solo el autor ve el lápiz. El servidor valida igual. */
  canEdit: boolean
}

/**
 * Texto de un comentario, editable en el mismo lugar.
 *
 * Como en WhatsApp: se edita en línea y queda la marca de "editado", en vez
 * de borrar y volver a escribir —que perdería el hilo de la conversación.
 *
 * La marca sale de comparar `updated_at` con `created_at`: al insertarse los
 * dos traen el mismo valor, así que si difieren es porque se editó. No hizo
 * falta una columna nueva.
 */
export function CommentBody({
  commentId,
  body,
  createdAt,
  updatedAt,
  canEdit,
}: CommentBodyProps) {
  const router = useRouter()
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(body)
  const [isPending, startTransition] = useTransition()

  const fueEditado = updatedAt.getTime() > createdAt.getTime()

  function guardar() {
    const limpio = texto.trim()
    if (!limpio) {
      toast.error('El comentario no puede quedar vacío.')
      return
    }
    if (limpio === body) {
      setEditando(false)
      return
    }

    startTransition(async () => {
      const r = await updateComment({ commentId, body: limpio })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      playSound('comentario')
      setEditando(false)
      router.refresh()
    })
  }

  function cancelar() {
    setTexto(body)
    setEditando(false)
  }

  if (editando) {
    return (
      <div className="space-y-2">
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={3}
          autoFocus
          disabled={isPending}
          className="resize-none text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              guardar()
            }
            if (e.key === 'Escape') cancelar()
          }}
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={guardar} disabled={isPending}>
            <Check className="size-3.5" />
            Guardar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={cancelar}
            disabled={isPending}
          >
            <X className="size-3.5" />
            Cancelar
          </Button>
          <span className="text-muted-foreground text-[11px]">
            Enter para guardar · Esc para cancelar
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="group/comentario relative">
      <p className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-words">
        {body}
        {fueEditado && (
          <span
            className="text-muted-foreground ml-1.5 text-[11px] italic"
            title={`Editado ${updatedAt.toLocaleString('es-MX')}`}
          >
            (editado)
          </span>
        )}
      </p>

      {canEdit && (
        <button
          type="button"
          onClick={() => setEditando(true)}
          aria-label="Editar comentario"
          className={cn(
            'text-muted-foreground hover:text-foreground absolute -top-1 right-0 rounded p-1',
            'opacity-0 transition-opacity group-hover/comentario:opacity-100 focus-visible:opacity-100',
          )}
        >
          <Pencil className="size-3.5" />
        </button>
      )}
    </div>
  )
}
