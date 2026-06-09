# BrandEx Law — Trademark Portal

A dual-interface trademark management system for BrandEx Law (Pakistan).

## Project Structure

```
/                     ← WebView (browser app)
  index.html          ← Main web portal
  styles.css          ← Neo-brutalism theme
  app.js              ← All frontend JS logic
  server.js           ← Static file server (port 5000)
  logo.png            ← Brand logo

/mobile/              ← Expo React Native app (Android/iOS)
  App.tsx             ← Root component with tab navigation
  screens/            ← SearchScreen, RecordsScreen, JournalScreen
  components/         ← TrademarkCard, EditModal, StageChart, etc.
  hooks/useSheet.ts   ← Google Sheets data fetching + sync
  constants/colors.ts ← Brand color palette
  lib/                ← CSV parser, status helpers
```

## Workflows

- **Start application** — Serves WebView on port 5000 (`node server.js`)
- **Start Expo (Android)** — Runs Expo with tunnel for Expo Go (`cd mobile && npx expo start --tunnel`)

## Data Source

Currently fetches data from Google Sheets via published CSV URL.
Write-back uses Google Apps Script web app URL (see `mobile/hooks/useSheet.ts`).

**Future plan**: Migrate to MySQL on Hostinger with a Node.js REST API backend.

## User Preferences

- Neo-brutalism design theme (black, orange, cream, teal)
- Fonts: Bebas Neue (headings), Space Grotesk (body), DM Mono (labels)
- Keep WebView and Mobile app in sync with the same data and features
