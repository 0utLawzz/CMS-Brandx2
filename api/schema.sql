-- ─────────────────────────────────────────────────────────────────────────────
-- BrandEx Law — Trademark Portal Database Schema
-- Run this in phpMyAdmin on your Hostinger MySQL database
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trademarks (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  date          VARCHAR(20),
  case_no       VARCHAR(50)  NOT NULL UNIQUE,
  name          VARCHAR(255) NOT NULL,
  tm_number     VARCHAR(20),
  class         VARCHAR(10),
  status        VARCHAR(100),
  sub_status    VARCHAR(150),
  is_duplicate  TINYINT(1)   DEFAULT 0,
  tm11          VARCHAR(20),
  notes         TEXT,
  city          VARCHAR(50),
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Index for fast searching
CREATE INDEX idx_case_no    ON trademarks (case_no);
CREATE INDEX idx_name       ON trademarks (name);
CREATE INDEX idx_tm_number  ON trademarks (tm_number);
CREATE INDEX idx_status     ON trademarks (status);
CREATE INDEX idx_city       ON trademarks (city);

-- ─────────────────────────────────────────────────────────────────────────────
-- Journal entries table (for the Journal tab — future feature)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS journal_entries (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  case_no     VARCHAR(50),
  entry_date  VARCHAR(20),
  title       VARCHAR(255),
  body        TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
