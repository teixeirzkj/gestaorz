import { AnimatePresence, motion } from 'framer-motion'
import { Check, CircleDollarSign, Clock, Pencil, Plus, Repeat, RotateCcw, Trash2, TrendingUp, Wallet, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { RecForm } from '../components/RecForm'
import { Button, Empty, Field, Kpi, Modal, MonthNav, PageHeader, ease, stagger, useModal } from '../components/ui'
import { useData } from '../lib/data'
import { brl, currentMonth, fmtDate, monthOf, parseMoney, shiftMonth, sum, todayStr } from '../lib/format'
import { activeIn, occurrence } from '../lib/recurring'
import type { Recurring, Sale, SaleStatus } from '../lib/types'

const STATUS_LABEL: Record<SaleStatus, string> = { pendente: 'Pendente', paga: 'Paga', perdida: 'Perdida' }
const FILTERS: { id: SaleStatus | 'todas'; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'pendente', label: 'Pendentes' },
  { id: 'paga', label: 'Pagas' },
  { id: 'perdida', label: 'Perdidas' },
]

export default function Sales() {
  const { sales, recurring, payments } = useData()
  const today = todayStr()
  const [month, setMonth] = useState(currentMonth)
  const [filter, setFilter] = useState<SaleStatus | 'todas'>('todas')
  const modal = useModal<Sale | null>()
  const recModal = useModal<Recurring | null>()

  const subs = useMemo(
    () => recurring.rows.filter((r) => r.client && r.kind === 'receita' && activeIn(r, month)).sort((a, b) => b.amount - a.amount),
    [recurring.rows, month],
  )
  const mrr = sum(subs, (r) => r.amount)
  const subRows = subs.map((r) => {
    const date = occurrence(r, month).date
    const pay = payments.rows.find((p) => p.recurring_id === r.id && p.month === month)
    const state = pay ? 'paid' : date < today ? 'overdue' : date === today ? 'today' : 'ok'
    return { r, date, pay, state } as const
  })
  const subsPaid = sum(subRows.filter((s) => s.pay), (s) => s.r.amount)
  const subsToCharge = subRows.filter((s) => s.state === 'overdue' || s.state === 'today').length

  const inMonth = useMemo(
    () => sales.rows.filter((s) => monthOf(s.sale_date) === month).sort((a, b) => b.sale_date.localeCompare(a.sale_date)),
    [sales.rows, month],
  )
  const paid = inMonth.filter((s) => s.status === 'paga')
  const pending = inMonth.filter((s) => s.status === 'pendente')
  const lost = inMonth.filter((s) => s.status === 'perdida')
  const revenue = sum(paid, (s) => s.amount)
  const costs = sum(paid, (s) => s.cost)
  const list = filter === 'todas' ? inMonth : inMonth.filter((s) => s.status === filter)

  const setStatus = (s: Sale, status: SaleStatus) =>
    sales.update(s.id, { status, paid_at: status === 'paga' ? todayStr() : null })

  return (
    <>
      <PageHeader title="Vendas" subtitle="Lance vendas, marque como pagas ou perdidas e veja seu lucro.">
        <MonthNav value={month} onChange={setMonth} />
        <Button variant="primary" onClick={() => modal.show(null)}>
          <Plus size={16} aria-hidden /> Nova venda
        </Button>
      </PageHeader>

      <motion.div className="kpis kpis-5" variants={stagger} initial="hidden" animate="show" key={month}>
        <Kpi
          label="Mensalidades"
          value={brl(mrr)}
          hint={`${brl(subsPaid)} recebido · ${subsToCharge} a cobrar`}
          tone={subRows.some((s) => s.state === 'overdue') ? 'danger' : subsToCharge > 0 ? 'warn' : undefined}
          icon={<Repeat size={18} />}
        />
        <Kpi label="Recebido" value={brl(revenue)} hint={`${paid.length} venda(s) paga(s)`} icon={<CircleDollarSign size={18} />} />
        <Kpi label="A receber" value={brl(sum(pending, (s) => s.amount))} hint={`${pending.length} pendente(s)`} icon={<Clock size={18} />} />
        <Kpi label="Gasto nas vendas" value={brl(costs)} hint="Custos das vendas pagas" icon={<Wallet size={18} />} />
        <Kpi
          label="Lucro"
          value={brl(revenue - costs)}
          hint={revenue > 0 ? `Margem de ${Math.round(((revenue - costs) / revenue) * 100)}%` : 'Recebido menos custos'}
          icon={<TrendingUp size={18} />}
        />
      </motion.div>

      <div className="panel">
        <div className="panel-head">
          <div className="tabs" role="tablist" aria-label="Filtrar vendas">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={filter === f.id}
                className={`tab ${filter === f.id ? 'active' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {filter === f.id && (
                  <motion.span layoutId="sales-tab" className="tab-pill" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />
                )}
                <span>{f.label}</span>
              </button>
            ))}
          </div>
          {lost.length > 0 && (
            <span className="muted small">
              {lost.length} perdida(s) · {brl(sum(lost, (s) => s.amount))}
            </span>
          )}
        </div>

        {list.length === 0 ? (
          <Empty>Nenhuma venda aqui ainda. Clique em “Nova venda” para lançar a primeira.</Empty>
        ) : (
          <ul className="rows">
            <AnimatePresence initial={false}>
              {list.map((s) => (
                <motion.li
                  key={s.id}
                  layout="position"
                  className="row"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease }}
                >
                  <div className="row-main">
                    <strong>{s.client}</strong>
                    <span className="muted small">
                      {fmtDate(s.sale_date)}
                      {s.description && ` · ${s.description}`}
                    </span>
                  </div>
                  <div className="row-money">
                    <strong className={s.status === 'perdida' ? 'strike' : ''}>{brl(s.amount)}</strong>
                    <span className="muted small">
                      custo {brl(s.cost)} · lucro {brl(s.amount - s.cost)}
                    </span>
                  </div>
                  <span className={`badge badge-${s.status}`}>{STATUS_LABEL[s.status]}</span>
                  <div className="row-actions">
                    {s.status === 'pendente' ? (
                      <>
                        <Button size="sm" variant="primary" onClick={() => setStatus(s, 'paga')}>
                          <Check size={15} aria-hidden /> Marcar paga
                        </Button>
                        <Button size="sm" onClick={() => setStatus(s, 'perdida')}>
                          <X size={15} aria-hidden /> Perdida
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={() => setStatus(s, 'pendente')}>
                        <RotateCcw size={14} aria-hidden /> Reabrir
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" aria-label={`Editar venda de ${s.client}`} onClick={() => modal.show(s)}>
                      <Pencil size={15} aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Excluir venda de ${s.client}`}
                      onClick={() => confirm('Excluir esta venda?') && sales.remove(s.id)}
                    >
                      <Trash2 size={15} aria-hidden />
                    </Button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>Mensalidades (vendas recorrentes)</h2>
            <p className="muted small">Marque quem já pagou neste mês. As vencidas sem pagamento viram cobrança no Dashboard.</p>
          </div>
          <Button onClick={() => recModal.show(null)}>
            <Plus size={16} aria-hidden /> Nova mensalidade
          </Button>
        </div>
        {subs.length === 0 ? (
          <Empty>Nenhuma mensalidade ativa neste mês.</Empty>
        ) : (
          <ul className="rows">
            <AnimatePresence initial={false}>
              {subRows.map(({ r, date, pay, state }) => (
                <motion.li
                  key={r.id}
                  layout="position"
                  className="row"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease }}
                >
                  <div className="row-main">
                    <strong>{r.client}</strong>
                    <span className="muted small">
                      {r.description || 'Mensalidade'} · vence {fmtDate(date)}
                      {pay && ` · paga em ${fmtDate(pay.paid_at)}`}
                    </span>
                  </div>
                  <strong className="num">{brl(r.amount)} / mês</strong>
                  {state === 'paid' ? (
                    <span className="badge badge-paga">Paga</span>
                  ) : state === 'ok' ? (
                    <span className="badge badge-pendente">A receber</span>
                  ) : (
                    <span className={`due-chip due-${state}`}>{state === 'overdue' ? 'Atrasada · cobrar' : 'Vence hoje'}</span>
                  )}
                  <div className="row-actions">
                    {pay ? (
                      <Button size="sm" onClick={() => payments.remove(pay.id)}>
                        <RotateCcw size={14} aria-hidden /> Desfazer
                      </Button>
                    ) : (
                      <Button size="sm" variant="primary" onClick={() => payments.add({ recurring_id: r.id, month, paid_at: today })}>
                        <Check size={15} aria-hidden /> Marcar paga
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" aria-label={`Editar mensalidade de ${r.client}`} onClick={() => recModal.show(r)}>
                      <Pencil size={15} aria-hidden />
                    </Button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <Modal open={modal.open} onClose={modal.hide} title={modal.data ? 'Editar venda' : 'Nova venda'}>
        <SaleForm key={modal.nonce} sale={modal.data} month={month} onClose={modal.hide} />
      </Modal>

      <Modal open={recModal.open} onClose={recModal.hide} title={recModal.data ? 'Editar mensalidade' : 'Nova mensalidade'}>
        <RecForm key={recModal.nonce} rec={recModal.data} clientMode month={month} onClose={recModal.hide} />
      </Modal>
    </>
  )
}

function SaleForm({ sale, month, onClose }: { sale: Sale | null; month: string; onClose: () => void }) {
  const { sales, recurring } = useData()
  const [monthly, setMonthly] = useState('')
  const [day, setDay] = useState('20')
  const today = todayStr()
  const [client, setClient] = useState(sale?.client ?? '')
  const [description, setDescription] = useState(sale?.description ?? '')
  const [amount, setAmount] = useState(sale ? String(sale.amount).replace('.', ',') : '')
  const [cost, setCost] = useState(sale?.cost ? String(sale.cost).replace('.', ',') : '')
  const [date, setDate] = useState(sale?.sale_date ?? (monthOf(today) === month ? today : `${month}-01`))
  const [status, setStatus] = useState<SaleStatus>(sale?.status ?? 'pendente')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!client.trim() || !date) return
    const data = {
      client: client.trim(),
      description: description.trim(),
      amount: parseMoney(amount),
      cost: parseMoney(cost),
      sale_date: date,
      status,
      paid_at: status === 'paga' ? (sale?.paid_at ?? today) : null,
    }
    if (sale) sales.update(sale.id, data)
    else {
      sales.add(data)
      const fee = parseMoney(monthly)
      if (fee > 0) {
        const d = Math.min(31, Math.max(1, Math.round(Number(day)) || 20))
        // primeira mensalidade: neste mês se o dia ainda não passou na data da venda, senão no próximo
        const start = d >= Number(date.slice(8, 10)) ? monthOf(date) : shiftMonth(monthOf(date), 1)
        recurring.add({
          kind: 'receita',
          category: 'Mensalidade',
          description: data.description,
          client: data.client,
          amount: fee,
          day: d,
          start_month: start,
          end_month: null,
        })
      }
    }
    onClose()
  }

  return (
    <form className="form" onSubmit={submit}>
      <Field label="Cliente">
        <input value={client} onChange={(e) => setClient(e.target.value)} required maxLength={120} placeholder="Nome do cliente" />
      </Field>
      <Field label="Descrição">
        <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} placeholder="O que foi vendido" />
      </Field>
      <div className="form-row">
        <Field label="Valor da venda / implantação">
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="0,00" />
        </Field>
        <Field label="Custo / gasto" hint="Quanto você gastou para entregar">
          <input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0,00" />
        </Field>
      </div>
      {!sale && (
        <div className="form-row">
          <Field label="Mensalidade (opcional)" hint="Venda recorrente: entra nos ganhos todo mês">
            <input inputMode="decimal" value={monthly} onChange={(e) => setMonthly(e.target.value)} placeholder="0,00" />
          </Field>
          <Field label="Dia do recebimento">
            <input type="number" min={1} max={31} value={day} onChange={(e) => setDay(e.target.value)} />
          </Field>
        </div>
      )}
      <div className="form-row">
        <Field label="Data">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="Situação">
          <select value={status} onChange={(e) => setStatus(e.target.value as SaleStatus)}>
            <option value="pendente">Pendente</option>
            <option value="paga">Paga</option>
            <option value="perdida">Perdida</option>
          </select>
        </Field>
      </div>
      <div className="form-actions">
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="primary">
          Salvar
        </Button>
      </div>
    </form>
  )
}
