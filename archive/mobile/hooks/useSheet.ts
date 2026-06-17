import { useState, useCallback } from 'react';
import { parseCSV, normalize, SheetData } from '../lib/csv';

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTelzPMvLPhdXugWg7No78vyJXgc3e3h4mKDcQLAAsSvLRWQe36fyqlk7mRwIsQSB7PabmNLqKXG2cz/pub?gid=229416165&single=true&output=csv';

// ─── Column map: matches the 21-column schema (A=0 … U=20) ──────────────────
export const COL = {
  STATUS_RUN:  0,   // A — Run / Processing / Done
  STAGE:       1,   // B — STAGE 1–4
  SR_NO:       2,   // C — PB-RWP-XXXXXXXXXXXXXXXXXX
  TM_NO:       3,   // D — Trademark Number (PRIMARY SEARCH KEY)
  FOLDER:      4,   // E — Drive Folder Name
  DATE_L:      5,   // F — Long Date
  CLASS:       6,   // G — 01 to 45
  CLASS_DESC:  7,   // H — Class Description
  APP_TYPE:    8,   // I — SOLE / PARTNER / COMPANY
  APP_NAME:    9,   // J — Applicant Name ⭐
  APP_SO:      10,  // K — Father's Name (S/O)
  APP_CNIC:    11,  // L — CNIC (XXXXX-XXXXXXX-X) ⭐
  ISSUE_DATE:  12,  // M — Issue Date
  EXPIRY_DATE: 13,  // N — Expiry Date (auto +7 days)
  APP_TRADE:   14,  // O — Business / Trade Name ⭐
  APP_ADD:     15,  // P — Applicant Address ⭐
  YEAR:        16,  // Q — 2022–2026
  CON_NAME:    17,  // R — Consultant Name ⭐
  CON_ADD:     18,  // S — Consultant Address ⭐
  IMG:         19,  // T — Google Drive Image File ID
  NO_IMG:      20,  // U — Fallback text if no image
} as const;

export type ColKey = keyof typeof COL;

export interface StageCount {
  s1: number; s2: number; s3: number; s4: number; stopped: number; copyright: number;
}

export interface SheetStats {
  total: number;
  run: number;
  processing: number;
  done: number;
  stages: StageCount;
}

export interface SheetState extends SheetData {
  stats: SheetStats;
  loading: boolean;
  error: string | null;
  lastLoaded: Date | null;
}

const EMPTY_STATS: SheetStats = {
  total: 0, run: 0, processing: 0, done: 0,
  stages: { s1: 0, s2: 0, s3: 0, s4: 0, stopped: 0, copyright: 0 },
};

function computeStats(rows: string[][]): SheetStats {
  const stages: StageCount = { s1: 0, s2: 0, s3: 0, s4: 0, stopped: 0, copyright: 0 };
  let run = 0, processing = 0, done = 0;

  for (const r of rows) {
    const runVal   = (r[COL.STATUS_RUN] ?? '').trim();
    const stageVal = normalize(r[COL.STAGE] ?? '');

    if (runVal === 'Done')         done++;
    else if (runVal === 'Processing') processing++;
    else                           run++;

    if (/stage[\s_]*4/.test(stageVal)) stages.s4++;
    else if (/stage[\s_]*3/.test(stageVal)) stages.s3++;
    else if (/stage[\s_]*2/.test(stageVal)) stages.s2++;
    else if (/stage[\s_]*1/.test(stageVal)) stages.s1++;
    else if (/stopped/.test(stageVal))      stages.stopped++;
    else if (/copyright/.test(stageVal))    stages.copyright++;
  }

  return { total: rows.length, run, processing, done, stages };
}

export function useSheet() {
  const [state, setState] = useState<SheetState>({
    headers: [], rows: [], stats: EMPTY_STATS,
    loading: false, error: null, lastLoaded: null,
  });
  const [localEdits, setLocalEdits] = useState<Record<string, Partial<Record<ColKey, string>>>>({});

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch(SHEET_CSV_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const { headers, rows } = parseCSV(text);
      setState({ headers, rows, stats: computeStats(rows), loading: false, error: null, lastLoaded: new Date() });
    } catch (err: unknown) {
      setState((s) => ({ ...s, loading: false, error: err instanceof Error ? err.message : 'Unknown error' }));
    }
  }, []);

  const search = useCallback(
    (query: string): string[][] => {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      return state.rows.filter(r =>
        (r[COL.TM_NO]    ?? '').toLowerCase() === q ||
        (r[COL.TM_NO]    ?? '').toLowerCase().includes(q) ||
        (r[COL.APP_NAME] ?? '').toLowerCase().includes(q) ||
        (r[COL.SR_NO]    ?? '').toLowerCase().includes(q) ||
        (r[COL.APP_CNIC] ?? '').toLowerCase().includes(q) ||
        (r[COL.APP_TRADE]?? '').toLowerCase().includes(q)
      );
    },
    [state.rows]
  );

  const saveEdit = useCallback((srNo: string, edits: Partial<Record<ColKey, string>>) => {
    setLocalEdits((prev) => ({ ...prev, [srNo]: { ...(prev[srNo] ?? {}), ...edits } }));
  }, []);

  const getRow = useCallback((row: string[]): string[] => {
    const srNo = row[COL.SR_NO] ?? '';
    const edits = localEdits[srNo];
    if (!edits) return row;
    const merged = [...row];
    (Object.keys(edits) as ColKey[]).forEach((k) => {
      const idx = COL[k];
      if (edits[k] !== undefined) merged[idx] = edits[k]!;
    });
    return merged;
  }, [localEdits]);

  return { ...state, load, search, saveEdit, getRow, localEdits };
}
