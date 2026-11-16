-- gestaofinanceirarz — controle de quem pagou a mensalidade em cada mês
-- Cole tudo isto em: Supabase > SQL Editor > New query > Run

create table if not exists public.recurring_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recurring_id uuid not null references public.recurring (id) on delete cascade,
  month text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  paid_at date not null default current_date,
  created_at timestamptz not null default now(),
  unique (recurring_id, month)
);

create index if not exists recurring_payments_user_idx on public.recurring_payments (user_id);

alter table public.recurring_payments enable row level security;

drop policy if exists "own rows" on public.recurring_payments;
create policy "own rows" on public.recurring_payments for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
