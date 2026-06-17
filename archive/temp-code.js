/**
 * BrandEx Law — Google Sheets Sync Script
 * ════════════════════════════════════════
 * HOW TO INSTALL (5 minutes, one-time setup):
 *
 *  1. Open your Google Sheet.
 *  2. Click  Extensions  →  Apps Script.
 *  3. Delete any existing code in the editor.
 *  4. Paste THIS ENTIRE FILE into the editor.
 *  5. Click  Save  (floppy disk icon) — name the project "BrandEx Sync".
 *  6. Click  Deploy  →  New deployment.
 *  7. Click the gear icon ⚙ next to "Type" → select  Web app.
 *  8. Set:
 *       Execute as  →  Me
 *       Who has access  →  Anyone
 *  9. Click  Deploy.
 * 10. Click  Authorize access  and allow the permissions.
 * 11. Copy the  Web app URL  shown at the end.
 * 12. Open  mobile/hooks/useSheet.ts  in your project.
 * 13. Find the line:  export const SHEET_WRITE_URL = '';
 * 14. Paste your URL:  export const SHEET_WRITE_URL = 'https://script.google.com/...';
 * 15. Save useSheet.ts — done! Edits in the app will now write back to your sheet.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * Column map (matches your sheet layout):
 *   A=1 DATE  |  B=2 CASE NO  |  C=3 APP NAME  |  D=4 TM NO  |  E=5 CLASS
 *   F=6 STATUS  |  G=7 SUB STATUS  |  H=8 DUPLICATE  |  I=9 TM-11
 *   J=10 NOTES  |  K=11 CITY
 * ────────────────────────────────────────────────────────────────────────────
 */

var COL_MAP = {
    NAME: 3,   // Column C — App Name
    NUMBER: 4,   // Column D — TM No
    CLASS: 5,   // Column E — Class
    STATUS: 6,   // Column F — Status
    SUB_STATUS: 7,   // Column G — Sub Status
    NOTES: 10,  // Column J — Notes
    CITY: 11,  // Column K — City
};

/**
 * Receives POST requests from the BrandEx app and writes the edit to the sheet.
 * Expected body (JSON string): { caseNo: "X-123-001", edits: { NAME: "...", STATUS: "..." } }
 */
function doPost(e) {
    try {
        var data = JSON.parse(e.postData.contents);
        var caseNo = String(data.caseNo || '').trim();
        var edits = data.edits || {};

        if (!caseNo) {
            return jsonResponse({ status: 'error', message: 'Missing caseNo' });
        }

        var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
        var values = sheet.getDataRange().getValues();

        // Search for the row by Case No (column B = index 1)
        for (var i = 1; i < values.length; i++) {
            if (String(values[i][1]).trim() === caseNo) {
                var updated = [];
                Object.keys(edits).forEach(function (key) {
                    var colIndex = COL_MAP[key];
                    if (colIndex && edits[key] !== undefined && edits[key] !== null) {
                        sheet.getRange(i + 1, colIndex).setValue(edits[key]);
                        updated.push(key);
                    }
                });

                SpreadsheetApp.flush(); // write immediately

                return jsonResponse({
                    status: 'ok',
                    row: i + 1,
                    caseNo: caseNo,
                    updated: updated,
                });
            }
        }

        // Case No not found
        return jsonResponse({ status: 'not_found', caseNo: caseNo });

    } catch (err) {
        return jsonResponse({ status: 'error', message: err.toString() });
    }
}

/**
 * Health-check — visit the Web App URL in a browser to confirm it's running.
 */
function doGet(e) {
    return jsonResponse({
        status: 'ok',
        message: 'BrandEx Sheet Sync is running ✓',
        sheet: SpreadsheetApp.getActiveSpreadsheet().getName(),
    });
}

function jsonResponse(obj) {
    return ContentService
        .createTextOutput(JSON.stringify(obj))
        .setMimeType(ContentService.MimeType.JSON);
}




