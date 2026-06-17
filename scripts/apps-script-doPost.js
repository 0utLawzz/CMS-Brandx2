/**
 * BrandEx CMS — Google Sheets Sync (doPost / doGet)
 * ══════════════════════════════════════════════════
 *
 * INSTRUCTIONS — Replace ONLY lines 1–105 of your existing Apps Script
 * (the old doPost / doGet / jsonResponse / COL_MAP section) with this block.
 * Leave ALL other functions (TM-11, Folder Search, Duplicate Check, etc.) untouched.
 *
 * ── HOW TO UPDATE ──────────────────────────────────────────────────────────
 *  1. Open your Google Sheet → Extensions → Apps Script
 *  2. Select and DELETE everything from line 1 down to and including
 *     the closing brace of the old jsonResponse function (line ~105).
 *  3. Paste THIS ENTIRE block at the very top, before the CONFIG = {...} line.
 *  4. Click Save.
 *  5. Click Deploy → Manage deployments → Edit (pencil) on your existing deployment
 *     → change Version to "New version" → Deploy.
 *     (The URL stays the same — no need to change APPS_SCRIPT_URL in .env)
 *
 * ── NEW SHEET COLUMN MAP (Record sheet — 22 columns A–V) ──────────────────
 *  A  col 1  = status_run      (Run / Processing / Done)
 *  B  col 2  = stage
 *  C  col 3  = sr_no           ← PRIMARY KEY used for update lookup
 *  D  col 4  = tm_no           ← FALLBACK KEY if sr_no is empty
 *  E  col 5  = folder_name
 *  F  col 6  = date_l          (filing date, e.g. 01-Jun-2026)
 *  G  col 7  = class           (01–45)
 *  H  col 8  = class_desc      (goods & services text)
 *  I  col 9  = app_type        (SOLE PROPRIETOR / PARTNERSHIP / COMPANY / INDIVIDUAL)
 *  J  col 10 = app_name        (applicant full name)
 *  K  col 11 = app_so          (father's name / S/O)
 *  L  col 12 = app_cnic        (CNIC / NTN / Passport)
 *  M  col 13 = issue_date
 *  N  col 14 = expiry_date
 *  O  col 15 = app_trade       (business / trade name)
 *  P  col 16 = app_add         (applicant address)
 *  Q  col 17 = year
 *  R  col 18 = con_name        (consultant name)
 *  S  col 19 = con_add         (consultant address)
 *  T  col 20 = img             (image URL or Drive file ID)
 *  U  col 21 = no_img          (notes / fallback text)
 *  V  col 22 = created_at      (auto-written on INSERT only)
 * ──────────────────────────────────────────────────────────────────────────
 *
 * ── PAYLOAD FORMAT from CMS ───────────────────────────────────────────────
 *  POST { action: "upsert", sr_no, tm_no, status_run, stage, ... }
 *  POST { action: "delete", sr_no, id }   ← marks row red, does NOT delete row
 *  GET  → health check
 */

// ── Column index map for the Record sheet (1-based) ─────────────────────────
var CMS_COL = {
  status_run:  1,
  stage:       2,
  sr_no:       3,
  tm_no:       4,
  folder_name: 5,
  date_l:      6,
  class:       7,
  class_desc:  8,
  app_type:    9,
  app_name:    10,
  app_so:      11,
  app_cnic:    12,
  issue_date:  13,
  expiry_date: 14,
  app_trade:   15,
  app_add:     16,
  year:        17,
  con_name:    18,
  con_add:     19,
  img:         20,
  no_img:      21,
  created_at:  22,
};

// Column order as array for building a full row on INSERT
var CMS_FIELDS = [
  'status_run','stage','sr_no','tm_no','folder_name','date_l',
  'class','class_desc','app_type','app_name','app_so','app_cnic',
  'issue_date','expiry_date','app_trade','app_add','year',
  'con_name','con_add','img','no_img','created_at',
];

var CMS_SHEET_NAME = 'Record';
var CMS_DATA_START = 2; // row 1 = header

