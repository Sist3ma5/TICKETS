import { z } from 'zod'

export const createTicketSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'El título debe tener al menos 5 caracteres')
    .max(200, 'El título no puede exceder 200 caracteres'),
  description: z
    .string()
    .trim()
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(5000, 'La descripción no puede exceder 5,000 caracteres'),
  priority: z.enum(['low', 'medium', 'high'], {
    message: 'Selecciona una prioridad',
  }),
  category: z.enum(['hardware', 'software', 'network', 'access', 'other'], {
    message: 'Selecciona una categoría',
  }),
})

export type CreateTicketInput = z.infer<typeof createTicketSchema>
