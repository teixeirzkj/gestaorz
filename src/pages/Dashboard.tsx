import { motion, useReducedMotion } from 'framer-motion'
import { AlarmClock, CalendarDays, Check, CircleDollarSign, Clock, Scale, TrendingUp } from 'lucide-react'
import { useMemo } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { C, ChartLegend, ChartTip, axisProps } from '../components/charts'
import { Button, Empty, Kpi, PageHeader, rise, stagger } from '../components/ui'
import { useData } from '../lib/data'
import { monthTxs, pendingCharges, totalReserva } from '../lib/recurring'
import { brl, brlShort, currentMonth, dueState, fmtDate, lastMonths, monthLabel, monthOf, sum, todayStr } from '../lib/format'

export default function Dashboard() {
  const { columns, cards, sales, txs, recurring, payments } = useData()
  const reduce = useReducedMotion()
  const month = currentMonth()
  const today = todayStr()

  const stats = useMemo(() => {
    const monthSales = sales.rows.filter((s) => monthOf(s.sale_date) === month)
    const paid = monthSales.filter((s) => s.status === 'paga')
    const pending = sales.rows.filter((s) => s.status === 'pendente')
    const monthTx = monthTxs(txs.rows, recurring.rows, month)
    const of = (k: string) => sum(monthTx.filter((t) => t.kind === k), (t) => t.amount)
    const revenue = sum(paid, (s) => s.amount)
    const cost = sum(paid, (s) => s.cost)
    return {
      revenue,
      profit: revenue - cost,
      paidCount: paid.length,
      receivable: sum(pending, (s) => s.amount),
      pendingCount: pending.length,
      left: of('receita') - of('despesa') - of('reserva'),
      saved: totalReserva(txs.rows, recurring.rows),
    }
  }, [sales.rows, txs.rows, recurring.rows, month])

  const months = useMemo(() => lastMonths(6), [])

  const salesHistory = useMemo(
    () =>
      months.map((ym) => {
        const paid = sales.rows.filter((s) => s.status === 'paga' && monthOf(s.sale_date) === ym)
        const revenue = sum(paid, (s) => s.amount)
        const cost = sum(paid, (s) => s.cost)
        return { name: monthLabel(ym, true), Recebido: revenue, Lucro: revenue - cost }
      }),
    [sales.rows, months],
  )

  const financeHistory = useMemo(
    () =>
      months.map((ym) => {
        const rows = monthTxs(txs.rows, recurring.rows, ym)
        const of = (k: string) => sum(rows.filter((t) => t.kind === k), (t) => t.amount)
        return { name: monthLabel(ym, true), Ganhos: of('receita'), Gastos: of('despesa') }
      }),
    [txs.rows, recurring.rows, months],
  )

  const statusData = useMemo(() => {
    const of = (st: string) => sales.rows.filter((s) => s.status === st)
    return [
      { name: 'Pagas', count: of('paga').length, value: sum(of('paga'), (s) => s.amount), fill: C.a },
      { name: 'Pendentes', count: of('pendente').length, value: sum(of('pendente'), (s) => s.amount), fill: C.b },
      { name: 'Perdidas', count: of('perdida').length, value: sum(of('perdida'), (s) => s.amount), fill: C.c },
    ]
  }, [sales.rows])
  const totalSales = sum(statusData, (s) => s.count)

  const sortedCols = useMemo(() => [...columns.rows].sort((a, b) => a.position - b.position), [columns.rows])
  const doneIds = useMemo(() => new Set(sortedCols.filter((c) => c.is_done).map((c) => c.id)), [sortedCols])
  const pipeline = sortedCols.map((c) => ({ name: c.title, Cards: cards.rows.filter((k) => k.column_id === c.id).length }))

  const open = cards.rows.filter((c) => c.due_date && !doneIds.has(c.column_id))
  const overdue = open.filter((c) => dueState(c.due_date, today) === 'overdue').length
  const dueToday = open.filter((c) => dueState(c.due_date, today) === 'today').length
  const upcoming = [...open].sort((a, b) => a.due_date!.localeCompare(b.due_date!)).slice(0, 6)
  const charges = useMemo(() => pendingCharges(recurring.rows, payments.rows, today), [recurring.rows, payments.rows, today])
  const colName = (id: string) => columns.rows.find((c) => c.id === id)?.title ?? ''

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Visão geral de ${monthLabel(month).toLowerCase()}.`} />

      <motion.div className="kpis kpis-5" variants={stagger} initial="hidden" animate="show">
        <Kpi label="Recebido em vendas" value={brl(stats.revenue)} hint={`${stats.paidCount} venda(s) paga(s) no mês`} icon={<CircleDollarSign size={18} />} />
        <Kpi label="Lucro das vendas" value={brl(stats.profit)} hint="Recebido menos custos" icon={<TrendingUp size={18} />} />
        <Kpi label="A receber" value={brl(stats.receivable)} hint={`${stats.pendingCount} venda(s) pendente(s)`} icon={<Clock size={18} />} />
        <Kpi
          label="Sobra no mês"
          value={brl(stats.left)}
          hint={`Reserva acumulada: ${brl(stats.saved)}`}
          tone={stats.left < 0 ? 'danger' : undefined}
          icon={<Scale size={18} />}
        />
        <Kpi
          label="Vencimentos"
          value={`${overdue} atrasado(s)`}
          hint={`${dueToday} vence(m) hoje`}
          tone={overdue > 0 ? 'danger' : dueToday > 0 ? 'warn' : undefined}
          icon={<AlarmClock size={18} />}
        />
      </motion.div>

      <motion.div className="grid-2" variants={stagger} initial="hidden" animate="show">
        <motion.div variants={rise} className="panel">
          <div className="panel-head">
            <h2>Vendas — últimos 6 meses</h2>
            <ChartLegend items={[{ label: 'Recebido', color: C.a }, { label: 'Lucro', color: C.b }]} />
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesHistory}>
                <defs>
                  <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.a} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={C.a} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="name" {...axisProps} />
                <YAxis {...axisProps} width={64} tickFormatter={brlShort} />
                <Tooltip content={<ChartTip />} cursor={{ stroke: '#3a3a3a' }} />
                <Area type="monotone" dataKey="Recebido" stroke={C.a} strokeWidth={2} fill="url(#gA)" isAnimationActive={!reduce} />
                <Area type="monotone" dataKey="Lucro" stroke={C.b} strokeWidth={2} strokeDasharray="5 4" fill="none" isAnimationActive={!reduce} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={rise} className="panel">
          <div className="panel-head">
            <h2>Ganhos x gastos</h2>
            <ChartLegend items={[{ label: 'Ganhos', color: C.a }, { label: 'Gastos', color: C.b }]} />
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financeHistory} barGap={4}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="name" {...axisProps} />
                <YAxis {...axisProps} width={64} tickFormatter={brlShort} />
                <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="Ganhos" fill={C.a} radius={[6, 6, 0, 0]} maxBarSize={22} isAnimationActive={!reduce} />
                <Bar dataKey="Gastos" fill={C.b} radius={[6, 6, 0, 0]} maxBarSize={22} isAnimationActive={!reduce} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={rise} className="panel">
          <div className="panel-head">
            <h2>Vendas por situação</h2>
          </div>
          {totalSales === 0 ? (
            <Empty>Nenhuma venda lançada ainda.</Empty>
          ) : (
            <div className="donut-wrap">
              <div className="donut">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<ChartTip />} />
                    <Pie
                      data={statusData.filter((s) => s.count > 0)}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="62%"
                      outerRadius="92%"
                      paddingAngle={3}
                      stroke="none"
                      cornerRadius={6}
                      isAnimationActive={!reduce}
                    >
                      {statusData
                        .filter((s) => s.count > 0)
                        .map((s) => (
                          <Cell key={s.name} fill={s.fill} />
                        ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center">
                  <strong>{totalSales}</strong>
                  <span>vendas</span>
                </div>
              </div>
              <ChartLegend
                items={statusData.map((s) => ({ label: `${s.name} (${s.count})`, color: s.fill, value: brl(s.value) }))}
              />
            </div>
          )}
        </motion.div>

        <motion.div variants={rise} className="panel">
          <div className="panel-head">
            <h2>Cards por coluna</h2>
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipeline} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid stroke={C.grid} horizontal={false} />
                <XAxis type="number" allowDecimals={false} {...axisProps} />
                <YAxis type="category" dataKey="name" {...axisProps} width={128} />
                <Tooltip content={<ChartTip money={false} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="Cards" fill={C.a} radius={[0, 6, 6, 0]} maxBarSize={18} isAnimationActive={!reduce} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </motion.div>

      {charges.length > 0 && (
        <div className="panel panel-alert">
          <div className="panel-head">
            <h2>Cobranças em aberto</h2>
            <span className="muted small">
              {charges.length} mensalidade(s) · {brl(sum(charges, (c) => c.rec.amount))}
            </span>
          </div>
          <ul className="rows">
            {charges.map((c) => (
              <li key={c.rec.id + c.month} className="row">
                <div className="row-main">
                  <strong>{c.rec.client}</strong>
                  <span className="muted small">
                    {c.rec.description || 'Mensalidade'} · {monthLabel(c.month).toLowerCase()}
                  </span>
                </div>
                <strong className="num">{brl(c.rec.amount)}</strong>
                <span className={c.date < today ? 'due-chip due-overdue' : 'due-chip due-today'}>
                  <CalendarDays size={13} aria-hidden />
                  {fmtDate(c.date)} · {c.date < today ? 'Atrasada' : 'Vence hoje'}
                </span>
                <div className="row-actions">
                  <Button size="sm" variant="primary" onClick={() => payments.add({ recurring_id: c.rec.id, month: c.month, paid_at: today })}>
                    <Check size={15} aria-hidden /> Marcar paga
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="panel">
        <div className="panel-head">
          <h2>Próximos vencimentos</h2>
        </div>
        {upcoming.length === 0 ? (
          <Empty>Nenhum card com vencimento em aberto.</Empty>
        ) : (
          <ul className="rows">
            {upcoming.map((c) => {
              const st = dueState(c.due_date, today)
              return (
                <li key={c.id} className="row">
                  <div className="row-main">
                    <strong>{c.title}</strong>
                    <span className="muted small">{colName(c.column_id)}</span>
                  </div>
                  <span className={`due-chip due-${st}`}>
                    <CalendarDays size={13} aria-hidden />
                    {fmtDate(c.due_date!)}
                    {st === 'overdue' && ' · Atrasado'}
                    {st === 'today' && ' · Vence hoje'}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}
