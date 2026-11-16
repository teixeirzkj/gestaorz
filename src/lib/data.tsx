import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { toast } from '../components/ui'
import type { Card, Column, RecPayment, Recurring, Sale, Tx } from './types'

type Table = 'board_columns' | 'cards' | 'sales' | 'transactions' | 'recurring' | 'recurring_payments'
type Row = { id: string; created_at: string }

const LS = 'gfrz:'
const readLocal = <T,>(t: Table): T[] => {
  try {
    return JSON.parse(localStorage.getItem(LS + t) || '[]') as T[]
  } catch {
    return []
  }
}
const writeLocal = <T,>(t: Table, rows: T[]) => localStorage.setItem(LS + t, JSON.stringify(rows))

const backend = {
  async list<T extends Row>(t: Table): Promise<T[]> {
    if (!supabase) return readLocal<T>(t)
    const { data, error } = await supabase.from(t).select('*').order('created_at')
    if (error) throw error
    return (data ?? []) as T[]
  },
  async insert<T extends Row>(t: Table, rows: T[]) {
    if (!supabase) return writeLocal(t, [...readLocal<T>(t), ...rows])
    const { error } = await supabase.from(t).insert(rows)
    if (error) throw error
  },
  async update<T extends Row>(t: Table, id: string, patch: Partial<T>) {
    if (!supabase) return writeLocal(t, readLocal<T>(t).map((r) => (r.id === id ? { ...r, ...patch } : r)))
    const { error } = await supabase.from(t).update(patch as Record<string, unknown>).eq('id', id)
    if (error) throw error
  },
  async remove<T extends Row>(t: Table, id: string) {
    if (!supabase) return writeLocal(t, readLocal<T>(t).filter((r) => r.id !== id))
    const { error } = await supabase.from(t).delete().eq('id', id)
    if (error) throw error
  },
}

export interface TableApi<T extends Row> {
  rows: T[]
  add: (row: Omit<T, 'id' | 'created_at'>) => Promise<T>
  update: (id: string, patch: Partial<T>) => Promise<void>
  remove: (id: string) => Promise<void>
}

const newRow = <T extends Row>(row: Omit<T, 'id' | 'created_at'>) =>
  ({ ...row, id: crypto.randomUUID(), created_at: new Date().toISOString() }) as T

function useTable<T extends Row>(table: Table, reload: () => void) {
  const [rows, setRows] = useState<T[]>([])

  const fail = useCallback(() => {
    toast('Não foi possível salvar. Verifique sua conexão.')
    reload()
  }, [reload])

  const add = useCallback(
    async (row: Omit<T, 'id' | 'created_at'>) => {
      const full = newRow<T>(row)
      setRows((r) => [...r, full])
      try {
        await backend.insert(table, [full])
      } catch {
        fail()
      }
      return full
    },
    [table, fail],
  )

  const update = useCallback(
    async (id: string, patch: Partial<T>) => {
      setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)))
      try {
        await backend.update<T>(table, id, patch)
      } catch {
        fail()
      }
    },
    [table, fail],
  )

  const remove = useCallback(
    async (id: string) => {
      setRows((r) => r.filter((x) => x.id !== id))
      try {
        await backend.remove(table, id)
      } catch {
        fail()
      }
    },
    [table, fail],
  )

  const api = useMemo<TableApi<T>>(() => ({ rows, add, update, remove }), [rows, add, update, remove])
  return [api, setRows] as const
}

const DEFAULT_COLUMNS = ['A fazer', 'Em andamento', 'Aguardando cliente', 'Follow up', 'Concluído']

let seeding: Promise<Column[]> | null = null
const seedColumns = () =>
  (seeding ??= (async () => {
    const cols = DEFAULT_COLUMNS.map((title, i) => ({
      ...newRow<Column>({ title, position: i + 1, is_done: i === DEFAULT_COLUMNS.length - 1 }),
      created_at: new Date(Date.now() + i).toISOString(),
    }))
    await backend.insert('board_columns', cols)
    return cols
  })().finally(() => {
    seeding = null
  }))

interface Ctx {
  loading: boolean
  columns: TableApi<Column>
  cards: TableApi<Card>
  sales: TableApi<Sale>
  txs: TableApi<Tx>
  recurring: TableApi<Recurring>
  payments: TableApi<RecPayment>
}

const DataCtx = createContext<Ctx | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])

  const [columns, setColumns] = useTable<Column>('board_columns', reload)
  const [cards, setCards] = useTable<Card>('cards', reload)
  const [sales, setSales] = useTable<Sale>('sales', reload)
  const [txs, setTxs] = useTable<Tx>('transactions', reload)
  const [recurring, setRecurring] = useTable<Recurring>('recurring', reload)
  const [payments, setPayments] = useTable<RecPayment>('recurring_payments', reload)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [c, k, s, t, r, p] = await Promise.all([
          backend.list<Column>('board_columns'),
          backend.list<Card>('cards'),
          backend.list<Sale>('sales'),
          backend.list<Tx>('transactions'),
          backend.list<Recurring>('recurring').catch(() => {
            toast('Para usar lançamentos fixos, execute supabase/002_recorrentes.sql no Supabase.')
            return [] as Recurring[]
          }),
          backend.list<RecPayment>('recurring_payments').catch(() => {
            toast('Para controlar quem pagou, execute supabase/003_pagamentos.sql no Supabase.')
            return [] as RecPayment[]
          }),
        ])
        if (alive) {
          setRecurring(r)
          setPayments(p)
        }
        const cols = c.length ? c : await seedColumns()
        if (!alive) return
        setColumns(cols)
        setCards(k)
        setSales(s)
        setTxs(t)
      } catch {
        if (alive) toast('Erro ao carregar os dados. Confira se o schema.sql foi executado no Supabase.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [tick, setColumns, setCards, setSales, setTxs, setRecurring, setPayments])

  const value = useMemo(
    () => ({ loading, columns, cards, sales, txs, recurring, payments }),
    [loading, columns, cards, sales, txs, recurring, payments],
  )
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>
}

export function useData() {
  const ctx = useContext(DataCtx)
  if (!ctx) throw new Error('useData fora do DataProvider')
  return ctx
}
