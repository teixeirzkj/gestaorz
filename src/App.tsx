import { AnimatePresence, motion } from 'framer-motion'
import { KanbanSquare, LayoutDashboard, LogOut, PiggyBank, ReceiptText, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, Toaster, ease } from './components/ui'
import { DataProvider, useData } from './lib/data'
import { supabase } from './lib/supabase'
import Board from './pages/Board'
import Dashboard from './pages/Dashboard'
import Finance from './pages/Finance'
import Login from './pages/Login'
import Sales from './pages/Sales'

const PAGES = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, el: Dashboard },
  { id: 'crm', label: 'CRM', icon: KanbanSquare, el: Board },
  { id: 'vendas', label: 'Vendas', icon: ReceiptText, el: Sales },
  { id: 'financas', label: 'Gestão financeira', icon: PiggyBank, el: Finance },
] as const
type PageId = (typeof PAGES)[number]['id']

const LOCAL_KEY = 'gfrz:local-session'
const pageFromHash = (): PageId => {
  const h = location.hash.slice(1)
  return PAGES.some((p) => p.id === h) ? (h as PageId) : 'dashboard'
}

export default function App() {
  // undefined = verificando sessão
  const [user, setUser] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    if (!supabase) {
      setUser(sessionStorage.getItem(LOCAL_KEY) ? 'Modo local' : null)
      return
    }
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user.email ?? null))
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user.email ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  const logout = async () => {
    if (supabase) await supabase.auth.signOut()
    else sessionStorage.removeItem(LOCAL_KEY)
    setUser(null)
  }

  return (
    <>
      {user === undefined ? (
        <div className="splash" role="status" aria-label="Carregando">
          <span className="spinner" />
        </div>
      ) : user === null ? (
        <Login
          onLocal={() => {
            sessionStorage.setItem(LOCAL_KEY, '1')
            setUser('Modo local')
          }}
        />
      ) : (
        <DataProvider key={user}>
          <Shell user={user} onLogout={logout} />
        </DataProvider>
      )}
      <Toaster />
    </>
  )
}

function Shell({ user, onLogout }: { user: string; onLogout: () => void }) {
  const [page, setPage] = useState<PageId>(pageFromHash)
  const { loading } = useData()

  useEffect(() => {
    const onHash = () => setPage(pageFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (id: PageId) => {
    location.hash = id
    setPage(id)
  }

  const Current = PAGES.find((p) => p.id === page)!.el

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            <TrendingUp size={18} />
          </span>
          <span className="brand-name">gestaofinanceirarz</span>
        </div>
        <nav className="nav" aria-label="Principal">
          {PAGES.map((p) => (
            <button
              key={p.id}
              className={`nav-item ${page === p.id ? 'active' : ''}`}
              aria-current={page === p.id ? 'page' : undefined}
              onClick={() => go(p.id)}
            >
              {page === p.id && (
                <motion.span
                  layoutId="nav-pill"
                  className="nav-pill"
                  transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                />
              )}
              <p.icon size={18} aria-hidden />
              <span>{p.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="user" title={user}>
            {user}
          </span>
          <Button variant="ghost" size="icon" aria-label="Sair" title="Sair" onClick={onLogout}>
            <LogOut size={17} aria-hidden />
          </Button>
        </div>
      </aside>

      <main className="main">
        {loading ? (
          <div className="splash" role="status" aria-label="Carregando">
            <span className="spinner" />
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={page}
              className="page"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease }}
            >
              <Current />
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  )
}
