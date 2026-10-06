-- Limites mensais por categoria (antes ficavam só no localStorage de cada aparelho)
-- Rode uma vez no Supabase: Dashboard → SQL Editor → New query → colar → Run

create table if not exists public.category_limits (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null,
  amount numeric(12, 2) not null check (amount > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, category)
);

alter table public.category_limits enable row level security;

-- Cada login só enxerga e altera os próprios limites
drop policy if exists "category_limits_select_own" on public.category_limits;
create policy "category_limits_select_own" on public.category_limits
  for select using (auth.uid() = user_id);

drop policy if exists "category_limits_insert_own" on public.category_limits;
create policy "category_limits_insert_own" on public.category_limits
  for insert with check (auth.uid() = user_id);

drop policy if exists "category_limits_update_own" on public.category_limits;
create policy "category_limits_update_own" on public.category_limits
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "category_limits_delete_own" on public.category_limits;
create policy "category_limits_delete_own" on public.category_limits
  for delete using (auth.uid() = user_id);
