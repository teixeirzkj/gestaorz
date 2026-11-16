import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, Pencil, PiggyBank, Plus, Repeat, Scale, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartLegend, ChartTip, axisProps, C } from '../components/charts'
import { KIND_LABEL, RecForm } from '../components/RecForm'
import { Button, Empty, Field, Kpi, Modal, MonthNav, PageHeader, ease, stagger, useModal } from '../components/ui'
import { useData } from '../lib/data'
import { brl, brlShort, currentMonth, fmtDate, lastMonths, monthLabel, monthOf, parseMoney, sum, todayStr } from '../lib/format'
import { monthTxs, totalReserva } from '../lib/recurring'
import type { Recurring, Tx, TxKind } from '../lib/types'

const CATEGORIES: Record<TxKind, string[]> = {
  receita: ['Salário', 'Vendas', 'Mensalidade', 'Freelance', 'Comissão', 'Outros'],
  despesa: ['Moradia', 'Alimentação', 'Transporte', 'Ferramentas', 'Marketing', 'Impostos', 'Lazer', 'Outros'],
  reserva: ['Reserva de emergência', 'Investimento', 'Objetivo'],
}

const of = (rows: Tx[], kind: TxKind) => sum(rows.filter((t) => t.kind === kind), (t) => t.amount)

