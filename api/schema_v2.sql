-- ─────────────────────────────────────────────────────────────────────────────
-- BrandEx Law — Schema V2 (21 Columns, A–U)
-- Run this in phpMyAdmin to upgrade your existing trademarks table
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE trademarks
  ADD COLUMN IF NOT EXISTS status_run  ENUM('Run','Processing','Done') DEFAULT 'Run' AFTER id,
  ADD COLUMN IF NOT EXISTS stage       VARCHAR(20)   AFTER status_run,
  ADD COLUMN IF NOT EXISTS sr_no       VARCHAR(50)   AFTER stage,
  ADD COLUMN IF NOT EXISTS tm_no       VARCHAR(20)   AFTER sr_no,
  ADD COLUMN IF NOT EXISTS folder_name VARCHAR(255)  AFTER tm_no,
  ADD COLUMN IF NOT EXISTS date_l      VARCHAR(60)   AFTER folder_name,
  ADD COLUMN IF NOT EXISTS class_desc  TEXT          AFTER class,
  ADD COLUMN IF NOT EXISTS app_type    ENUM('SOLE','PARTNER','COMPANY') AFTER class_desc,
  ADD COLUMN IF NOT EXISTS app_name    VARCHAR(255)  AFTER app_type,
  ADD COLUMN IF NOT EXISTS app_so      VARCHAR(255)  AFTER app_name,
  ADD COLUMN IF NOT EXISTS app_cnic    VARCHAR(20)   AFTER app_so,
  ADD COLUMN IF NOT EXISTS issue_date  VARCHAR(60)   AFTER app_cnic,
  ADD COLUMN IF NOT EXISTS expiry_date VARCHAR(60)   AFTER issue_date,
  ADD COLUMN IF NOT EXISTS app_trade   VARCHAR(255)  AFTER expiry_date,
  ADD COLUMN IF NOT EXISTS app_add     TEXT          AFTER app_trade,
  ADD COLUMN IF NOT EXISTS year        VARCHAR(4)    AFTER app_add,
  ADD COLUMN IF NOT EXISTS con_name    VARCHAR(255)  AFTER year,
  ADD COLUMN IF NOT EXISTS con_add     TEXT          AFTER con_name,
  ADD COLUMN IF NOT EXISTS img         VARCHAR(255)  AFTER con_add,
  ADD COLUMN IF NOT EXISTS no_img      VARCHAR(255)  AFTER img;

-- Migrate old column data to new columns (run once)
UPDATE trademarks SET
  sr_no    = COALESCE(sr_no, case_no),
  app_name = COALESCE(app_name, name),
  tm_no    = COALESCE(tm_no, tm_number),
  stage    = COALESCE(stage, status),
  date_l   = COALESCE(date_l, date),
  status_run = COALESCE(status_run, 'Run')
WHERE sr_no IS NULL OR sr_no = '';

-- Unique index on sr_no
ALTER TABLE trademarks ADD UNIQUE INDEX IF NOT EXISTS idx_sr_no (sr_no);
CREATE INDEX IF NOT EXISTS idx_tm_no_v2 ON trademarks (tm_no);
CREATE INDEX IF NOT EXISTS idx_app_name ON trademarks (app_name);
CREATE INDEX IF NOT EXISTS idx_status_run ON trademarks (status_run);
