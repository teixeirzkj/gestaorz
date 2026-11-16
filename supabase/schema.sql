-- gestaofinanceirarz — schema do banco (Supabase)
-- Cole tudo isto em: Supabase > SQL Editor > New query > Run

create table if not exists public.board_columns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  position double precision not null default 0,
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  column_id uuid not null references public.board_columns (id) on delete cascade,
  title text not null,
  description text not null default '',
  due_date date,
  value numeric(14, 2),
  position double precision not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client text not null,
  description text not null default '',
  amount numeric(14, 2) not null default 0,
  cost numeric(14, 2) not null default 0,
  sale_date date not null default current_date,
  status text not null default 'pendente' check (status in ('pendente', 'paga', 'perdida')),
  paid_at date,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('receita', 'despesa', 'reserva')),
  category text not null default 'Outros',
  description text not null default '',
  amount numeric(14, 2) not null default 0,
  date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists board_columns_user_idx on public.board_columns (user_id);
create index if not exists cards_user_idx on public.cards (user_id);
create index if not exists cards_column_idx on public.cards (column_id);
create index if not exists sales_user_idx on public.sales (user_id);
create index if not exists transactions_user_idx on public.transactions (user_id);

-- Row Level Security: cada usuário só enxerga e altera as próprias linhas.
alter table public.board_columns enable row level security;
alter table public.cards enable row level security;
alter table public.sales enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "own rows" on public.board_columns;
create policy "own rows" on public.board_columns for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "own rows" on public.cards;
create policy "own rows" on public.cards for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "own rows" on public.sales;
create policy "own rows" on public.sales for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "own rows" on public.transactions;
create policy "own rows" on public.transactions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