export default function Finance() {
  const { txs, recurring } = useData()
  const reduce = useReducedMotion()
  const [month, setMonth] = useState(currentMonth)
  const modal = useModal<{ tx: Tx | null; kind: TxKind }>()
  const recModal = useModal<Recurring>()
  const today = todayStr()

  const inMonth = useMemo(
    () => monthTxs(txs.rows, recurring.rows, month).sort((a, b) => b.date.localeCompare(a.date)),
    [txs.rows, recurring.rows, month],
  )
  const income = of(inMonth, 'receita')
  const expense = of(inMonth, 'despesa')
  const saved = of(inMonth, 'reserva')
  const left = income - expense - saved
  const totalSaved = useMemo(() => totalReserva(txs.rows, recurring.rows), [txs.rows, recurring.rows])
  const fixedIncome = sum(inMonth.filter((t) => t.recurring && t.kind === 'receita'), (t) => t.amount)
  const fixedExpense = sum(inMonth.filter((t) => t.recurring && t.kind === 'despesa'), (t) => t.amount)

  const history = useMemo(
    () =>
      lastMonths(6, month).map((ym) => {
        const rows = monthTxs(txs.rows, recurring.rows, ym)
        return { name: monthLabel(ym, true), Ganhos: of(rows, 'receita'), Gastos: of(rows, 'despesa') }
      }),
    [txs.rows, recurring.rows, month],
  )

  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of inMonth) if (t.kind === 'despesa') map.set(t.category, (map.get(t.category) ?? 0) + t.amount)
    return [...map].sort((a, b) => b[1] - a[1])
  }, [inMonth])

  return (
    <>
      <PageHeader title="Gestão financeira" subtitle="Cadastre seus ganhos e gastos do mês e veja quanto sobra para guardar.">
        <MonthNav value={month} onChange={setMonth} />
        <Button onClick={() => modal.show({ tx: null, kind: 'despesa' })}>
          <Plus size={16} aria-hidden /> Gasto
        </Button>
        <Button onClick={() => modal.show({ tx: null, kind: 'reserva' })}>
          <Plus size={16} aria-hidden /> Reserva
        </Button>
        <Button variant="primary" onClick={() => modal.show({ tx: null, kind: 'receita' })}>
          <Plus size={16} aria-hidden /> Ganho
        </Button>
      </PageHeader>

      <motion.div className="kpis" variants={stagger} initial="hidden" animate="show" key={month}>
        <Kpi label="Ganhos do mês" value={brl(income)} hint={`${brl(fixedIncome)} são fixos`} icon={<ArrowUpRight size={18} />} />
        <Kpi
          label="Gastos do mês"
          value={brl(expense)}
          hint={income > 0 ? `${Math.round((expense / income) * 100)}% dos ganhos · ${brl(fixedExpense)} fixos` : `${brl(fixedExpense)} são fixos`}
          icon={<ArrowDownRight size={18} />}
        />
        <Kpi label="Guardado na reserva" value={brl(saved)} hint={`Total acumulado: ${brl(totalSaved)}`} icon={<PiggyBank size={18} />} />
        <Kpi
          label="Sobra no mês"
          value={brl(left)}
          hint={left < 0 ? 'Você gastou mais do que ganhou' : 'Ganhos − gastos − reserva'}
          tone={left < 0 ? 'danger' : undefined}
          icon={<Scale size={18} />}
        />
      </motion.div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h2>Ganhos x gastos</h2>
            <ChartLegend items={[{ label: 'Ganhos', color: C.a }, { label: 'Gastos', color: C.b }]} />
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history} barGap={4}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="name" {...axisProps} />
                <YAxis {...axisProps} width={64} tickFormatter={brlShort} />
                <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="Ganhos" fill={C.a} radius={[6, 6, 0, 0]} maxBarSize={22} isAnimationActive={!reduce} />
                <Bar dataKey="Gastos" fill={C.b} radius={[6, 6, 0, 0]} maxBarSize={22} isAnimationActive={!reduce} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Para onde foi o dinheiro</h2>
          </div>
          {byCategory.length === 0 ? (
            <Empty>Sem gastos neste mês.</Empty>
          ) : (
            <ul className="bars">
              {byCategory.map(([cat, value]) => (
                <li key={cat}>
                  <div className="bars-top">
                    <span>{cat}</span>
                    <span className="num">
                      {brl(value)} <span className="muted">· {Math.round((value / expense) * 100)}%</span>
                    </span>
                  </div>
                  <div className="bar-track">
                    <motion.div
                      className="bar-fill"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: value / byCategory[0][1] }}
                      transition={{ duration: 0.6, ease }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Lançamentos de {monthLabel(month).toLowerCase()}</h2>
          <span className="muted small">
            <Repeat size={13} aria-hidden style={{ verticalAlign: '-2px' }} /> Fixo = repete todo mês
          </span>
        </div>
        {inMonth.length === 0 ? (
          <Empty>Nenhum lançamento neste mês. Comece cadastrando um ganho.</Empty>
        ) : (
          <ul className="rows">
            <AnimatePresence initial={false}>
              {inMonth.map((t) => (
                <motion.li
                  key={t.id}
                  layout="position"
                  className="row"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease }}
                >
                  <div className="row-main">
                    <strong>{t.description || t.category}</strong>
                    <span className="muted small">
                      {fmtDate(t.date)} · {t.category}
                      {t.recurring && ` · Fixo, todo dia ${t.recurring.day}`}
                      {t.recurring && t.date > today && ' · previsto'}
                    </span>
                  </div>
                  <span className={`badge badge-${t.kind}`}>
                    {t.recurring && <Repeat size={12} aria-hidden style={{ marginRight: 5 }} />}
                    {KIND_LABEL[t.kind]}
                  </span>
                  <strong className="row-amount num">
                    {t.kind === 'receita' ? '+ ' : '− '}
                    {brl(t.amount)}
                  </strong>
                  <div className="row-actions">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Editar lançamento"
                      onClick={() => (t.recurring ? recModal.show(t.recurring) : modal.show({ tx: t, kind: t.kind }))}
                    >
                      <Pencil size={15} aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Excluir lançamento"
                      onClick={() => {
                        if (t.recurring) recModal.show(t.recurring)
                        else if (confirm('Excluir este lançamento?')) txs.remove(t.id)
                      }}
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

      <Modal open={modal.open} onClose={modal.hide} title={modal.data?.tx ? 'Editar lançamento' : 'Novo lançamento'}>
        {modal.data && <TxForm key={modal.nonce} tx={modal.data.tx} kind={modal.data.kind} month={month} onClose={modal.hide} />}
      </Modal>

      <Modal open={recModal.open} onClose={recModal.hide} title="Lançamento fixo">
        {recModal.data && (
          <RecForm key={recModal.nonce} rec={recModal.data} clientMode={!!recModal.data.client} month={month} onClose={recModal.hide} />
        )}
      </Modal>
    </>
  )
}

function TxForm({ tx, kind: initialKind, month, onClose }: { tx: Tx | null; kind: TxKind; month: string; onClose: () => void }) {
  const { txs, recurring } = useData()
  const today = todayStr()
  const [kind, setKind] = useState<TxKind>(initialKind)
  const [category, setCategory] = useState(tx?.category ?? CATEGORIES[initialKind][0])
  const [description, setDescription] = useState(tx?.description ?? '')
  const [amount, setAmount] = useState(tx ? String(tx.amount).replace('.', ',') : '')
  const [date, setDate] = useState(tx?.date ?? (monthOf(today) === month ? today : `${month}-01`))
  const [repeat, setRepeat] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!date) return
    const data = {
      kind,
      category: category.trim() || 'Outros',
      description: description.trim(),
      amount: parseMoney(amount),
    }
    if (tx) txs.update(tx.id, { ...data, date })
    else if (repeat)
      recurring.add({ ...data, client: '', day: Number(date.slice(8, 10)), start_month: monthOf(date), end_month: null })
    else txs.add({ ...data, date })
    onClose()
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="segmented" role="radiogroup" aria-label="Tipo de lançamento">
        {(Object.keys(KIND_LABEL) as TxKind[]).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            className={kind === k ? 'active' : ''}
            onClick={() => {
              setKind(k)
              if (!CATEGORIES[k].includes(category)) setCategory(CATEGORIES[k][0])
            }}
          >
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>
      <div className="form-row">
        <Field label="Valor">
          <input data-autofocus inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="0,00" />
        </Field>
        <Field label="Data">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
      </div>
      <Field label="Categoria">
        <input list="tx-categories" value={category} onChange={(e) => setCategory(e.target.value)} maxLength={40} />
        <datalist id="tx-categories">
          {CATEGORIES[kind].map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
      <Field label="Descrição">
        <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} placeholder="Ex.: Aluguel, salário, assinatura…" />
      </Field>
      {!tx && (
        <label className="check check-block">
          <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
          <span>Fixo: repetir todo mês no dia {date ? Number(date.slice(8, 10)) : '—'}</span>
        </label>
      )}
      <div className="form-actions">
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="primary">
          Salvar
        </Button>
      </div>
    </form>
  )
}
