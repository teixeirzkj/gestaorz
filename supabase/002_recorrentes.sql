-- gestaofinanceirarz — lançamentos fixos mensais (salário, parcelas, mensalidades de clientes)
-- Cole tudo isto em: Supabase > SQL Editor > New query > Run

create table if not exists public.recurring (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('receita', 'despesa', 'reserva')),
  category text not null default 'Outros',
  description text not null default '',
  client text not null default '',
  amount numeric(14, 2) not null default 0,
  day smallint not null default 1 check (day between 1 and 31),
  start_month text not null check (start_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  end_month text check (end_month is null or end_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  created_at timestamptz not null default now()
);

create index if not exists recurring_user_idx on public.recurring (user_id);

alter table public.recurring enable row level security;

drop policy if exists "own rows" on public.recurring;
create policy "own rows" on public.recurring for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
