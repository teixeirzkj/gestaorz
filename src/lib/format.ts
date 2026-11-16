const pad = (n: number) => String(n).padStart(2, '0')

export const brl = (n: number) =>
  (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const brlShort = (n: number) => {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace('.', ',')} mi`
  if (abs >= 1_000) return `R$ ${(n / 1_000).toFixed(1).replace('.', ',')} mil`
  return `R$ ${Math.round(n)}`
}

export const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const currentMonth = () => todayStr().slice(0, 7)

export const monthOf = (date: string) => date.slice(0, 7)

export const fmtDate = (date: string) => {
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y}`
}

export const shiftMonth = (ym: string, delta: number) => {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export const monthLabel = (ym: string, short = false) => {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1, 1)
  const s = short
    ? d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
    : d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const lastMonths = (n: number, end = currentMonth()) =>
  Array.from({ length: n }, (_, i) => shiftMonth(end, i - (n - 1)))

export type DueState = 'none' | 'ok' | 'today' | 'overdue'

export const dueState = (due: string | null, today: string): DueState =>
  !due ? 'none' : due < today ? 'overdue' : due === today ? 'today' : 'ok'

export const sum = <T,>(rows: T[], pick: (r: T) => number) =>
  rows.reduce((acc, r) => acc + (Number(pick(r)) || 0), 0)

export const parseMoney = (s: string) => {
  const n = Number(String(s).replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0
}
