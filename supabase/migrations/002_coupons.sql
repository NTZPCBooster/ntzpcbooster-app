-- ============================================================
-- PCBoost — Coupons Table
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ── Coupons ──────────────────────────────────────────────────
create table coupons (
  id            uuid primary key default uuid_generate_v4(),
  code          text unique not null,
  discount_pct  int  not null default 10  check (discount_pct >= 1 and discount_pct <= 100),
  max_uses      int  not null default 1,
  current_uses  int  not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create index idx_coupons_code on coupons (code);

alter table coupons enable row level security;

-- Make stripe_payment_id nullable so coupon redemptions (no Stripe) work
alter table payments alter column stripe_payment_id drop not null;
