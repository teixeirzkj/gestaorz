export interface Column {
  id: string
  title: string
  position: number
  is_done: boolean
  created_at: string
}

export interface Card {
  id: string
  column_id: string
  title: string
  description: string
  due_date: string | null
  value: number | null
  position: number
  created_at: string
}

export type SaleStatus = 'pendente' | 'paga' | 'perdida'

export interface Sale {
  id: string
  client: string
  description: string
  amount: number
  cost: number
  sale_date: string
  status: SaleStatus
  paid_at: string | null
  created_at: string
}

export type TxKind = 'receita' | 'despesa' | 'reserva'

export interface Tx {
  id: string
  kind: TxKind
  category: string
  description: string
  amount: number
  date: string
  created_at: string
}
