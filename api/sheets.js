const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

let sheets = null;
let spreadsheetId = process.env.SHEET_ID;

// If we have a Service Account configured, initialize the Google Auth client
if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
  try {
    let privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
    if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
      privateKey = privateKey.slice(1, -1);
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL.replace(/['"]/g, ''),
        private_key: privateKey,
      },
      scopes: SCOPES,
    });
    
    sheets = google.sheets({ version: 'v4', auth });
    console.log('✅ Google Sheets API client initialized');
  } catch (err) {
    console.error('❌ Google Sheets Auth Error:', err.message);
  }
} else {
  console.warn('⚠️ Google Sheets Service Account credentials not found in .env');
}

module.exports = {
  sheets,
  spreadsheetId,
  getSheetsClient: () => sheets
};
