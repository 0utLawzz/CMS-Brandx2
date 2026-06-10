---
name: BrandEx Schema V2 (21 columns)
description: The trademarks table was upgraded from 11 old columns to 21 new columns (A–U). Migration runs automatically on API startup.
---

# BrandEx Schema V2

## New columns (A–U)
status_run (Run/Processing/Done), stage (STAGE 1-4), sr_no (PB-RWP-…),
tm_no (primary searchable key), folder_name, date_l, class_desc, app_type (SOLE/PARTNER/COMPANY),
app_name, app_so (father's name), app_cnic (XXXXX-XXXXXXX-X), issue_date, expiry_date (+7 days auto),
app_trade, app_add, year, con_name, con_add, img (Drive file ID), no_img.

## Old columns kept for backward compat
date, case_no, name, tm_number, class, status, sub_status, is_duplicate, tm11, notes, city.

## Auto-seed on migration
case_no → sr_no, name → app_name, tm_number → tm_no, status → stage, date → date_l

**Why:** User requested a complete data model expansion from basic 11-col CSV structure to full 21-col trademark management schema. Columns seeded from old values so 1,113 existing records are preserved.

**How to apply:** runMigrations() in api/db.js uses ADD COLUMN IF NOT EXISTS — safe to call multiple times.
