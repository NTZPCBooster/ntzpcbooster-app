-- ============================================================
-- PCBoost License System — Initial Schema
-- Run this in the Supabase SQL Editor (or via CLI migration)
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ── Enums ────────────────────────────────────────────────────
create type license_plan     as enum ('vitalicio', 'mensal');
create type license_status   as enum ('active', 'revoked', 'expired', 'pending');
create type payment_status   as enum ('paid', 'refunded');
create type withdrawal_status as enum ('pending', 'paid', 'rejected');

-- ── Affiliates ───────────────────────────────────────────────
create table affiliates (
  id             uuid primary key default uuid_generate_v4(),
  name           text not null,
  email          text unique not null,
  password_hash  text not null,                -- bcrypt hash for affiliate login
  coupon_code    text unique not null,          -- e.g. "OSAMA"
  commission_pct int  not null default 20,      -- 20 = 20% of sale
  discount_pct   int  not null default 10,      -- 10 = 10% discount for buyer
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ── Licenses ─────────────────────────────────────────────────
create table licenses (
  id           uuid primary key default uuid_generate_v4(),
  key          text unique not null,
  email        text not null,
  plan         license_plan   not null default 'vitalicio',
  mobo_id      text,                           -- bound motherboard serial
  status       license_status not null default 'pending',
  activated_at timestamptz,
  expires_at   timestamptz,                    -- null = lifetime
  created_at   timestamptz not null default now()
);

-- ── Payments ─────────────────────────────────────────────────
create table payments (
  id                  uuid primary key default uuid_generate_v4(),
  license_id          uuid references licenses(id) on delete set null,
  affiliate_id        uuid references affiliates(id) on delete set null,
  stripe_payment_id   text unique not null,
  stripe_customer_id  text,
  buyer_email         text not null,
  amount              int  not null,            -- in centavos (4990 = R$49.90)
  commission_amount   int  not null default 0,  -- affiliate commission in centavos
  coupon_code_used    text,                     -- snapshot of coupon used
  status              payment_status not null default 'paid',
  refund_grace_until  timestamptz not null default (now() + interval '14 days'),
  created_at          timestamptz not null default now()
);

-- ── Withdrawals ──────────────────────────────────────────────
create table withdrawals (
  id            uuid primary key default uuid_generate_v4(),
  affiliate_id  uuid not null references affiliates(id) on delete cascade,
  amount        int  not null,                 -- in centavos
  pix_key       text,                          -- PIX key for payment
  status        withdrawal_status not null default 'pending',
  requested_at  timestamptz not null default now(),
  processed_at  timestamptz
);

-- ── Indexes ──────────────────────────────────────────────────
create index idx_licenses_key        on licenses(key);
create index idx_licenses_mobo       on licenses(mobo_id);
create index idx_licenses_status     on licenses(status);
create index idx_affiliates_coupon   on affiliates(coupon_code);
create index idx_payments_license    on payments(license_id);
create index idx_payments_affiliate  on payments(affiliate_id);
create index idx_payments_stripe     on payments(stripe_payment_id);
create index idx_withdrawals_aff     on withdrawals(affiliate_id);

-- ── Row Level Security ───────────────────────────────────────
-- All direct table access is blocked for anon/authenticated.
-- Edge functions use service_role key to bypass RLS.
alter table licenses    enable row level security;
alter table affiliates  enable row level security;
alter table payments    enable row level security;
alter table withdrawals enable row level security;

-- ── Helper: Generate License Key ─────────────────────────────
-- Format: XXXXX-XXXXX-XXXXX-XXXXX (20 alphanumeric chars)
create or replace function generate_license_key()
returns text
language plpgsql
as $$
declare
  chars  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I to avoid confusion
  result text := '';
  i      int;
begin
  for i in 1..20 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    if i in (5, 10, 15) then
      result := result || '-';
    end if;
  end loop;
  return result;
end;
$$;

-- ── View: Affiliate Dashboard Stats ──────────────────────────
create or replace view affiliate_dashboard as
select
  a.id              as affiliate_id,
  a.name,
  a.email,
  a.coupon_code,
  a.commission_pct,
  a.discount_pct,
  a.active,

  -- Sales count
  count(p.id) filter (where p.status = 'paid')
    as total_sales,

  -- Total revenue generated
  coalesce(sum(p.amount) filter (where p.status = 'paid'), 0)
    as total_revenue,

  -- Total commission earned (paid sales only)
  coalesce(sum(p.commission_amount) filter (where p.status = 'paid'), 0)
    as total_commission,

  -- Commission already past grace period (available to withdraw)
  coalesce(sum(p.commission_amount) filter (
    where p.status = 'paid' and p.refund_grace_until <= now()
  ), 0) as commission_available_gross,

  -- Commission still within grace period (pending)
  coalesce(sum(p.commission_amount) filter (
    where p.status = 'paid' and p.refund_grace_until > now()
  ), 0) as commission_pending,

  -- Already withdrawn (paid + pending withdrawal)
  coalesce((
    select sum(w.amount)
    from withdrawals w
    where w.affiliate_id = a.id and w.status in ('paid', 'pending')
  ), 0) as total_withdrawn

from affiliates a
left join payments p on p.affiliate_id = a.id
group by a.id, a.name, a.email, a.coupon_code, a.commission_pct, a.discount_pct, a.active;

-- ── View: Admin Overview ─────────────────────────────────────
create or replace view admin_overview as
select
  (select count(*) from licenses)                                    as total_licenses,
  (select count(*) from licenses where status = 'active')            as active_licenses,
  (select count(*) from licenses where status = 'pending')           as pending_licenses,
  (select count(*) from licenses where plan = 'vitalicio' and status = 'active') as lifetime_active,
  (select count(*) from licenses where plan = 'mensal' and status = 'active')    as monthly_active,
  (select count(distinct mobo_id) from licenses where mobo_id is not null)       as unique_devices,
  (select coalesce(sum(amount), 0) from payments where status = 'paid')          as total_revenue,
  (select count(*) from affiliates where active = true)              as active_affiliates;
