/**
 * BrandEx CMS - Google Apps Script
 * 
 * Instructions:
 * 1. Open Google Sheets
 * 2. Go to Extensions > Apps Script
 * 3. Paste this code and save.
 * 4. Run `setupDatabase()` to create the required sheets and headers.
 * 5. Run `createTriggers()` to enable automatic audit logging on manual edits.
 */

const HEADERS_TRADEMARKS = [
  'id', 'filing_date', 'sr_no', 'tm_no', 'applicant_name', 'applicant_so',
  'applicant_cnic', 'applicant_type', 'applicant_address', 'class', 'class_desc',
  'tm_trade', 'consultant_name', 'consultant_address', 'stage', 'sub_stage',
  'assigned_person', 'assigned_city', 'stamp_issue_date', 'stamp_expiry_date',
  'issue_date', 'expiry_date',
  'folder_name', 'img', 'notes', 'year', 'archived', 'created_at', 'updated_at',
  'prefix', 'client_no', 'case_no', 'city',
  'application_name', 'application_date', 'application_type',
  'journal_date', 'mark_text', 'status', 'status_run'
];

const HEADERS_LOGS = [
  'id', 'record_id', 'field_name', 'old_value', 'new_value', 'changed_by', 'changed_at'
];

/**
 * Creates the required sheets and headers for the database.
 */
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Setup Trademarks sheet
  let tmSheet = ss.getSheetByName('Trademarks');
  if (!tmSheet) {
    tmSheet = ss.insertSheet('Trademarks');
  }
  // Set headers if empty
  if (tmSheet.getLastRow() === 0) {
    tmSheet.getRange(1, 1, 1, HEADERS_TRADEMARKS.length).setValues([HEADERS_TRADEMARKS]);
    tmSheet.getRange(1, 1, 1, HEADERS_TRADEMARKS.length).setFontWeight("bold").setBackground("#f3f3f3");
    tmSheet.setFrozenRows(1);
  }
  
  // Setup Logs sheet
  let logSheet = ss.getSheetByName('Logs');
  if (!logSheet) {
    logSheet = ss.insertSheet('Logs');
  }
  // Set headers if empty
  if (logSheet.getLastRow() === 0) {
    logSheet.getRange(1, 1, 1, HEADERS_LOGS.length).setValues([HEADERS_LOGS]);
    logSheet.getRange(1, 1, 1, HEADERS_LOGS.length).setFontWeight("bold").setBackground("#f3f3f3");
    logSheet.setFrozenRows(1);
  }
  
  SpreadsheetApp.getUi().alert('Database setup complete! "Trademarks" and "Logs" sheets are ready.');
}

/**
 * Creates an OnEdit trigger for automatic logging of manual sheet changes.
 */
function createTriggers() {
  // Clear existing triggers to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  
  ScriptApp.newTrigger('onManualEdit')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
    
  SpreadsheetApp.getUi().alert('Triggers created! Manual edits will now be logged.');
}

/**
 * Triggered automatically when a user edits the spreadsheet.
 */
function onManualEdit(e) {
  if (!e || !e.range) return;
  
  const sheet = e.range.getSheet();
  if (sheet.getName() !== 'Trademarks') return;
  
  const row = e.range.getRow();
  if (row <= 1) return; // Ignore header edits
  
  const col = e.range.getColumn();
  if (col > HEADERS_TRADEMARKS.length) return; // Out of bounds
  
  const fieldName = HEADERS_TRADEMARKS[col - 1];
  const oldValue = String(e.oldValue || '');
  const newValue = String(e.value || '');
  
  if (oldValue === newValue) return;
  
  const recordId = sheet.getRange(row, 1).getValue(); // ID is always column 1
  if (!recordId) return; // Cannot log without ID
  
  const user = Session.getActiveUser().getEmail() || 'Manual Sheet Editor';
  const now = new Date().toISOString();
  const logId = Date.now() + Math.floor(Math.random() * 1000);
  
  const logSheet = e.source.getSheetByName('Logs');
  if (logSheet) {
    logSheet.appendRow([logId, recordId, fieldName, oldValue, newValue, user, now]);
  }
  
  // Update the 'updated_at' column (column AC = 29)
  const updatedAtCol = HEADERS_TRADEMARKS.indexOf('updated_at') + 1;
  if (updatedAtCol > 0 && col !== updatedAtCol) {
    sheet.getRange(row, updatedAtCol).setValue(now);
  }
}
