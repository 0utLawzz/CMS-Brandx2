export interface SheetData {
  headers: string[];
  rows: string[][];
}

export function parseCSV(csvText: string): SheetData {
  const out: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];

    if (inQuotes) {
      if (ch === '"') {
        if (csvText[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') { inQuotes = true; continue; }
    if (ch === ',') { row.push(field); field = ''; continue; }
    if (ch === '\r') { continue; }
    if (ch === '\n') {
      row.push(field); field = '';
      if (row.some((c) => c.trim() !== '')) out.push(row);
      row = [];
      continue;
    }
    field += ch;
  }

  if (field.length || row.length) {
    row.push(field);
    if (row.some((c) => c.trim() !== '')) out.push(row);
  }

  if (!out.length) return { headers: [], rows: [] };
  const headers = out.shift()!.map((h, idx) => h.trim() || `Column ${idx + 1}`);
  return { headers, rows: out };
}

export function normalize(val: unknown): string {
  return String(val ?? '').trim().toLowerCase();
}

export function toBool(val: unknown): boolean {
  const v = normalize(val);
  return v === 'true' || v === 'yes' || v === 'y' || v === '1' || v === '✓';
}
