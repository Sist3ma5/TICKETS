'use client'

import { MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'

interface UserChatLinkProps {
  name: string | null
  email: string
  className?: string
}

/**
 * Nombre de una persona que abre Google Chat para escribirle.
 *
 * Google NO publica un enlace para abrir una conversación directa con
 * alguien a partir de su correo: existe en la API, pero no como URL, y hay
 * una petición abierta en su issue tracker pidiéndolo
 * (issuetracker.google.com/issues/384844201).
 *
 * Así que se hace lo más cercano posible en un clic: se abre Google Chat y
 * se copia el correo al portapapeles, para pegarlo en "Nuevo chat" sin
 * tener que escribirlo ni ir a buscarlo al ticket.
 */
export function UserChatLink({ name, email, className }: UserChatLinkProps) {
  const mostrado = name ?? email

  async function abrirChat(e: React.MouseEvent) {
    // Frena el <Link> que cubre la tarjeta completa: sin esto el clic
    // navegaría al ticket en vez de abrir el chat.
    e.preventDefault()
    e.stopPropagation()

    let copiado = false
    try {
      await navigator.clipboard.writeText(email)
      copiado = true
    } catch {
      // Sin permiso de portapapeles: se abre Chat de todos modos.
    }

    window.open('https://chat.google.com/', '_blank', 'noopener,noreferrer')

    toast.success(`Google Chat abierto`, {
      description: copiado
        ? `${email} está copiado — pégalo en "Nuevo chat".`
        : `Busca a ${mostrado} en "Nuevo chat".`,
    })
  }

  return (
    <button
      type="button"
      onClick={abrirChat}
      title={`Escribirle a ${mostrado} por Google Chat`}
      className={cn(
        'group/chat relative z-20 inline-flex max-w-full items-center gap-1.5 rounded text-left',
        'hover:text-foreground hover:underline focus-visible:underline',
        className,
      )}
    >
      <span className="truncate">{mostrado}</span>
      <MessageSquare className="size-3 shrink-0 opacity-0 transition-opacity group-hover/chat:opacity-60" />
    </button>
  )
}
