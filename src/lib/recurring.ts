import { currentMonth, monthOf } from './format'
import type { Recurring, Tx } from './types'

export const activeIn = (r: Recurring, ym: string) => r.start_month <= ym && (!r.end_month || ym <= r.end_month)

/** Lançamento "virtual" de um fixo em determinado mês. */
export const occurrence = (r: Recurring, ym: string): Tx => {
  const [y, m] = ym.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  const day = Math.min(Math.max(r.day, 1), last)
  return {
    id: `rec:${r.id}:${ym}`,
    kind: r.kind,
    category: r.category,
    description: r.client ? `${r.description || 'Mensalidade'} · ${r.client}` : r.description,
    amount: r.amount,
    date: `${ym}-${String(day).padStart(2, '0')}`,
    created_at: r.created_at,
    recurring: r,
  }
}

/** Lançamentos avulsos + fixos de um mês. */
export const monthTxs = (txs: Tx[], recs: Recurring[], ym: string): Tx[] => [
  ...txs.filter((t) => monthOf(t.date) === ym),
  ...recs.filter((r) => activeIn(r, ym)).map((r) => occurrence(r, ym)),
]

const countMonths = (from: string, to: string) => {
  const [ya, ma] = from.split('-').map(Number)
  const [yb, mb] = to.split('-').map(Number)
  return Math.max(0, (yb - ya) * 12 + (mb - ma) + 1)
}

/** Reserva acumulada até o mês atual (avulsos + fixos). */
export const totalReserva = (txs: Tx[], recs: Recurring[]) => {
  const now = currentMonth()
  const fixed = recs
    .filter((r) => r.kind === 'reserva')
    .reduce((acc, r) => acc + r.amount * countMonths(r.start_month, r.end_month && r.end_month < now ? r.end_month : now), 0)
  return fixed + txs.filter((t) => t.kind === 'reserva').reduce((acc, t) => acc + t.amount, 0)
}
