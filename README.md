# gestaofinanceirarz

CRM pessoal com quadro kanban, controle de vendas, gestão financeira e dashboard.
Feito com Vite, React, Framer Motion, Recharts e Supabase.

## Rodar localmente

```bash
npm install
npm run dev
```

Sem as variáveis do Supabase o app abre em **modo local**: não há login e os dados ficam só no navegador.

## Ligar o Supabase (login e banco)

1. Crie um projeto em https://supabase.com.
2. Em **SQL Editor**, cole e execute o conteúdo de `supabase/schema.sql`.
3. Em **Authentication > Users > Add user**, crie seu e-mail e senha (marque "Auto Confirm User").
4. Em **Authentication > Sign In / Providers**, desative "Allow new users to sign up" para ninguém mais criar conta.
5. Em **Project Settings > API**, copie a URL do projeto e a chave `anon` (publishable).
6. Local: copie `.env.example` para `.env` e preencha. Vercel: adicione as duas variáveis em **Settings > Environment Variables** e refaça o deploy.

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

Nunca use a chave `service_role` aqui. O acesso aos dados é protegido por Row Level Security: cada usuário só lê e altera as próprias linhas.
