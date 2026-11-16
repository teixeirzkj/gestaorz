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
  /** Preenchido quando o lançamento vem de um fixo mensal (não existe no banco). */
  recurring?: Recurring
}

/** Marca que a mensalidade de um cliente foi paga em determinado mês. */
export interface RecPayment {
  id: string
  recurring_id: string
  month: string
  paid_at: string
  created_at: string
}

/** Lançamento fixo que se repete todo mês (salário, parcela, mensalidade de cliente). */
export interface Recurring {
  id: string
  kind: TxKind
  category: string
  description: string
  /** Preenchido quando é mensalidade de um cliente (aparece em Vendas). */
  client: string
  amount: number
  day: number
  start_month: string
  end_month: string | null
  created_at: string
}
