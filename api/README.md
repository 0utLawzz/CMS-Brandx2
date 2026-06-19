# BrandEx API — Setup Guide

This is the Node.js + Google Sheets backend API and SPA Frontend for BrandEx Law Trademark Portal.
The database has been fully migrated to Google Sheets.

---

## The Frontend Theme (Neo-Brutalism)

**IMPORTANT: Do NOT change the frontend theme.**

The application strictly adheres to the **Neo-Brutalism Theme | BrandEx Law Edition Version 1.0**.
All future modifications must obey these rules:

1. **Color Palette:**
   - Near-Black (`#0C0C0C`), Warm Cream (`#F0E8D0`), Deep Cream (`#E8DFC7`), Off-White (`#232323`), Burnt Orange (`#C94A00`), Dark Teal (`#0A6B52`), Bright Teal (`#0D9970`), Bold Yellow (`#D4A800`).
2. **Typography:**
   - `Bebas Neue` for Display/Headings.
   - `Space Grotesk` for Body.
   - `DM Mono` for Labels/Code.
3. **Borders & Shadows:**
   - Zero gradients, zero blurs. Shadows must be hard, e.g. `5px 5px 0 #0C0C0C`.
   - Borders are solid `#0C0C0C` (2px or 3px). 
   - Hard corners default (`0px` radius). `6px` max for buttons/cards.
4. **Interactions:**
   - Hover = LIFT `translate(-x, -y)` and shadow grows.
   - Click = PRESS `translate(+x, +y)` and shadow shrinks to 0.

---

## API Endpoints

The API is fully mapped to the `Trademarks` and `Logs` sheets in Google Sheets.

| Method | Endpoint | What it does |
|--------|----------|-------------|
| GET | `/api/health` | Check if API + DB are working |
| GET | `/api/trademarks` | Get paginated records (supports filters like `?stage=`, `?assigned_person=`, etc) |
| GET | `/api/trademarks/:id` | Get single record |
| POST | `/api/trademarks` | Create new trademark |
| PATCH | `/api/trademarks/:id` | Edit a record (auto-logs to `audit_logs`) |
| DELETE | `/api/trademarks/:id` | Soft-delete a record (`archived = true`) |
| GET | `/api/assignments` | Gets records currently assigned to someone |
| GET | `/api/assignments/stats`| Gets assignment stats |
| POST | `/api/assignments` | Assign a trademark |

---

## Running Locally

1. Make sure you have the `.env` in `api/` with `SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, and `GOOGLE_PRIVATE_KEY`.
2. `npm install` in the root folder.
3. Start the server using:
   ```bash
   node server.js
   ```
4. Access `http://localhost:5000`
