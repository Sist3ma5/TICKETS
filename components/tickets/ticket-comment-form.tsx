'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowUp, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'

import { addComment } from '@/lib/actions/tickets'
import { cn } from '@/lib/utils'
import {
  commentBodySchema,
  type CommentBodyInput,
} from '@/lib/validations/ticket'

interface TicketCommentFormProps {
  ticketId: string
}

export function TicketCommentForm({ ticketId }: TicketCommentFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<CommentBodyInput>({
    resolver: zodResolver(commentBodySchema),
    defaultValues: {
      body: '',
    },
  })

  const body = form.watch('body')
  const canSubmit = !!body?.trim() && !isPending

  function onSubmit(values: CommentBodyInput) {
    startTransition(async () => {
      const result = await addComment({
        ticketId,
        body: values.body,
      })

      if (!result.ok) {
        toast.error(result.message)
        return
      }

      toast.success('Comentario agregado')
      form.reset()
      router.refresh()
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="relative">
                  <Textarea
                    placeholder="Escribe un comentario..."
                    rows={3}
                    className="resize-none pr-12"
                    disabled={isPending}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        if (canSubmit) form.handleSubmit(onSubmit)()
                      }
                    }}
                    {...field}
                  />
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    aria-label="Enviar comentario"
                    className={cn(
                      'absolute right-2.5 bottom-2.5 flex size-7 items-center justify-center rounded-full transition-colors',
                      canSubmit
                        ? 'bg-foreground text-background hover:bg-foreground/85'
                        : 'bg-muted text-muted-foreground/50',
                    )}
                  >
                    {isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ArrowUp className="size-4" />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}
