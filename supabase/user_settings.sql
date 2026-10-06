-- Configurações do casal: por enquanto, a meta de economia mensal
-- Rode uma vez no Supabase: Dashboard → SQL Editor → New query → colar → Run

create table if not exists public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  savings_goal numeric(12, 2) check (savings_goal is null or savings_goal > 0),
  savings_goal_reason text,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

-- Cada login só enxerga e altera as próprias configurações
drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own" on public.user_settings
  for select using (auth.uid() = user_id);

drop policy if exists "user_settings_insert_own" on public.user_settings;
create policy "user_settings_insert_own" on public.user_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own" on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