/**
 * doPost — receives requests from the BrandEx CMS Node.js API
 *
 * Supported actions:
 *   "upsert" — find row by sr_no (col C) or tm_no (col D) and update,
 *              or append a new row if not found.
 *   "delete" — highlight the row orange/red to mark as deleted in CMS
 *              (row is NOT physically deleted from the sheet).
 */
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action  = String(payload.action || 'upsert').toLowerCase();

    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CMS_SHEET_NAME);

    if (!sheet) {
      return _jsonResp({ status: 'error', message: 'Sheet "' + CMS_SHEET_NAME + '" not found' });
    }

    // ── UPSERT ───────────────────────────────────────────────────────────────
    if (action === 'upsert') {
      var srNo   = String(payload.sr_no  || '').trim();
      var tmNo   = String(payload.tm_no  || '').trim();

      // Find existing row
      var foundRow = _findRow(sheet, srNo, tmNo);

      if (foundRow > 0) {
        // UPDATE — write each known field
        var updated = [];
        CMS_FIELDS.forEach(function(field) {
          if (field === 'created_at') return; // never overwrite
          var colIdx = CMS_COL[field];
          if (colIdx && payload[field] !== undefined && payload[field] !== null) {
            sheet.getRange(foundRow, colIdx).setValue(String(payload[field]));
            updated.push(field);
          }
        });
        SpreadsheetApp.flush();
        return _jsonResp({ status: 'updated', row: foundRow, fields: updated });

      } else {
        // INSERT — append new row at the bottom
        var newRow = [];
        CMS_FIELDS.forEach(function(field) {
          if (field === 'created_at') {
            newRow.push(Utilities.formatDate(new Date(), 'GMT+5', 'dd-MMM-yyyy HH:mm'));
          } else {
            newRow.push(String(payload[field] !== undefined && payload[field] !== null ? payload[field] : ''));
          }
        });
        sheet.appendRow(newRow);
        SpreadsheetApp.flush();
        var insertedRow = sheet.getLastRow();
        return _jsonResp({ status: 'inserted', row: insertedRow });
      }
    }

    // ── DELETE (soft — highlight only) ──────────────────────────────────────
    if (action === 'delete') {
      var dSrNo = String(payload.sr_no || '').trim();
      var dTmNo = String(payload.tm_no || '').trim();
      var delRow = _findRow(sheet, dSrNo, dTmNo);

      if (delRow > 0) {
        sheet.getRange(delRow, 1, 1, CMS_FIELDS.length)
             .setBackground('#f4cccc'); // light red — marks as deleted in CMS
        sheet.getRange(delRow, CMS_COL.no_img)
             .setValue('[DELETED IN CMS]');
        SpreadsheetApp.flush();
        return _jsonResp({ status: 'marked_deleted', row: delRow });
      }
      return _jsonResp({ status: 'not_found' });
    }

    return _jsonResp({ status: 'error', message: 'Unknown action: ' + action });

  } catch (err) {
    return _jsonResp({ status: 'error', message: err.toString() });
  }
}

/**
 * doGet — health check, visit the Web App URL in browser to confirm.
 */
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return _jsonResp({
    status:  'ok',
    message: 'BrandEx CMS Sync is running ✓',
    sheet:   ss.getName(),
    record_sheet: CMS_SHEET_NAME,
  });
}

/** Helper — search for a row by sr_no (col C) then tm_no (col D). Returns row number or 0. */
function _findRow(sheet, srNo, tmNo) {
  var lastRow = sheet.getLastRow();
  if (lastRow < CMS_DATA_START) return 0;

  var numRows = lastRow - CMS_DATA_START + 1;

  // Try sr_no first (col C = index 3)
  if (srNo) {
    var srVals = sheet.getRange(CMS_DATA_START, CMS_COL.sr_no, numRows, 1).getValues();
    for (var i = 0; i < srVals.length; i++) {
      if (String(srVals[i][0]).trim() === srNo) return CMS_DATA_START + i;
    }
  }

  // Fallback to tm_no (col D = index 4)
  if (tmNo) {
    var tmVals = sheet.getRange(CMS_DATA_START, CMS_COL.tm_no, numRows, 1).getValues();
    for (var j = 0; j < tmVals.length; j++) {
      if (String(tmVals[j][0]).trim() === tmNo) return CMS_DATA_START + j;
    }
  }

  return 0; // not found
}

/** Helper — return JSON ContentService response */
function _jsonResp(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════════════════
// ↑↑↑  PASTE ABOVE BLOCK AT TOP — REPLACE OLD doPost/doGet/jsonResponse/COL_MAP
// ↓↓↓  EVERYTHING BELOW THIS LINE STAYS UNCHANGED
// ═══════════════════════════════════════════════════════════════════════════
