import { currentMonth, monthOf, shiftMonth } from './format'
import type { MonthBalance, RecPayment, Recurring, Tx } from './types'

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

/** Ganhos − gastos − reserva de um mês. */
export const monthNet = (txs: Tx[], recs: Recurring[], ym: string) =>
  monthTxs(txs, recs, ym).reduce((acc, t) => acc + (t.kind === 'receita' ? t.amount : -t.amount), 0)

/**
 * Saldo no começo do mês: o valor informado pelo usuário ou, se não houver,
 * o saldo final do mês anterior (a partir do último saldo informado).
 */
export const openingBalance = (balances: MonthBalance[], txs: Tx[], recs: Recurring[], ym: string) => {
  const exact = balances.find((b) => b.month === ym)
  if (exact) return { amount: Number(exact.amount) || 0, source: 'informado' as const, row: exact }
  const prev = balances.filter((b) => b.month < ym).sort((a, b) => b.month.localeCompare(a.month))[0]
  if (!prev) return { amount: 0, source: 'vazio' as const, row: null }
  let amount = Number(prev.amount) || 0
  let m = prev.month
  for (let i = 0; i < 240 && m < ym; i++, m = shiftMonth(m, 1)) amount += monthNet(txs, recs, m)
  return { amount, source: 'anterior' as const, row: null }
}

export interface Charge {
  rec: Recurring
  month: string
  date: string
}

/** Mensalidades de clientes já vencidas (até hoje) e ainda não marcadas como pagas. */
export const pendingCharges = (recs: Recurring[], payments: RecPayment[], today: string): Charge[] => {
  const paid = new Set(payments.map((p) => p.recurring_id + ':' + p.month))
  const now = today.slice(0, 7)
  const out: Charge[] = []
  for (const rec of recs) {
    if (!rec.client || rec.kind !== 'receita') continue
    let ym = now
    for (let i = 0; i < 24 && ym >= rec.start_month; i++, ym = shiftMonth(ym, -1)) {
      if (!activeIn(rec, ym) || paid.has(rec.id + ':' + ym)) continue
      const date = occurrence(rec, ym).date
      if (date <= today) out.push({ rec, month: ym, date })
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

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
