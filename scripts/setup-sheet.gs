/**
 * Run this function ONCE to set up the blank slate.
 * It will rename the active sheet to "Trademarks", clear it, and add all the necessary headers.
 * It also creates a "Logs" sheet for your audit history.
 */
function setupBlankSlate() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // --- Setup Trademarks Sheet ---
  let tmSheet = ss.getSheetByName('Trademarks');
  if (!tmSheet) {
    tmSheet = ss.getSheets()[0]; // Use the first sheet if 'Trademarks' doesn't exist
    tmSheet.setName('Trademarks');
  }
  
  // Clear any existing data
  tmSheet.clear();
  
  // Define columns matching the exact schema we used in Postgres
  const tmHeaders = [
    'ID', 'Filing Date', 'SR No', 'TM No', 'Applicant Name', 'Applicant SO',
    'Applicant CNIC', 'Applicant Type', 'Applicant Address', 'Class', 'Class Desc',
    'TM Trade', 'Consultant Name', 'Consultant Address', 'Stage', 'Sub Stage',
    'Assigned Person', 'Assigned City', 'Issue Date', 'Expiry Date', 'Folder Name',
    'Img', 'Notes', 'Year', 'Archived', 'Created At', 'Updated At'
  ];
  
  // Append headers to the first row
  tmSheet.getRange(1, 1, 1, tmHeaders.length).setValues([tmHeaders]);
  
  // Format headers (bold, background color)
  const tmHeaderRange = tmSheet.getRange(1, 1, 1, tmHeaders.length);
  tmHeaderRange.setFontWeight('bold');
  tmHeaderRange.setBackground('#0A6B52'); // Teal
  tmHeaderRange.setFontColor('white');
  tmSheet.setFrozenRows(1); // Freeze the header row
  
  // --- Setup Logs Sheet ---
  let logsSheet = ss.getSheetByName('Logs');
  if (!logsSheet) {
    logsSheet = ss.insertSheet('Logs');
  }
  
  logsSheet.clear();
  
  const logsHeaders = [
    'Log ID', 'Record ID', 'Field Name', 'Old Value', 'New Value', 'Changed By', 'Changed At'
  ];
  
  logsSheet.getRange(1, 1, 1, logsHeaders.length).setValues([logsHeaders]);
  
  const logsHeaderRange = logsSheet.getRange(1, 1, 1, logsHeaders.length);
  logsHeaderRange.setFontWeight('bold');
  logsHeaderRange.setBackground('#C94A00'); // Orange
  logsHeaderRange.setFontColor('white');
  logsSheet.setFrozenRows(1);
  
  SpreadsheetApp.getUi().alert('Success! Blank slate setup is complete. You now have the Trademarks and Logs sheets ready.');
}
