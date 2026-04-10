-- Programacion de promociones por ventana de tiempo en disenos

alter table public.designs
  add column if not exists promotion_starts_at timestamptz,
  add column if not exists promotion_ends_at timestamptz;

alter table public.designs
  drop constraint if exists designs_promotion_window_check;

alter table public.designs
  add constraint designs_promotion_window_check
  check (
    promotion_starts_at is null
    or promotion_ends_at is null
    or promotion_ends_at > promotion_starts_at
  );

create index if not exists idx_designs_promotion_active_window
  on public.designs (promotion_active, promotion_starts_at, promotion_ends_at);