// =====================================================================
// BRANDEX LAW ASSOCIATE — TRADEMARK MANAGEMENT SYSTEM
// =====================================================================
//
// RECORD SHEET COLUMN MAP:
//   A  = DATE TIME
//   B  = CASE NO / FOLDER RESULT  col 2  ← folder name written here
//   C  = APP NAME
//   D  = TM NO                    col 4  ← search key
//   E  = CLASS
//   F  = APPLICATION STATUS
//   G  = APPLICATION SUB STATUS
//   H  = TICK AP                  col 8  ← checkbox (ticked on duplicate)
//   I  = CK TM11                  col 9  ← checkbox (ticked when TM-11 submitted)
//   J  = NOTES                    col 10 ← submitted text / dup note
//
// TM-11 SHEET COLUMN MAP:
//   C  = TM No   col 3
//   G  = Date    col 7
//   H  = Status  col 8  ← ✅ In Record / ❌ Not in Record
//
// =====================================================================

const CONFIG = {
    SEARCH_FOLDERS: {
        ALL_CLIENTS: '18T0MojE1IiT7uIz9P8Sthlamj8icR8X6',
        CONSULTANTS: '1Ke_B9vI_DdiiXPTTCBDtS4Ny6l73kIBU'
    },
    SHEETS: {
        RECORD: 'Record',
        TM11: 'TM-11'
    },
    R: {
        FOLDER: 2,   // B  ← folder name result
        TM_NO: 4,   // D  ← search key
        TICK_AP: 8,   // H  ← checkbox, ticked on duplicate
        CK_TM11: 9,   // I  ← checkbox, ticked when TM-11 submitted
        NOTES: 10   // J  ← submitted text / dup notes
    },
    T: {
        TM_NO: 3,   // C
        DATE: 7,   // G
        STATUS: 8    // H
    },
    DATA_START: 2,
    TZ: 'GMT+5'
};

// ─────────────────────────────────────────────────────────────────────
// MENU
// ─────────────────────────────────────────────────────────────────────
function onOpen() {
    SpreadsheetApp.getUi()
        .createMenu('🛠️ TOOLS')
        .addItem('📋 TM-11 Check', 'checkAndUpdateSubmissions')
        .addItem('🔍 Check Duplicates', 'highlightAndMoveDuplicatesTM')
        .addItem('🔄 Update Colors & Format All', 'updateColorsAndFormat')
        .addSeparator()
        .addItem('📁 Folder Search — This Row', 'folderSearchSelectedRow')
        .addItem('📁 Folder Search — All Empty', 'folderSearchAllEmpty')
        .addItem('🔬 Leader Check', 'matchFromAllSheets_Multi')
        .addSeparator()
        .addItem('🚦 Find Case (Both)', 'processSelectedRow')
        .addItem('🚦 Search 🅱 (All Clients)', 'processSelectedRow_AllClients')
        .addItem('🚦 Search 🅰 (Consultants)', 'processSelectedRow_Consultants')

        .addToUi();
}

// ─────────────────────────────────────────────────────────────────────
// ON EDIT
// ─────────────────────────────────────────────────────────────────────
function onEdit(e) {
    const sheet = e.source.getActiveSheet();
    if (sheet.getName() !== CONFIG.SHEETS.RECORD) return;

    const col = e.range.getColumn();
    const row = e.range.getRow();
    if (row < CONFIG.DATA_START) return;

    if (col === CONFIG.R.TM_NO) {
        _checkDuplicateOnEdit(e, sheet, row);
        _autoFolderSearch(sheet, row);
    }
}

