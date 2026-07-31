import 'server-only'

import { db } from '@/lib/db'
import { DEV_BYPASS_AUTH, getMockTicketMonths } from '@/lib/dev-mock'
import type { TicketCategory, TicketPriority } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'

/**
 * Consultas de análisis para la página de Estadísticas.
 *
 * Son agregados sobre toda la tabla de tickets, así que se calculan en la BD
 * (no se traen las filas). Cada una devuelve ya el dato listo para pintar.
 */

// `db.execute` con el driver de Neon devuelve { rows: [...] }.
async function rows<T>(query: Parameters<typeof db.execute>[0]): Promise<T[]> {
  const result = await db.execute(query)
  return (result as unknown as { rows: T[] }).rows ?? []
}

/** Postgres devuelve `numeric` como string; lo pasamos a número. */
function num(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/**
 * Acota una consulta al mes indicado ('YYYY-MM'), o no filtra nada si viene
 * vacío. Se compara siempre contra `created_at`: el criterio es "tickets
 * levantados en ese mes", el mismo en todas las métricas para que los
 * números de la pantalla cuadren entre sí.
 *
 * Devuelve un fragmento que empieza con `and`, así que quien lo use debe
 * tener ya un `where` (aunque sea `where true`).
 */
function monthFilter(month: string | undefined, column = sql`created_at`) {
  return month ? sql` and to_char(${column}, 'YYYY-MM') = ${month}` : sql``
}

/** Opciones comunes de las consultas de análisis. */
export interface StatsFilters {
  /** Mes en formato 'YYYY-MM'. Sin él, se calcula sobre todo el histórico. */
  month?: string
}

// ============================================================
// Prioridad
// ============================================================

export async function getPriorityCounts({ month }: StatsFilters = {}): Promise<
  Record<TicketPriority, number>
> {
  const empty: Record<TicketPriority, number> = { low: 0, medium: 0, high: 0 }
  if (DEV_BYPASS_AUTH) return empty

  const result = await rows<{ priority: TicketPriority; n: number }>(
    sql`select priority, count(*)::int as n from tickets
        where true${monthFilter(month)}
        group by priority`,
  )

  for (const r of result) empty[r.priority] = r.n
  return empty
}

// ============================================================
// Tiempos de atención
// ============================================================

export interface ResolutionStats {
  /** Tickets que ya se cerraron (base del cálculo). */
  closed: number
  /** Mediana de días entre creación y cierre. */
  medianDays: number
  /** Promedio de días — sube con los casos extremos. */
  avgDays: number
  /** El ticket que más tardó. */
  maxDays: number
}

export async function getResolutionStats({
  month,
}: StatsFilters = {}): Promise<ResolutionStats> {
  if (DEV_BYPASS_AUTH) {
    return { closed: 0, medianDays: 0, avgDays: 0, maxDays: 0 }
  }

  const [r] = await rows<{
    closed: number
    median_days: string | null
    avg_days: string | null
    max_days: string | null
  }>(sql`
    select
      count(*)::int as closed,
      round((percentile_cont(0.5) within group (
        order by extract(epoch from (closed_at - created_at)) / 86400
      ))::numeric, 1) as median_days,
      round(avg(
        extract(epoch from (closed_at - created_at)) / 86400
      )::numeric, 1) as avg_days,
      round(max(
        extract(epoch from (closed_at - created_at)) / 86400
      )::numeric, 1) as max_days
    from tickets
    where closed_at is not null and closed_at >= created_at${monthFilter(month)}
  `)

  return {
    closed: r?.closed ?? 0,
    medianDays: num(r?.median_days),
    avgDays: num(r?.avg_days),
    maxDays: num(r?.max_days),
  }
}

export interface CategoryResolution {
  category: TicketCategory
  closed: number
  medianDays: number
}

/** Mediana de días para cerrar, por categoría. Revela dónde se atora el proceso. */
export async function getResolutionByCategory({
  month,
}: StatsFilters = {}): Promise<CategoryResolution[]> {
  if (DEV_BYPASS_AUTH) return []

  const result = await rows<{
    category: TicketCategory
    closed: number
    median_days: string | null
  }>(sql`
    select
      category,
      count(*)::int as closed,
      round((percentile_cont(0.5) within group (
        order by extract(epoch from (closed_at - created_at)) / 86400
      ))::numeric, 1) as median_days
    from tickets
    where closed_at is not null and closed_at >= created_at${monthFilter(month)}
    group by category
    order by median_days desc nulls last
  `)

  return result.map((r) => ({
    category: r.category,
    closed: r.closed,
    medianDays: num(r.median_days),
  }))
}

/** Mediana de horas hasta el primer comentario de alguien distinto al solicitante. */
export async function getFirstResponseHours({
  month,
}: StatsFilters = {}): Promise<{
  answered: number
  medianHours: number
}> {
  if (DEV_BYPASS_AUTH) return { answered: 0, medianHours: 0 }

  const [r] = await rows<{ answered: number; median_hours: string | null }>(sql`
    with primeras as (
      select t.id, t.created_at, min(c.created_at) as first_reply
      from tickets t
      join ticket_comments c
        on c.ticket_id = t.id and c.author_id <> t.created_by_id
      where true${monthFilter(month, sql`t.created_at`)}
      group by t.id, t.created_at
    )
    select
      count(*)::int as answered,
      round((percentile_cont(0.5) within group (
        order by extract(epoch from (first_reply - created_at)) / 3600
      ))::numeric, 1) as median_hours
    from primeras
    where first_reply >= created_at
  `)

  return { answered: r?.answered ?? 0, medianHours: num(r?.median_hours) }
}

// ============================================================
// Backlog: lo que sigue abierto
// ============================================================

export interface AgingBucket {
  key: string
  label: string
  count: number
  /** Marca el tramo que ya debería preocupar. */
  critical: boolean
}

/** Antigüedad de los tickets que siguen sin cerrarse. */
export async function getBacklogAging({
  month,
}: StatsFilters = {}): Promise<AgingBucket[]> {
  const buckets: AgingBucket[] = [
    { key: 'd0', label: 'Menos de 3 días', count: 0, critical: false },
    { key: 'd3', label: '3 a 7 días', count: 0, critical: false },
    { key: 'd7', label: '7 a 15 días', count: 0, critical: false },
    { key: 'd15', label: '15 a 30 días', count: 0, critical: false },
    { key: 'd30', label: 'Más de 30 días', count: 0, critical: true },
  ]
  if (DEV_BYPASS_AUTH) return buckets

  const result = await rows<{ bucket: string; n: number }>(sql`
    select
      case
        when extract(epoch from (now() - created_at)) / 86400 < 3  then 'd0'
        when extract(epoch from (now() - created_at)) / 86400 < 7  then 'd3'
        when extract(epoch from (now() - created_at)) / 86400 < 15 then 'd7'
        when extract(epoch from (now() - created_at)) / 86400 < 30 then 'd15'
        else 'd30'
      end as bucket,
      count(*)::int as n
    from tickets
    where closed_at is null${monthFilter(month)}
    group by bucket
  `)

  for (const r of result) {
    const b = buckets.find((x) => x.key === r.bucket)
    if (b) b.count = r.n
  }
  return buckets
}

/** Tickets activos que no tienen a nadie asignado. */
export async function getUnassignedActive({
  month,
}: StatsFilters = {}): Promise<number> {
  if (DEV_BYPASS_AUTH) return 0

  const [r] = await rows<{ n: number }>(sql`
    select count(*)::int as n
    from tickets
    where assigned_to_id is null and closed_at is null${monthFilter(month)}
  `)
  return r?.n ?? 0
}

/** Tickets que volvieron a abrirse después de resolverse o cerrarse. */
export async function getReopenedCount({
  month,
}: StatsFilters = {}): Promise<number> {
  if (DEV_BYPASS_AUTH) return 0

  // Se cuenta contra el mes en que se creó el ticket, no el de la reapertura,
  // para que cuadre con el resto de métricas del periodo.
  const [r] = await rows<{ n: number }>(sql`
    select count(distinct h.ticket_id)::int as n
    from ticket_status_history h
    join tickets t on t.id = h.ticket_id
    where h.from_status in ('closed', 'resolved')
      and h.to_status in ('open', 'in_progress', 'waiting_user')
      ${monthFilter(month, sql`t.created_at`)}
  `)
  return r?.n ?? 0
}

// ============================================================
// Personas
// ============================================================

export interface TechWorkload {
  name: string
  total: number
  /** Los que todavía trae encima. */
  active: number
}

/** Cuántos tickets carga cada técnico — muestra si el trabajo está parejo. */
export async function getWorkloadByTech({
  month,
}: StatsFilters = {}): Promise<TechWorkload[]> {
  if (DEV_BYPASS_AUTH) return []

  return rows<TechWorkload>(sql`
    select
      u.name,
      count(*)::int as total,
      count(*) filter (where t.closed_at is null)::int as active
    from tickets t
    join users u on u.id = t.assigned_to_id
    where true${monthFilter(month, sql`t.created_at`)}
    group by u.name
    order by total desc
  `)
}

export interface Requester {
  name: string
  total: number
}

/** Quién levanta más tickets — señala áreas que necesitan apoyo o capacitación. */
export async function getTopRequesters(
  limit = 6,
  { month }: StatsFilters = {},
): Promise<Requester[]> {
  if (DEV_BYPASS_AUTH) return []

  return rows<Requester>(sql`
    select u.name, count(*)::int as total
    from tickets t
    join users u on u.id = t.created_by_id
    where true${monthFilter(month, sql`t.created_at`)}
    group by u.name
    order by total desc
    limit ${limit}
  `)
}

// ============================================================
// Tendencia
// ============================================================

/**
 * Meses que tienen al menos un ticket, del más reciente al más antiguo.
 * Alimenta el selector de periodo: así solo se ofrecen meses con datos,
 * en vez de una lista fija que se quedaría corta al llegar agosto.
 */
export async function getTicketMonths(): Promise<
  { month: string; total: number }[]
> {
  // ⚠️ Solo desarrollo/visual: meses de ejemplo sin BD.
  if (DEV_BYPASS_AUTH) return getMockTicketMonths()

  return rows<{ month: string; total: number }>(sql`
    select to_char(created_at, 'YYYY-MM') as month, count(*)::int as total
    from tickets
    group by 1
    order by 1 desc
  `)
}

export interface MonthlyFlow {
  month: string
  label: string
  created: number
  closed: number
}

/** Creados vs cerrados por mes: dice si el equipo va al corriente o acumula. */
export async function getMonthlyFlow(months = 6): Promise<MonthlyFlow[]> {
  if (DEV_BYPASS_AUTH) return []

  const result = await rows<{
    month: string
    created: number
    closed: number
  }>(sql`
    select
      to_char(m, 'YYYY-MM') as month,
      (select count(*) from tickets t
        where date_trunc('month', t.created_at) = m)::int as created,
      (select count(*) from tickets t
        where date_trunc('month', t.closed_at) = m)::int as closed
    from generate_series(
      greatest(
        date_trunc('month', now()) - make_interval(months => ${months - 1}),
        -- No pintar meses anteriores al primer ticket: saldrían vacíos.
        coalesce(
          (select min(date_trunc('month', created_at)) from tickets),
          date_trunc('month', now())
        )
      ),
      date_trunc('month', now()),
      interval '1 month'
    ) as m
    order by m
  `)

  const MESES = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
  ]

  return result.map((r) => {
    const monthIndex = Number(r.month.slice(5, 7)) - 1
    return {
      month: r.month,
      label: `${MESES[monthIndex] ?? r.month} ${r.month.slice(2, 4)}`,
      created: r.created,
      closed: r.closed,
    }
  })
}
