import { useState, useCallback } from 'react';
import { parseCSV, toBool, normalize, SheetData } from '../lib/csv';

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTelzPMvLPhdXugWg7No78vyJXgc3e3h4mKDcQLAAsSvLRWQe36fyqlk7mRwIsQSB7PabmNLqKXG2cz/pub?gid=229416165&single=true&output=csv';

export const COL = {
  DATE: 0,
  CASE_NO: 1,
  NAME: 2,
  NUMBER: 3,
  CLASS: 4,
  STATUS: 5,
  SUB_STATUS: 6,
  DUPLICATE: 7,
  TM11: 8,
  NOTES: 9,
  CITY: 10,
} as const;

export interface StageCount { s1: number; s2: number; s3: number; s4: number; stopped: number; }

export interface SheetStats {
  total: number;
  examination: number;
  accepted: number;
  demandNote: number;
  demandNotePaid: number;
  certificate: number;
  stages: StageCount;
}

export interface SheetState extends SheetData {
  stats: SheetStats;
  loading: boolean;
  error: string | null;
  lastLoaded: Date | null;
}

export interface LocalEdit {
  [caseNo: string]: Partial<Record<keyof typeof COL, string>>;
}

const EMPTY_STATS: SheetStats = {
  total: 0, examination: 0, accepted: 0,
  demandNote: 0, demandNotePaid: 0, certificate: 0,
  stages: { s1: 0, s2: 0, s3: 0, s4: 0, stopped: 0 },
};

function getStageKey(status: string): keyof StageCount | null {
  const v = normalize(status);
  if (/stage[\s_]*4/.test(v) || v.includes('4️⃣')) return 's4';
  if (/stage[\s_]*3/.test(v) || v.includes('3️⃣')) return 's3';
  if (/stage[\s_]*2/.test(v) || v.includes('2️⃣')) return 's2';
  if (/stage[\s_]*1/.test(v) || v.includes('1️⃣')) return 's1';
  if (/abandon|stop|hold|refus/.test(v)) return 'stopped';
  return null;
}

function computeStats(rows: string[][]): SheetStats {
  const stages: StageCount = { s1: 0, s2: 0, s3: 0, s4: 0, stopped: 0 };
  let examination = 0, accepted = 0, demandNote = 0, demandNotePaid = 0, certificate = 0;

  for (const r of rows) {
    const sub = normalize(r[COL.SUB_STATUS] ?? '');
    const status = normalize(r[COL.STATUS] ?? '');

    const sk = getStageKey(r[COL.STATUS] ?? '');
    if (sk) stages[sk]++;
    else if (/abandon|stop|hold|refus/.test(sub)) stages.stopped++;

    if (sub.includes('exam')) examination++;
    if (sub.includes('accept')) accepted++;
    if (sub.includes('demand note paid') || sub.includes('d-note paid')) demandNotePaid++;
    else if (sub.includes('demand note') || sub.includes('d-note')) demandNote++;
    if (sub.includes('cert') || /stage[\s_]*4/.test(status) || status.includes('4️⃣')) certificate++;
  }

  return { total: rows.length, examination, accepted, demandNote, demandNotePaid, certificate, stages };
}

export function useSheet() {
  const [state, setState] = useState<SheetState>({
    headers: [], rows: [], stats: EMPTY_STATS,
    loading: false, error: null, lastLoaded: null,
  });
  const [localEdits, setLocalEdits] = useState<LocalEdit>({});

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch(SHEET_CSV_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const { headers, rows } = parseCSV(text);
      setState({
        headers, rows,
        stats: computeStats(rows),
        loading: false, error: null, lastLoaded: new Date(),
      });
    } catch (err: unknown) {
      setState((s) => ({
        ...s, loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }, []);

  const search = useCallback(
    (query: string): string[][] => {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      return state.rows.filter(
        (r) =>
          (r[COL.NUMBER] ?? '').toLowerCase() === q ||
          (r[COL.NAME] ?? '').toLowerCase().includes(q) ||
          (r[COL.CASE_NO] ?? '').toLowerCase().includes(q)
      );
    },
    [state.rows]
  );

  const saveEdit = useCallback((caseNo: string, edits: Partial<Record<keyof typeof COL, string>>) => {
    setLocalEdits((prev) => ({ ...prev, [caseNo]: { ...(prev[caseNo] ?? {}), ...edits } }));
  }, []);

  const deleteRecord = useCallback((caseNo: string) => {
    setState((s) => ({
      ...s,
      rows: s.rows.filter((r) => (r[COL.CASE_NO] ?? '') !== caseNo),
    }));
  }, []);

  const getRow = useCallback((row: string[]): string[] => {
    const caseNo = row[COL.CASE_NO] ?? '';
    const edits = localEdits[caseNo];
    if (!edits) return row;
    const merged = [...row];
    (Object.keys(edits) as Array<keyof typeof COL>).forEach((k) => {
      const idx = COL[k];
      if (edits[k] !== undefined) merged[idx] = edits[k]!;
    });
    return merged;
  }, [localEdits]);

  return { ...state, load, search, saveEdit, deleteRecord, getRow, localEdits };
}