// =====================================================================
// FEATURE 1 — TM-11 CHECK
// =====================================================================
function checkAndUpdateSubmissions() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const recSh = ss.getSheetByName(CONFIG.SHEETS.RECORD);
    const tm11Sh = ss.getSheetByName(CONFIG.SHEETS.TM11);

    if (!recSh || !tm11Sh) {
        SpreadsheetApp.getUi().alert('❌ Sheet "Record" or "TM-11" not found!');
        return;
    }

    const lastR = recSh.getLastRow();
    const lastT = tm11Sh.getLastRow();
    if (lastR < CONFIG.DATA_START || lastT < CONFIG.DATA_START) {
        SpreadsheetApp.getActive().toast('No data.', 'Info', 4);
        return;
    }

    const numR = lastR - CONFIG.DATA_START + 1;
    const numT = lastT - CONFIG.DATA_START + 1;

    const recNos = recSh
        .getRange(CONFIG.DATA_START, CONFIG.R.TM_NO, numR, 1)
        .getValues().flat()
        .map(v => String(v).trim().toUpperCase());

    const recSet = new Set(recNos.filter(Boolean));

    const tm11Nos = tm11Sh.getRange(CONFIG.DATA_START, CONFIG.T.TM_NO, numT, 1).getValues();
    const tm11Dates = tm11Sh.getRange(CONFIG.DATA_START, CONFIG.T.DATE, numT, 1).getValues();

    const tm11Map = new Map();
    tm11Nos.forEach((r, i) => {
        const key = String(r[0]).trim().toUpperCase();
        if (key) tm11Map.set(key, tm11Dates[i][0]);
    });

    let count = 0;
    const updatedRows = [];

    recNos.forEach((no, i) => {
        if (!no || !tm11Map.has(no)) return;
        const rowNum = CONFIG.DATA_START + i;
        const ckCell = recSh.getRange(rowNum, CONFIG.R.CK_TM11);
        if (ckCell.getValue() === true) return;

        ckCell.setValue(true);

        const d = tm11Map.get(no);
        const dateStr = (d instanceof Date)
            ? Utilities.formatDate(d, CONFIG.TZ, 'dd-MMM-yyyy')
            : Utilities.formatDate(new Date(), CONFIG.TZ, 'dd-MMM-yyyy');

        // Col J only — never beyond col 10
        recSh.getRange(rowNum, CONFIG.R.NOTES)
            .setValue('SUBMITTED ON ' + dateStr)
            .setFontLine('underline');

        updatedRows.push(rowNum);
        count++;
    });

    // Yellow highlight A:J only (cols 1–10)
    updatedRows.forEach(r => {
        recSh.getRange(r, 1, 1, 10).setBackground('#fff2cc');
    });

    // Update TM-11 Col H
    const statusVals = tm11Nos.map(r => {
        const key = String(r[0]).trim().toUpperCase();
        if (!key) return [''];
        return [recSet.has(key) ? '✅ In Record' : '❌ Not in Record'];
    });
    tm11Sh.getRange(CONFIG.DATA_START, CONFIG.T.STATUS, statusVals.length, 1).setValues(statusVals);

    SpreadsheetApp.getActive().toast(
        count > 0
            ? `✅ ${count} rows updated. TM-11 Col H refreshed.`
            : 'ℹ️ No new matches. TM-11 Col H refreshed.',
        count > 0 ? '🎉 Done' : 'No Updates', 8
    );
}

// =====================================================================
// FEATURE  — LEDER CHECK 
// =====================================================================

function matchFromAllSheets_Multi() {
    const targetSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("RE");
    const sourceFile = SpreadsheetApp.openById("1tZqytFeYCnFCxVqJWTIUqJC8qwpop_J6IkuNwbr9nfw");

    const targetData = targetSheet.getRange("D2:D").getValues();
    const output = [];

    const sheets = sourceFile.getSheets();

    let map = {};

    // 🔁 Collect ALL matches
    sheets.forEach(sheet => {
        const data = sheet.getRange("D5:E999").getValues();
        data.forEach(row => {
            const key = row[0];
            const value = row[1];

            if (key && value) {
                if (!map[key]) {
                    map[key] = [];
                }
                map[key].push(value);
            }
        });
    });

    // 🎯 Match and join duplicates
    targetData.forEach(row => {
        const val = row[0];
        if (val && map[val]) {
            // Remove duplicates (optional)
            const unique = [...new Set(map[val])];
            output.push([unique.join(", ")]);
        } else {
            output.push([""]);
        }
    });

    // 📥 Write to Column J
    targetSheet.getRange(2, 10, output.length, 1).setValues(output);
}

