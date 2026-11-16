import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { monthLabel, shiftMonth } from '../lib/format'

export const ease = [0.22, 1, 0.36, 1] as const

/* ---------- Button ---------- */
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'icon'
}
export function Button({ variant = 'outline', size = 'md', className = '', type = 'button', ...p }: BtnProps) {
  return <button type={type} className={`btn btn-${variant} btn-${size} ${className}`} {...p} />
}

/* ---------- Modal ---------- */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.activeElement as HTMLElement | null
    requestAnimationFrame(() => {
      const first = ref.current?.querySelector<HTMLElement>('[data-autofocus], input, select, textarea')
      ;(first ?? ref.current)?.focus()
    })
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          className="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            ref={ref}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="modal"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.985 }}
            transition={{ duration: 0.3, ease }}
          >
            <div className="modal-head">
              <h2>{title}</h2>
              <Button variant="ghost" size="icon" aria-label="Fechar" onClick={onClose}>
                <X size={18} aria-hidden />
              </Button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Mantém os dados do modal durante a animação de saída. */
export function useModal<T>() {
  const [state, setState] = useState<{ open: boolean; data: T | null; nonce: number }>({
    open: false,
    data: null,
    nonce: 0,
  })
  const show = useCallback((data: T) => setState((s) => ({ open: true, data, nonce: s.nonce + 1 })), [])
  const hide = useCallback(() => setState((s) => ({ ...s, open: false })), [])
  return { ...state, show, hide }
}

/* ---------- Field ---------- */
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

/* ---------- Page header ---------- */
export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </header>
  )
}

/* ---------- Month navigator ---------- */
export function MonthNav({ value, onChange }: { value: string; onChange: (ym: string) => void }) {
  return (
    <div className="month-nav" role="group" aria-label="Selecionar mês">
      <Button variant="ghost" size="icon" aria-label="Mês anterior" onClick={() => onChange(shiftMonth(value, -1))}>
        <ChevronLeft size={18} aria-hidden />
      </Button>
      <span aria-live="polite">{monthLabel(value)}</span>
      <Button variant="ghost" size="icon" aria-label="Próximo mês" onClick={() => onChange(shiftMonth(value, 1))}>
        <ChevronRight size={18} aria-hidden />
      </Button>
    </div>
  )
}

/* ---------- KPI ---------- */
export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}
export const rise = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease } },
}

export function Kpi({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string
  value: string
  hint?: string
  icon?: ReactNode
  tone?: 'warn' | 'danger'
}) {
  return (
    <motion.div variants={rise} className={`kpi ${tone ? `kpi-${tone}` : ''}`}>
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        {icon && (
          <span className="kpi-icon" aria-hidden>
            {icon}
          </span>
        )}
      </div>
      <div className="kpi-value">{value}</div>
      {hint && <div className="kpi-hint">{hint}</div>}
    </motion.div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}

/* ---------- Toast ---------- */
type Listener = (msg: string) => void
const listeners = new Set<Listener>()
export const toast = (msg: string) => listeners.forEach((l) => l(msg))

export function Toaster() {
  const [items, setItems] = useState<{ id: number; msg: string }[]>([])
  useEffect(() => {
    let n = 0
    const l: Listener = (msg) => {
      const id = ++n
      setItems((s) => [...s.filter((i) => i.msg !== msg), { id, msg }])
      setTimeout(() => setItems((s) => s.filter((i) => i.id !== id)), 4000)
    }
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return (
    <div className="toaster" aria-live="polite">
      <AnimatePresence>
        {items.map((i) => (
          <motion.div
            key={i.id}
            className="toast"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease }}
          >
            {i.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
