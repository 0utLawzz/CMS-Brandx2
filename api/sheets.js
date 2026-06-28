const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

let sheets = null;
const PERMANENT_SHEET_ID = '1lc3rb1e636KnwLgciiJWYrIwg9XDsx6HEM5SvBUYHzg';
let spreadsheetId = process.env.SHEET_ID || PERMANENT_SHEET_ID;

// If we have a Service Account configured, initialize the Google Auth client
if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
  try {
    // Vercel stores env vars with literal \n — replace them with real newlines
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;
    // Strip surrounding quotes if accidentally pasted with them
    if ((privateKey.startsWith('"') && privateKey.endsWith('"')) ||
        (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
      privateKey = privateKey.slice(1, -1);
    }
    // Replace escaped newlines with real newlines
    privateKey = privateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL.trim(),
        private_key: privateKey,
      },
      scopes: SCOPES,
    });

    sheets = google.sheets({ version: 'v4', auth });
    console.log('✅ Google Sheets API client initialized');
  } catch (err) {
    console.error('❌ Google Sheets Auth Error:', err.message);
    // Don't crash — continue without sheets, routes will return 503
  }
} else {
  console.warn('⚠️ Google Sheets credentials not found in environment variables');
}

module.exports = {
  sheets,
  spreadsheetId,
  getSheetsClient: () => sheets,
};