// =====================================================================
// FEATURE 2 — DUPLICATE CHECK (menu)
// =====================================================================
function highlightAndMoveDuplicatesTM() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.RECORD);
    if (!sheet) { ss.toast("Sheet 'Record' not found!", 'Error', 8); return; }

    const lastRow = sheet.getLastRow();
    if (lastRow < CONFIG.DATA_START + 1) { ss.toast('Not enough data.', 'Info', 5); return; }

    const numRows = lastRow - CONFIG.DATA_START + 1;
    const tmValues = sheet
        .getRange(CONFIG.DATA_START, CONFIG.R.TM_NO, numRows, 1)
        .getValues().flat()
        .map(v => String(v).trim());

    const freq = {};
    tmValues.forEach(v => { if (v) freq[v] = (freq[v] || 0) + 1; });

    const firstSeen = {};
    tmValues.forEach((v, i) => {
        if (v && !(v in firstSeen)) firstSeen[v] = CONFIG.DATA_START + i;
    });

    const allRows = {};
    tmValues.forEach((v, i) => {
        if (v && freq[v] > 1) {
            if (!allRows[v]) allRows[v] = [];
            allRows[v].push(CONFIG.DATA_START + i);
        }
    });

    let dupCount = 0;

    tmValues.forEach((v, i) => {
        if (!v || freq[v] <= 1) return;
        const row = CONFIG.DATA_START + i;
        const others = allRows[v].filter(r => r !== row);

        sheet.getRange(row, 1, 1, 10).setBackground('#f4cccc');
        sheet.getRange(row, CONFIG.R.TICK_AP).setValue(true);

        const note = (row === firstSeen[v])
            ? `⚠️ DUP — also in rows: ${others.join(', ')}`
            : `⚠️ DUP of row ${firstSeen[v]}`;
        sheet.getRange(row, CONFIG.R.NOTES).setValue(note);
        dupCount++;
    });

    if (dupCount === 0) {
        ss.toast('✅ No duplicates found in Column D.', 'All Clear', 6);
    } else {
        ss.toast(`⚠️ ${dupCount} duplicate rows. Col H ticked, Col J has row refs.`, 'Duplicates Found', 8);
    }
}

// ─────────────────────────────────────────────────────────────────────
// FEATURE 2b — real-time duplicate on edit
// ─────────────────────────────────────────────────────────────────────
function _checkDuplicateOnEdit(e, sheet, row) {
    const tmNo = String(e.value || '').trim();
    e.range.setBackground(null);
    if (!tmNo) return;

    const lastRow = sheet.getLastRow();
    const numRows = lastRow - CONFIG.DATA_START + 1;
    if (numRows < 1) return;

    const allTM = sheet
        .getRange(CONFIG.DATA_START, CONFIG.R.TM_NO, numRows, 1)
        .getValues().flat();

    const matchRows = [];
    allTM.forEach((v, i) => {
        if (String(v).trim() === tmNo) matchRows.push(CONFIG.DATA_START + i);
    });

    if (matchRows.length > 1) {
        const firstRow = matchRows[0];
        matchRows.forEach(r => {
            sheet.getRange(r, 1, 1, 10).setBackground('#f4cccc');
            sheet.getRange(r, CONFIG.R.TICK_AP).setValue(true);
        });

        const others = matchRows.filter(r => r !== row);
        const note = (row === firstRow)
            ? `⚠️ DUP — also in rows: ${others.join(', ')}`
            : `⚠️ DUP of row ${firstRow}`;
        sheet.getRange(row, CONFIG.R.NOTES).setValue(note);

        SpreadsheetApp.getActive().toast(
            `⚠️ Duplicate! Also in row(s): ${others.join(', ')}`, 'Duplicate Detected', 5
        );
    }
}

// =====================================================================
// FEATURE 3 — FOLDER SEARCH  (Col D → result in Col B)
//
// Uses Drive.Files.list() API query — much faster and more reliable
// than iterating folders manually. Searches inside BOTH root folders.
//
// IMPORTANT: You must enable the Drive API advanced service:
//   Apps Script → Services (+) → Drive API → Add
// =====================================================================

