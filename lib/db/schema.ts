import { relations } from 'drizzle-orm'
import {
    index,
    integer,
    pgEnum,
    pgTable,
    primaryKey,
    text,
    timestamp,
    uuid,
    varchar,
} from 'drizzle-orm/pg-core'
import type { AdapterAccountType } from 'next-auth/adapters'

// ============================================================
// Enums
// ============================================================

export const userRoleEnum = pgEnum('user_role', ['user', 'it'])

export const ticketStatusEnum = pgEnum('ticket_status', [
  'open',
  'in_progress',
  'waiting_user',
  'resolved',
  'closed',
])

export const ticketPriorityEnum = pgEnum('ticket_priority', [
  'low',
  'medium',
  'high',
])

export const ticketCategoryEnum = pgEnum('ticket_category', [
  'hardware',
  'software',
  'network',
  'access',
  'other',
])

// ============================================================
// Auth.js — tablas requeridas por el adapter de Drizzle
// (extendemos `users` con campos propios)
// ============================================================

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  role: userRoleEnum('role').notNull().default('user'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const accounts = pgTable('accounts', {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  }),
)

// Expected by NextAuth.js for sessions management, not actually needed.
export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
)

// ============================================================
// Dominio: tickets
// ============================================================

export const tickets = pgTable('tickets', {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description').notNull(),
    status: ticketStatusEnum('status').notNull().default('open'),
    priority: ticketPriorityEnum('priority').notNull().default('medium'),
    category: ticketCategoryEnum('category').notNull().default('other'),
    createdById: uuid('created_by_id').notNull().references(() => users.id),
    assignedToId: uuid('assigned_to_id').references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    resolvedAt: timestamp('resolved_at'),
    closedAt: timestamp('closed_at'),
  },
  (t) => ({
    // "Mis tickets" del usuario, ordenados por fecha.
    createdByIdx: index('tickets_created_by_idx').on(
      t.createdById,
      t.createdAt,
    ),
    // Cola de tickets por estado para el dashboard.
    statusIdx: index('tickets_status_idx').on(t.status, t.createdAt),
    // "Tickets asignados a mí" del ingeniero.
    assignedIdx: index('tickets_assigned_idx').on(t.assignedToId, t.status),
  }),
)

export const ticketComments = pgTable(
  'ticket_comments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id),
    body: text('body').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (c) => ({
    ticketIdx: index('ticket_comments_ticket_idx').on(c.ticketId, c.createdAt),
  }),
)

// Historial de cambios de estado. Se llena automáticamente desde
// la Server Action que cambia el estado del ticket.
// Habilita métricas reales en el dashboard (tiempo de resolución,
// rebotes entre estados, productividad por ingeniero).
export const ticketStatusHistory = pgTable(
  'ticket_status_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    changedById: uuid('changed_by_id')
      .notNull()
      .references(() => users.id),
    // Null cuando es la creación del ticket (no hay "from").
    fromStatus: ticketStatusEnum('from_status'),
    toStatus: ticketStatusEnum('to_status').notNull(),
    note: text('note'),
    changedAt: timestamp('changed_at').notNull().defaultNow(),
  },
  (h) => ({
    ticketIdx: index('ticket_status_history_ticket_idx').on(
      h.ticketId,
      h.changedAt,
    ),
  }),
)

// Adjuntos: archivos guardados en Vercel Blob.
// La URL apunta al Blob; `pathname` se guarda para poder borrar
// desde el SDK de @vercel/blob si en el futuro habilitamos borrado.
export const ticketAttachments = pgTable(
  'ticket_attachments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    uploadedById: uuid('uploaded_by_id')
      .notNull()
      .references(() => users.id),
    fileName: text('file_name').notNull(),
    fileSize: integer('file_size').notNull(),
    mimeType: text('mime_type').notNull(),
    url: text('url').notNull(),
    pathname: text('pathname').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (a) => ({
    ticketIdx: index('ticket_attachments_ticket_idx').on(a.ticketId),
  }),
)

// ============================================================
// Relations — API relacional de Drizzle para joins type-safe.
// Ej: db.query.tickets.findFirst({
//       where: eq(tickets.id, id),
//       with: { createdBy: true, assignedTo: true, comments: true }
//     })
// ============================================================

export const usersRelations = relations(users, ({ many }) => ({
  ticketsCreated: many(tickets, { relationName: 'createdBy' }),
  ticketsAssigned: many(tickets, { relationName: 'assignedTo' }),
  comments: many(ticketComments),
  statusChanges: many(ticketStatusHistory),
  attachmentsUploaded: many(ticketAttachments),
}))

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [tickets.createdById],
    references: [users.id],
    relationName: 'createdBy',
  }),
  assignedTo: one(users, {
    fields: [tickets.assignedToId],
    references: [users.id],
    relationName: 'assignedTo',
  }),
  comments: many(ticketComments),
  statusHistory: many(ticketStatusHistory),
  attachments: many(ticketAttachments),
}))

export const ticketCommentsRelations = relations(ticketComments, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketComments.ticketId],
    references: [tickets.id],
  }),
  author: one(users, {
    fields: [ticketComments.authorId],
    references: [users.id],
  }),
}))

export const ticketStatusHistoryRelations = relations(
  ticketStatusHistory,
  ({ one }) => ({
    ticket: one(tickets, {
      fields: [ticketStatusHistory.ticketId],
      references: [tickets.id],
    }),
    changedBy: one(users, {
      fields: [ticketStatusHistory.changedById],
      references: [users.id],
    }),
  }),
)

export const ticketAttachmentsRelations = relations(
  ticketAttachments,
  ({ one }) => ({
    ticket: one(tickets, {
      fields: [ticketAttachments.ticketId],
      references: [tickets.id],
    }),
    uploadedBy: one(users, {
      fields: [ticketAttachments.uploadedById],
      references: [users.id],
    }),
  }),
)

// ============================================================
// Tipos inferidos — útiles en Server Actions, validaciones, etc.
// ============================================================

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type UserRole = (typeof userRoleEnum.enumValues)[number]

export type Ticket = typeof tickets.$inferSelect
export type NewTicket = typeof tickets.$inferInsert
export type TicketStatus = (typeof ticketStatusEnum.enumValues)[number]
export type TicketPriority = (typeof ticketPriorityEnum.enumValues)[number]
export type TicketCategory = (typeof ticketCategoryEnum.enumValues)[number]

export type TicketComment = typeof ticketComments.$inferSelect
export type NewTicketComment = typeof ticketComments.$inferInsert

export type TicketStatusHistory = typeof ticketStatusHistory.$inferSelect
export type NewTicketStatusHistory = typeof ticketStatusHistory.$inferInsert

export type TicketAttachment = typeof ticketAttachments.$inferSelect
export type NewTicketAttachment = typeof ticketAttachments.$inferInsert