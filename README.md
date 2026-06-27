# BrandEx Law - Trademark Case Management System (CMS)

A specialized CMS for managing trademark applications through various lifecycle stages, built with Node.js, Express, and Google Sheets as the database.

## Features

- **Google Sheets Database**: Direct 2-way sync with Google Sheets (ID: `1lc3rb1e636KnwLgciiJWYrIwg9XDsx6HEM5SvBUYHzg`)
- **Stage Management**: Track cases through 4 primary stages (Application, Examination, Publication, Registration).
- **Auto-Generated Identifiers**: 
  - Folder numbers auto-build from `Prefix - ClientNo - CaseNo` (e.g. `X-785-252`).
  - Serial Numbers auto-generated (`PB-ISB-` + 18 chars).
- **KPI Dashboard**: Bottom-to-top visual chart showing case distribution and pending actionable items.
- **Assignment System**: Track agents, cities, and statuses with exportable history.
- **Audit Logs**: Full history tracking for every change on every record.
- **Print Records**: Generate printable official records.

## Project Structure

```
CMS-Brandx2/
├── index.html           # Main frontend UI
├── app.js               # Frontend application logic
├── styles.css           # UI styling and print media
├── api/
│   ├── index.js         # Backend Express API server
│   ├── sheets.js        # Google Sheets authentication and connection
│   └── .env             # Backend environment variables
├── google-apps-script.gs # Apps script for creating the database
└── README.md            # This documentation
```

## Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Ensure your `api/.env` file has the following:
   ```env
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account-email
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   SHEET_ID=1lc3rb1e636KnwLgciiJWYrIwg9XDsx6HEM5SvBUYHzg
   PORT=3000
   ```

3. **Database Setup**
   - Open your Google Sheet.
   - Go to **Extensions > Apps Script**.
   - Paste the contents of `google-apps-script.gs`.
   - Run `setupDatabase()` to create the `Trademarks` and `Logs` sheets with proper headers.
   - Run `createTriggers()` to enable automatic manual-edit logging.

4. **Run the Application**
   ```bash
   npm start
   ```
   The server will start on `http://localhost:3000`.

## Field Mapping (`{{tag}}`)

| Field Name | Description | Required |
|------------|-------------|----------|
| `application_name` | Mark / Brand / Trade Name | Yes ⭐ |
| `applicant_name` | Legal name of applicant | Yes ⭐ |
| `prefix` | X (Regular) / A (Consultant) / N (Noor Baaf) | Yes ⭐ |
| `client_no` | Client Number | Yes ⭐ |
| `case_no` | Case Number | Yes ⭐ |
| `folder_name` | Auto-generated from prefix-client-case | Auto |
| `sr_no` | Auto-generated hidden ID | Auto |
| `tm_no` | Trademark Number | Optional |
| `class` | Class number (01-45) | Yes ⭐ |
| `city` | Applicant City | Yes ⭐ |
| `stage` | Current stage (1-4, Stopped, Copyright) | Yes ⭐ |
| `stamp_issue_date` | Long format date for stamp issue | Optional |
| `stamp_expiry_date` | Auto-calculates to +7 days | Auto |
| `journal_date` | Journal number/date (Stage 3 only) | Conditional |

## Deployment

This application is ready to be deployed to Vercel or any standard Node.js hosting provider. Make sure to map the `.env` variables in your hosting provider's dashboard.