function _autoFolderSearch(sheet, row) {
    const tmNo = String(sheet.getRange(row, CONFIG.R.TM_NO).getValue()).trim();
    if (!tmNo) return;

    const existing = String(sheet.getRange(row, CONFIG.R.FOLDER).getValue()).trim();
    if (existing && existing !== 'Not Found' && existing !== 'Searching...') return;

    sheet.getRange(row, CONFIG.R.FOLDER).setValue('Searching...');
    SpreadsheetApp.flush();

    const result = _driveQuerySearch(tmNo);
    sheet.getRange(row, CONFIG.R.FOLDER).setValue(result);
}

function folderSearchSelectedRow() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.RECORD);
    if (!sheet) { SpreadsheetApp.getUi().alert("Sheet 'Record' not found."); return; }

    const row = sheet.getActiveRange().getRow();
    if (row < CONFIG.DATA_START) {
        SpreadsheetApp.getUi().alert('Please select a data row (row 2 or below).');
        return;
    }

    const tmNo = String(sheet.getRange(row, CONFIG.R.TM_NO).getValue()).trim();
    if (!tmNo) { SpreadsheetApp.getUi().alert('TM number is empty in this row.'); return; }

    sheet.getRange(row, CONFIG.R.FOLDER).setValue('Searching...');
    SpreadsheetApp.flush();

    const result = _driveQuerySearch(tmNo);
    sheet.getRange(row, CONFIG.R.FOLDER).setValue(result);

    SpreadsheetApp.getActive().toast(
        result === 'Not Found' ? `❌ "${tmNo}" not found in Drive.` : `✅ Found: ${result}`,
        'Folder Search', 6
    );
}

function folderSearchAllEmpty() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.RECORD);
    if (!sheet) { SpreadsheetApp.getUi().alert("Sheet 'Record' not found."); return; }

    const lastRow = sheet.getLastRow();
    const numRows = lastRow - CONFIG.DATA_START + 1;
    if (numRows < 1) return;

    const tmVals = sheet.getRange(CONFIG.DATA_START, CONFIG.R.TM_NO, numRows, 1).getValues();
    const fldVals = sheet.getRange(CONFIG.DATA_START, CONFIG.R.FOLDER, numRows, 1).getValues();

    let searched = 0, found = 0;

    for (let i = 0; i < numRows; i++) {
        const row = CONFIG.DATA_START + i;
        const tmNo = String(tmVals[i][0]).trim();
        const existing = String(fldVals[i][0]).trim();

        if (!tmNo) continue;
        if (existing && existing !== 'Not Found' && existing !== 'Searching...') continue;

        sheet.getRange(row, CONFIG.R.FOLDER).setValue('Searching...');
        SpreadsheetApp.flush();

        const result = _driveQuerySearch(tmNo);
        sheet.getRange(row, CONFIG.R.FOLDER).setValue(result);
        searched++;
        if (result !== 'Not Found') found++;
    }

    SpreadsheetApp.getActive().toast(
        `✅ Scanned ${searched} rows — ${found} folders found.`,
        'Folder Search Complete', 8
    );
}

