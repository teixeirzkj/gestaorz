import { Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useData } from '../lib/data'
import { parseMoney, shiftMonth } from '../lib/format'
import type { Recurring, TxKind } from '../lib/types'
import { Button, Field } from './ui'

export const KIND_LABEL: Record<TxKind, string> = { receita: 'Ganho', despesa: 'Gasto', reserva: 'Reserva' }

/** Formulário de lançamento fixo mensal. `clientMode` = mensalidade de cliente. */
export function RecForm({
  rec,
  clientMode,
  kind: initialKind = 'receita',
  month,
  onClose,
}: {
  rec: Recurring | null
  clientMode: boolean
  kind?: TxKind
  month: string
  onClose: () => void
}) {
  const { recurring } = useData()
  const [kind, setKind] = useState<TxKind>(rec?.kind ?? initialKind)
  const [client, setClient] = useState(rec?.client ?? '')
  const [description, setDescription] = useState(rec?.description ?? '')
  const [category, setCategory] = useState(rec?.category ?? (clientMode ? 'Mensalidade' : 'Outros'))
  const [amount, setAmount] = useState(rec ? String(rec.amount).replace('.', ',') : '')
  const [day, setDay] = useState(String(rec?.day ?? 20))
  const [start, setStart] = useState(rec?.start_month ?? month)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(start)) return
    if (clientMode && !client.trim()) return
    const data = {
      kind: clientMode ? ('receita' as const) : kind,
      client: clientMode ? client.trim() : '',
      description: description.trim(),
      category: category.trim() || 'Outros',
      amount: parseMoney(amount),
      day: Math.min(31, Math.max(1, Math.round(Number(day)) || 1)),
      start_month: start,
      end_month: rec?.end_month && rec.end_month >= start ? rec.end_month : null,
    }
    if (rec) recurring.update(rec.id, data)
    else recurring.add(data)
    onClose()
  }

  const stop = () => {
    if (!rec) return
    const end = shiftMonth(month, -1)
    if (!confirm('Encerrar a partir deste mês? Os meses anteriores continuam no histórico.')) return
    if (end < rec.start_month) recurring.remove(rec.id)
    else recurring.update(rec.id, { end_month: end })
    onClose()
  }

  return (
    <form className="form" onSubmit={submit}>
      {clientMode ? (
        <Field label="Cliente">
          <input value={client} onChange={(e) => setClient(e.target.value)} required maxLength={120} placeholder="Nome do cliente" />
        </Field>
      ) : (
        <div className="segmented" role="radiogroup" aria-label="Tipo de lançamento">
          {(Object.keys(KIND_LABEL) as TxKind[]).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} className={kind === k ? 'active' : ''} onClick={() => setKind(k)}>
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      )}
      <Field label="Descrição">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
          placeholder={clientMode ? 'Ex.: Mensalidade do site' : 'Ex.: Salário, parcela da moto…'}
        />
      </Field>
      <div className="form-row">
        <Field label="Valor por mês">
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="0,00" />
        </Field>
        <Field label={clientMode || kind === 'receita' ? 'Dia do recebimento' : 'Dia do mês'}>
          <input type="number" min={1} max={31} value={day} onChange={(e) => setDay(e.target.value)} required />
        </Field>
      </div>
      <div className="form-row">
        {!clientMode && (
          <Field label="Categoria">
            <input value={category} onChange={(e) => setCategory(e.target.value)} maxLength={40} />
          </Field>
        )}
        <Field label="Começa em" hint="Vale deste mês em diante">
          <input type="month" value={start} onChange={(e) => setStart(e.target.value)} required placeholder="AAAA-MM" />
        </Field>
      </div>
      <div className="form-actions">
        {rec && (
          <>
            <Button
              variant="danger"
              className="push-left"
              onClick={() => {
                if (confirm('Excluir este lançamento fixo de todos os meses, inclusive os passados?')) {
                  recurring.remove(rec.id)
                  onClose()
                }
              }}
            >
              <Trash2 size={15} aria-hidden /> Excluir
            </Button>
            <Button onClick={stop}>Encerrar</Button>
          </>
        )}
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="primary">
          Salvar
        </Button>
      </div>
    </form>
  )
}
