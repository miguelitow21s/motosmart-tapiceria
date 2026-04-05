alter table public.designs
  add column if not exists discount_price numeric(12,2),
  add column if not exists promotion_label text not null default '',
  add column if not exists promotion_active boolean not null default false;

alter table public.designs
  drop constraint if exists designs_discount_price_check;

alter table public.designs
  add constraint designs_discount_price_check
  check (discount_price is null or discount_price >= 0);
