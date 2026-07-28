'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Paperclip } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import {
  AttachmentList,
  attachmentsToUpload,
  useAttachments,
  type PickedAttachment,
} from '@/components/tickets/attachment-picker'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'

import { addComment } from '@/lib/actions/tickets'
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
  const [attachments, setAttachments] = useState<PickedAttachment[]>([])

  const { hiddenInput, open, removeAt, error, isFull } = useAttachments({
    value: attachments,
    onChange: setAttachments,
  })

  const form = useForm<CommentBodyInput>({
    resolver: zodResolver(commentBodySchema),
    defaultValues: { body: '' },
  })

  const body = form.watch('body')
  // Basta con texto O con adjuntos: se puede mandar solo una imagen.
  const canSubmit = (!!body?.trim() || attachments.length > 0) && !isPending

  function onSubmit(values: CommentBodyInput) {
    startTransition(async () => {
      const files = await attachmentsToUpload(attachments)
      const result = await addComment({
        ticketId,
        body: values.body,
        attachments: files,
      })

      if (!result.ok) {
        toast.error(result.message)
        return
      }

      toast.success('Comentario agregado')
      form.reset()
      setAttachments([])
      router.refresh()
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        {hiddenInput}

        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  placeholder="Escribe un comentario o actualización..."
                  rows={3}
                  className="resize-none"
                  disabled={isPending}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      if (canSubmit) form.handleSubmit(onSubmit)()
                    }
                  }}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <AttachmentList
          value={attachments}
          onRemove={removeAt}
          disabled={isPending}
        />

        {error && <p className="text-destructive text-xs">{error}</p>}

        {/* Adjuntar y Comentar, juntos y visibles */}
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={open}
            disabled={isPending || isFull}
          >
            <Paperclip className="size-4" />
            Adjuntar
          </Button>

          <Button type="submit" disabled={!canSubmit}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Comentar
          </Button>
        </div>
      </form>
    </Form>
  )
}
