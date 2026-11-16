import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, ArrowUp, CalendarDays, Plus, Settings2, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState, type FormEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { Button, Field, Modal, PageHeader, ease, useModal } from '../components/ui'
import { useData } from '../lib/data'
import { brl, dueState, fmtDate, parseMoney, todayStr } from '../lib/format'
import type { Card, Column } from '../lib/types'

const DUE_TEXT = { today: 'Vence hoje', overdue: 'Atrasado', ok: '', none: '' } as const

export default function Board() {
  const { columns, cards } = useData()
  const cardModal = useModal<{ card?: Card; columnId: string }>()
  const [colsOpen, setColsOpen] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<string | null>(null)
  const today = todayStr()

  // Clicar e segurar numa área vazia do quadro para arrastá-lo para os lados.
  const boardRef = useRef<HTMLDivElement>(null)
  const [panning, setPanning] = useState(false)
  const startPan = (e: ReactMouseEvent) => {
    const el = boardRef.current
    if (!el || e.button !== 0 || (e.target as HTMLElement).closest('.card, button, input')) return
    e.preventDefault()
    const x0 = e.clientX
    const s0 = el.scrollLeft
    setPanning(true)
    const move = (ev: MouseEvent) => {
      el.scrollLeft = s0 - (ev.clientX - x0)
    }
    const up = () => {
      setPanning(false)
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  const cols = useMemo(() => [...columns.rows].sort((a, b) => a.position - b.position), [columns.rows])
  const byCol = useMemo(() => {
    const map = new Map<string, Card[]>()
    for (const c of [...cards.rows].sort((a, b) => a.position - b.position)) {
      map.set(c.column_id, [...(map.get(c.column_id) ?? []), c])
    }
    return map
  }, [cards.rows])

  const drop = (colId: string, beforeId?: string) => {
    const id = dragId
    setDragId(null)
    setOverCol(null)
    if (!id || beforeId === id) return
    const list = (byCol.get(colId) ?? []).filter((c) => c.id !== id)
    const i = beforeId ? list.findIndex((c) => c.id === beforeId) : -1
    const position =
      i >= 0
        ? i > 0
          ? (list[i - 1].position + list[i].position) / 2
          : list[i].position - 1
        : (list.at(-1)?.position ?? 0) + 1
    cards.update(id, { column_id: colId, position })
  }

  return (
    <>
      <PageHeader title="CRM" subtitle="Arraste os cards entre as colunas para acompanhar cada cliente.">
        <Button onClick={() => setColsOpen(true)}>
          <Settings2 size={16} aria-hidden /> Editar colunas
        </Button>
        <Button variant="primary" onClick={() => cols[0] && cardModal.show({ columnId: cols[0].id })}>
          <Plus size={16} aria-hidden /> Novo card
        </Button>
      </PageHeader>

      <div ref={boardRef} className={`board ${panning ? 'panning' : ''}`} onMouseDown={startPan}>
        {cols.map((col) => {
          const list = byCol.get(col.id) ?? []
          return (
            <section
              key={col.id}
              className={`column ${overCol === col.id ? 'over' : ''}`}
              aria-label={col.title}
              onDragOver={(e) => {
                e.preventDefault()
                if (overCol !== col.id) setOverCol(col.id)
              }}
              onDrop={() => drop(col.id)}
            >
              <header className="column-head">
                <h2>{col.title}</h2>
                <span className="count">{list.length}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Adicionar card em ${col.title}`}
                  onClick={() => cardModal.show({ columnId: col.id })}
                >
                  <Plus size={16} aria-hidden />
                </Button>
              </header>

              <div className="column-body">
                <AnimatePresence initial={false}>
                  {list.map((card) => {
                    const state = col.is_done ? 'none' : dueState(card.due_date, today)
                    return (
                      <motion.div
                        key={card.id}
                        layout="position"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: dragId === card.id ? 0.4 : 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.25, ease }}
                      >
                        <div
                          className={`card due-${state}`}
                          role="button"
                          tabIndex={0}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move'
                            e.dataTransfer.setData('text/plain', card.id)
                            setDragId(card.id)
                          }}
                          onDragEnd={() => {
                            setDragId(null)
                            setOverCol(null)
                          }}
                          onDrop={(e) => {
                            e.stopPropagation()
                            drop(col.id, card.id)
                          }}
                          onClick={() => cardModal.show({ card, columnId: col.id })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              cardModal.show({ card, columnId: col.id })
                            }
                          }}
                        >
                          <h3>{card.title}</h3>
                          {card.due_date && (
                            <div className="card-due">
                              <CalendarDays size={13} aria-hidden />
                              <span>{fmtDate(card.due_date)}</span>
                              {DUE_TEXT[state] && <span className="due-badge">{DUE_TEXT[state]}</span>}
                            </div>
                          )}
                          {card.description && <p>{card.description}</p>}
                          {card.value != null && card.value > 0 && <div className="card-value">{brl(card.value)}</div>}
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
                {list.length === 0 && <div className="column-empty">Sem cards</div>}
              </div>
            </section>
          )
        })}
      </div>

      <Modal open={cardModal.open} onClose={cardModal.hide} title={cardModal.data?.card ? 'Editar card' : 'Novo card'}>
        {cardModal.data && (
          <CardForm
            key={cardModal.nonce}
            card={cardModal.data.card}
            columnId={cardModal.data.columnId}
            columns={cols}
            onClose={cardModal.hide}
          />
        )}
      </Modal>

      <Modal open={colsOpen} onClose={() => setColsOpen(false)} title="Editar colunas">
        <ColumnsEditor cols={cols} />
      </Modal>
    </>
  )
}

function CardForm({
  card,
  columnId,
  columns,
  onClose,
}: {
  card?: Card
  columnId: string
  columns: Column[]
  onClose: () => void
}) {
  const { cards } = useData()
  const [title, setTitle] = useState(card?.title ?? '')
  const [description, setDescription] = useState(card?.description ?? '')
  const [due, setDue] = useState(card?.due_date ?? '')
  const [value, setValue] = useState(card?.value ? String(card.value).replace('.', ',') : '')
  const [col, setCol] = useState(columnId)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const data = {
      title: title.trim(),
      description: description.trim(),
      due_date: due || null,
      value: value ? parseMoney(value) : null,
      column_id: col,
    }
    if (card) {
      const moved = col !== card.column_id
      const last = Math.max(0, ...cards.rows.filter((c) => c.column_id === col).map((c) => c.position))
      cards.update(card.id, moved ? { ...data, position: last + 1 } : data)
    } else {
      const last = Math.max(0, ...cards.rows.filter((c) => c.column_id === col).map((c) => c.position))
      cards.add({ ...data, position: last + 1 })
    }
    onClose()
  }

  return (
    <form className="form" onSubmit={submit}>
      <Field label="Título">
        <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} placeholder="Ex.: Proposta para a Ana" />
      </Field>
      <div className="form-row">
        <Field label="Data de vencimento">
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>
        <Field label="Valor (opcional)">
          <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0,00" />
        </Field>
      </div>
      <Field label="Coluna">
        <select value={col} onChange={(e) => setCol(e.target.value)}>
          {columns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Descrição">
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} placeholder="Anotações, contato, próximos passos…" />
      </Field>
      <div className="form-actions">
        {card && (
          <Button
            variant="danger"
            className="push-left"
            onClick={() => {
              if (confirm('Excluir este card?')) {
                cards.remove(card.id)
                onClose()
              }
            }}
          >
            <Trash2 size={15} aria-hidden /> Excluir
          </Button>
        )}
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="primary">
          Salvar
        </Button>
      </div>
    </form>
  )
}

function ColumnsEditor({ cols }: { cols: Column[] }) {
  const { columns, cards } = useData()
  const [name, setName] = useState('')

  const add = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    columns.add({ title: name.trim(), position: (cols.at(-1)?.position ?? 0) + 1, is_done: false })
    setName('')
  }

  const swap = (i: number, j: number) => {
    const a = cols[i]
    const b = cols[j]
    if (!a || !b) return
    columns.update(a.id, { position: b.position })
    columns.update(b.id, { position: a.position })
  }

  const remove = async (col: Column) => {
    const inside = cards.rows.filter((c) => c.column_id === col.id)
    const msg = inside.length
      ? `Excluir a coluna "${col.title}" e os ${inside.length} card(s) dentro dela?`
      : `Excluir a coluna "${col.title}"?`
    if (!confirm(msg)) return
    await Promise.all(inside.map((c) => cards.remove(c.id)))
    columns.remove(col.id)
  }

  return (
    <div className="form">
      <p className="muted small">
        Renomeie, reordene ou exclua. Marque “Conclusão” nas colunas em que o vencimento não deve mais alertar.
      </p>
      <div className="col-list">
        <AnimatePresence initial={false}>
          {cols.map((col, i) => (
            <motion.div
              key={col.id}
              layout="position"
              className="col-row"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease }}
            >
              <input
                aria-label="Nome da coluna"
                defaultValue={col.title}
                maxLength={40}
                onBlur={(e) => {
                  const v = e.target.value.trim()
                  if (v && v !== col.title) columns.update(col.id, { title: v })
                  else e.target.value = col.title
                }}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              />
              <label className="check" title="Coluna de conclusão">
                <input
                  type="checkbox"
                  checked={col.is_done}
                  onChange={(e) => columns.update(col.id, { is_done: e.target.checked })}
                />
                <span>Conclusão</span>
              </label>
              <Button variant="ghost" size="icon" aria-label="Mover para cima" disabled={i === 0} onClick={() => swap(i, i - 1)}>
                <ArrowUp size={16} aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Mover para baixo"
                disabled={i === cols.length - 1}
                onClick={() => swap(i, i + 1)}
              >
                <ArrowDown size={16} aria-hidden />
              </Button>
              <Button variant="ghost" size="icon" aria-label={`Excluir ${col.title}`} onClick={() => remove(col)}>
                <Trash2 size={16} aria-hidden />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <form className="col-add" onSubmit={add}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nova coluna" maxLength={40} aria-label="Nome da nova coluna" />
        <Button type="submit" variant="primary">
          <Plus size={16} aria-hidden /> Adicionar
        </Button>
      </form>
    </div>
  )
}
