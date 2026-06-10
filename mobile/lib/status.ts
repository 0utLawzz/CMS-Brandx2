import { normalize } from './csv';
import { COLORS } from '../constants/colors';

export type StatusClass =
  | 'status-green'
  | 'status-red'
  | 'status-blue'
  | 'status-yellow'
  | 'status-sub';

export const STATUS_RUN_LIST  = ['Run', 'Processing', 'Done'];
export const APP_TYPE_LIST    = ['SOLE', 'PARTNER', 'COMPANY'];
export const YEAR_LIST        = ['2022', '2023', '2024', '2025', '2026'];
export const CITY_LIST        = ['KARACHI', 'LAHORE', 'ISLAMABAD', 'PESHAWAR', 'QUETTA', 'MULTAN'];
export const CLASS_LIST       = Array.from({ length: 45 }, (_, i) => String(i + 1).padStart(2, '0'));

export const STAGE_LIST = ['STAGE 1', 'STAGE 2', 'STAGE 3', 'STAGE 4', 'STOPPED', 'COPYRIGHT'];

export const STAGE_SUB_MAP: Record<string, string[]> = {
  'STAGE 1': ['APPLICATION FILED', 'ACKNOWLEDGEMENT', 'EXAMINATION'],
  'STAGE 2': [
    'ASSIGNED - UZMA (KARACHI)', 'ASSIGNED - UZMA (LAHORE)',
    'ASSIGNED - FASIAL (KARACHI)', 'ASSIGNED - RASHID (KARACHI)',
    'ASSIGNED - SULMAN (KARACHI)', 'ACCEPTED', 'HEARING',
  ],
  'STAGE 3': [
    'PUBLISHED', 'OPPO: WITHDRAWN', 'OPPO: FILED', 'OPPO: RECEIVED',
    'DEMAND NOTE RECEIVED', 'DEMAND NOTE PAID', 'D-NOTE SUBMITTED',
  ],
  'STAGE 4': ['CERTIFICATE RECEIVED', 'CERTIFICATE DISPATCH', 'HEARING'],
  'STOPPED': ['ABANDONED', 'NOTE', 'HOLD', 'REFUSED', 'WITHDRAWN'],
  'COPYRIGHT': [
    'FILED', 'IN NEWSPAPERS', 'ACKNOWLEDGEMENT', 'EXAMINATION',
    'CERTIFICATE RECEIVED', 'CERTIFICATE DISPATCHED',
  ],
};

export const STATUS_LIST    = STAGE_LIST;
export const STATUS_SUB_MAP = STAGE_SUB_MAP;

export function getStatusClass(val: unknown): StatusClass {
  const v = normalize(val);
  if (!v) return 'status-sub';
  if (/(stage\s*4|4️⃣|registered|accept|done|✅|certif)/.test(v)) return 'status-green';
  if (/(stop|abandon|refus|withdraw|hold|❎|❌)/.test(v))          return 'status-red';
  if (/(advertis|published|gazette|oppo|demand note|d-note|submitted)/.test(v)) return 'status-blue';
  if (/(stage\s*[1-3]|1️⃣|2️⃣|3️⃣|exam|process|pending|filed|ack)/.test(v)) return 'status-yellow';
  return 'status-sub';
}

export function getStageNumber(stage: string): number {
  const v = normalize(stage);
  if (/stage[\s_]*4/.test(v) || v.includes('4️⃣')) return 4;
  if (/stage[\s_]*3/.test(v) || v.includes('3️⃣')) return 3;
  if (/stage[\s_]*2/.test(v) || v.includes('2️⃣')) return 2;
  if (/stage[\s_]*1/.test(v) || v.includes('1️⃣')) return 1;
  return 0;
}

export const STAGE_COLORS: Record<number, string> = {
  1: COLORS.orange,
  2: COLORS.teal,
  3: COLORS.yellow,
  4: COLORS.tealLt,
  0: COLORS.gray,
};

export interface StatusStyle {
  borderColor: string;
  textColor: string;
  backgroundColor: string;
}

export function getStatusStyle(cls: StatusClass): StatusStyle {
  switch (cls) {
    case 'status-green':  return { borderColor: COLORS.statusGreen,  textColor: COLORS.statusGreen,  backgroundColor: COLORS.statusGreenBg };
    case 'status-red':    return { borderColor: COLORS.statusRed,    textColor: COLORS.statusRed,    backgroundColor: COLORS.statusRedBg };
    case 'status-blue':   return { borderColor: COLORS.statusBlue,   textColor: COLORS.statusBlue,   backgroundColor: COLORS.statusBlueBg };
    case 'status-yellow': return { borderColor: COLORS.statusYellow, textColor: COLORS.statusYellow, backgroundColor: COLORS.statusYellowBg };
    default:              return { borderColor: COLORS.statusSub,    textColor: COLORS.statusSub,    backgroundColor: COLORS.statusSubBg };
  }
}

export function getRunStyle(run: string): { color: string; bg: string } {
  switch (run) {
    case 'Done':       return { color: COLORS.statusGreen,  bg: COLORS.statusGreenBg };
    case 'Processing': return { color: COLORS.statusYellow, bg: COLORS.statusYellowBg };
    default:           return { color: COLORS.statusBlue,   bg: COLORS.statusBlueBg };
  }
}

export function formatCNIC(val: string): string {
  const d = val.replace(/\D/g, '').slice(0, 13);
  if (d.length <= 5)  return d;
  if (d.length <= 12) return d.slice(0, 5) + '-' + d.slice(5);
  return d.slice(0, 5) + '-' + d.slice(5, 12) + '-' + d.slice(12, 13);
}
