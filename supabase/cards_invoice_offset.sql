-- Em que mês as compras de cada cartão contam:
--   0 = mês do vencimento da fatura (padrão)
--   1 = mês anterior ao vencimento (ex.: fatura que vence em 9/11 conta em outubro)
-- Rode uma vez no Supabase: Dashboard → SQL Editor → New query → colar → Run

alter table public.cards
  add column if not exists invoice_offset smallint not null default 0;

alter table public.cards
  drop constraint if exists cards_invoice_offset_check;

alter table public.cards
  add constraint cards_invoice_offset_check check (invoice_offset in (0, 1));
