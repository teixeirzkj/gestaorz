import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button, Field, ease } from '../components/ui'
import { supabase } from '../lib/supabase'

export default function Login({ onLocal }: { onLocal: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return onLocal()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setError('E-mail ou senha incorretos.')
  }

  return (
    <div className="login">
      <motion.form
        className="login-card"
        onSubmit={submit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease }}
      >
        <div className="brand login-brand">
          <span className="brand-mark" aria-hidden>
            <TrendingUp size={18} />
          </span>
          <span className="brand-name">gestaofinanceirarz</span>
        </div>
        <h1>Entrar</h1>
        <p className="muted">Seu CRM e suas finanças em um só lugar.</p>

        {supabase ? (
          <>
            <Field label="E-mail">
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
              />
            </Field>
            <Field label="Senha">
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                aria-describedby={error ? 'login-error' : undefined}
              />
            </Field>
            {error && (
              <p id="login-error" className="form-error" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? 'Entrando…' : 'Entrar'}
            </Button>
          </>
        ) : (
          <>
            <p className="notice">
              Supabase ainda não configurado. No modo local os dados ficam salvos apenas neste navegador, sem login.
            </p>
            <Button type="submit" variant="primary">
              Entrar no modo local
            </Button>
          </>
        )}
      </motion.form>
    </div>
  )
}