// ─────────────────────────────────────────────────────────────────────
// DRIVE SEARCH — uses Drive API query (name contains TM number)
// Restricted to only items inside our two root folders.
// Requires: Apps Script > Services > Drive API enabled
// ─────────────────────────────────────────────────────────────────────
function _driveQuerySearch(tmNumber) {
    try {
        // Search for folders whose name contains the TM number
        // in BOTH root folders using Drive API
        const parentIds = [
            CONFIG.SEARCH_FOLDERS.ALL_CLIENTS,
            CONFIG.SEARCH_FOLDERS.CONSULTANTS
        ];

        for (const parentId of parentIds) {
            // First check if root is accessible
            try {
                DriveApp.getFolderById(parentId).getName();
            } catch (e) {
                console.error('Cannot access root folder: ' + parentId);
                continue;
            }

            // Use Drive API advanced service to query by name
            // This searches ALL levels inside the parent folder
            try {
                const query = `name contains '${tmNumber}' and trashed = false`;
                let pageToken = null;

                do {
                    const params = {
                        q: query,
                        fields: 'nextPageToken, files(id, name, parents)',
                        pageSize: 50,
                        supportsAllDrives: true,
                        includeItemsFromAllDrives: true
                    };
                    if (pageToken) params.pageToken = pageToken;

                    const response = Drive.Files.list(params);
                    const files = response.files || [];

                    for (const file of files) {
                        // Verify it lives somewhere inside our target root folder
                        if (_isInsideFolder(file.id, parentId)) {
                            return file.name;
                        }
                    }

                    pageToken = response.nextPageToken;
                } while (pageToken);

            } catch (apiErr) {
                // Drive API not enabled — fall back to manual 2-level search
                console.warn('Drive API not available, falling back: ' + apiErr);
                const fallback = _search2Levels(parentId, tmNumber);
                if (fallback) return fallback;
            }
        }

        return 'Not Found';

    } catch (err) {
        console.error('_driveQuerySearch error: ' + err);
        return 'Not Found';
    }
}

/**
 * Checks whether a file/folder (by ID) lives inside a given root folder.
 * Walks up the parent chain up to 5 levels.
 */
function _isInsideFolder(fileId, rootFolderId) {
    try {
        let item = DriveApp.getFolderById(fileId);
        for (let depth = 0; depth < 5; depth++) {
            const parents = item.getParents();
            while (parents.hasNext()) {
                const parent = parents.next();
                if (parent.getId() === rootFolderId) return true;
                item = parent;
            }
        }
    } catch (e) {
        // fileId might be a file not a folder — try as file
        try {
            const file = DriveApp.getFileById(fileId);
            const parents = file.getParents();
            while (parents.hasNext()) {
                const parent = parents.next();
                if (parent.getId() === rootFolderId) return true;
            }
        } catch (e2) { /* ignore */ }
    }
    return false;
}

/**
 * Fallback: manual 2-level iteration
 *   Root → Level-1 (client folder) → Level-2 (case folder) ← return
 */
function _search2Levels(rootFolderId, tmNumber) {
    try {
        const root = DriveApp.getFolderById(rootFolderId);

        // Files in root
        const rootFiles = root.getFiles();
        while (rootFiles.hasNext()) {
            const f = rootFiles.next();
            if (f.getName().includes(tmNumber)) return f.getName();
        }

        // Level-1 subfolders (client folders)
        const level1 = root.getFolders();
        while (level1.hasNext()) {
            const cf = level1.next();
            const cfName = cf.getName();
            if (cfName.includes(tmNumber)) return cfName;

            // Files inside client folder
            const cfFiles = cf.getFiles();
            while (cfFiles.hasNext()) {
                const f = cfFiles.next();
                if (f.getName().includes(tmNumber)) return f.getName();
            }

            // Level-2 subfolders (case folders)
            const level2 = cf.getFolders();
            while (level2.hasNext()) {
                const caseF = level2.next();
                if (caseF.getName().includes(tmNumber)) return caseF.getName();
            }
        }
        return null;
    } catch (err) {
        console.error('_search2Levels error [' + rootFolderId + ']: ' + err);
        return null;
    }
}

