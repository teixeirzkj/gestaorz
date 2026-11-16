-- gestaofinanceirarz — saldo inicial de cada mês
-- Cole tudo isto em: Supabase > SQL Editor > New query > Run

create table if not exists public.month_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  month text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  amount numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, month)
);

alter table public.month_balances enable row level security;

drop policy if exists "own rows" on public.month_balances;
create policy "own rows" on public.month_balances for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
