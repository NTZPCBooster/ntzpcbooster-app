-- ============================================================
-- PCBoost — Add 'anual' to license_plan enum
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Add the missing 'anual' value to the enum
ALTER TYPE license_plan ADD VALUE IF NOT EXISTS 'anual';

-- Update admin_overview view to include annual count
CREATE OR REPLACE VIEW admin_overview AS
SELECT
  (SELECT count(*) FROM licenses)                                             AS total_licenses,
  (SELECT count(*) FROM licenses WHERE status = 'active')                     AS active_licenses,
  (SELECT count(*) FROM licenses WHERE status = 'pending')                    AS pending_licenses,
  (SELECT count(*) FROM licenses WHERE plan = 'vitalicio' AND status = 'active') AS lifetime_active,
  (SELECT count(*) FROM licenses WHERE plan = 'mensal'    AND status = 'active') AS monthly_active,
  (SELECT count(*) FROM licenses WHERE plan = 'anual'     AND status = 'active') AS annual_active,
  (SELECT count(DISTINCT mobo_id) FROM licenses WHERE mobo_id IS NOT NULL)    AS unique_devices,
  (SELECT coalesce(sum(amount), 0) FROM payments WHERE status = 'paid')       AS total_revenue,
  (SELECT count(*) FROM affiliates WHERE active = true)                       AS active_affiliates;