// =====================================================================
// 🔬 DEBUG — Select a row with a TM number, run from menu.
//    Shows exactly what Drive sees and whether Drive API is enabled.
// =====================================================================
function debugDriveSearch() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.RECORD);
    if (!sheet) { SpreadsheetApp.getUi().alert("Sheet 'Record' not found."); return; }

    const row = sheet.getActiveRange().getRow();
    const tmNo = String(sheet.getRange(row, CONFIG.R.TM_NO).getValue()).trim();
    if (!tmNo) { SpreadsheetApp.getUi().alert('No TM number in selected row.'); return; }

    let report = `🔬 DEBUG — Searching for: "${tmNo}"\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Check Drive API availability
    let driveApiAvailable = false;
    try {
        Drive.Files.list({ q: 'trashed=false', pageSize: 1 });
        driveApiAvailable = true;
        report += `✅ Drive API: ENABLED\n\n`;
    } catch (e) {
        report += `⚠️ Drive API: NOT ENABLED\n`;
        report += `   → Go to Apps Script > Services (+) > Drive API > Add\n`;
        report += `   → Falling back to manual folder search\n\n`;
    }

    const roots = {
        'ALL_CLIENTS (1)': CONFIG.SEARCH_FOLDERS.ALL_CLIENTS,
        'CONSULTANTS (2)': CONFIG.SEARCH_FOLDERS.CONSULTANTS
    };

    for (const [label, folderId] of Object.entries(roots)) {
        report += `📂 ${label}  (ID: ${folderId})\n`;

        try {
            const root = DriveApp.getFolderById(folderId);
            report += `   ✅ Accessible: "${root.getName()}"\n`;

            // Manual check — list L1 and L2
            const level1 = root.getFolders();
            let l1count = 0;
            while (level1.hasNext()) {
                const cf = level1.next();
                l1count++;
                const m1 = cf.getName().includes(tmNo) ? ' ← ✅ MATCH L1' : '';
                report += `   📁 ${cf.getName()}${m1}\n`;

                const level2 = cf.getFolders();
                while (level2.hasNext()) {
                    const c2 = level2.next();
                    const m2 = c2.getName().includes(tmNo) ? ' ← ✅ MATCH L2' : '';
                    report += `      📁 ${c2.getName()}${m2}\n`;
                }
            }
            if (l1count === 0) report += `   ⚠️ NO subfolders found in root!\n`;

        } catch (err) {
            report += `   ❌ ERROR: ${err}\n`;
            report += `   → Folder ID may be wrong or not shared with this account\n`;
        }
        report += '\n';
    }

    SpreadsheetApp.getUi().alert('🔬 Debug Result', report, SpreadsheetApp.getUi().ButtonSet.OK);
}

// =====================================================================
// TM-11 sheet 🚦 buttons
// =====================================================================
function processSelectedRow() { _legacySearch('BOTH'); }
function processSelectedRow_AllClients() { _legacySearch('ALL_CLIENTS'); }
function processSelectedRow_Consultants() { _legacySearch('CONSULTANTS'); }

function _legacySearch(mode) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.TM11);
    if (!sheet) { SpreadsheetApp.getUi().alert("Sheet 'TM-11' not found."); return; }

    const row = sheet.getActiveRange().getRow();
    if (row < 3) { SpreadsheetApp.getUi().alert('Select a data row (row 3+).'); return; }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const tmColIndex = headers.indexOf('TRADEMARK APPLICATION NO.') + 1;
    const fldColIndex = headers.indexOf('Folder') + 1;

    if (!tmColIndex || !fldColIndex) {
        SpreadsheetApp.getUi().alert('Column headers not found. Check spelling.');
        return;
    }

    const tmNumber = sheet.getRange(row, tmColIndex).getValue().toString().trim();
    if (!tmNumber) { SpreadsheetApp.getUi().alert('Trademark number is empty.'); return; }

    sheet.getRange(row, fldColIndex).setValue('Searching...');
    SpreadsheetApp.flush();

    let result = 'Not Found';
    if (mode === 'ALL_CLIENTS' || mode === 'BOTH') {
        result = _search2Levels(CONFIG.SEARCH_FOLDERS.ALL_CLIENTS, tmNumber) || 'Not Found';
    }
    if (result === 'Not Found' && (mode === 'CONSULTANTS' || mode === 'BOTH')) {
        result = _search2Levels(CONFIG.SEARCH_FOLDERS.CONSULTANTS, tmNumber) || 'Not Found';
    }

    sheet.getRange(row, fldColIndex).setValue(result);
}

// ─────────────────────────────────────────────────────────────────────
// Placeholder
// ─────────────────────────────────────────────────────────────────────
function updateColorsAndFormat() {
    SpreadsheetApp.getActive().toast('Add your formatting logic here.', 'Info', 5);
}