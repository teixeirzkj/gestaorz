import { brl } from '../lib/format'

/** Paleta monocromática dos gráficos. */
export const C = {
  a: '#fafafa',
  b: '#7d7d7d',
  c: '#4d4d4d',
  grid: '#232323',
  axis: '#8f8f8f',
}

export const axisProps = {
  stroke: C.axis,
  tick: { fill: C.axis, fontSize: 12 },
  tickLine: false,
  axisLine: false,
} as const

interface TipProps {
  active?: boolean
  label?: string | number
  payload?: { name?: string; value?: number | string; color?: string; payload?: { fill?: string } }[]
  money?: boolean
}

export function ChartTip({ active, label, payload, money = true }: TipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="tip">
      {label != null && label !== '' && <div className="tip-label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="tip-row">
          <span className="dot" style={{ background: p.color ?? p.payload?.fill }} />
          <span>{p.name}</span>
          <strong>{money ? brl(Number(p.value)) : p.value}</strong>
        </div>
      ))}
    </div>
  )
}

export function ChartLegend({ items }: { items: { label: string; color: string; value?: string }[] }) {
  return (
    <ul className="legend">
      {items.map((i) => (
        <li key={i.label}>
          <span className="dot" style={{ background: i.color }} />
          <span>{i.label}</span>
          {i.value && <strong>{i.value}</strong>}
        </li>
      ))}
    </ul>
  )
}
