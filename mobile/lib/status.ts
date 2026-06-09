import { normalize } from './csv';
import { COLORS } from '../constants/colors';

export type StatusClass =
  | 'status-green'
  | 'status-red'
  | 'status-blue'
  | 'status-yellow'
  | 'status-sub';

export function getStatusClass(val: unknown): StatusClass {
  const v = normalize(val);
  if (!v) return 'status-sub';
  if (/(stage\s*4|4️⃣|registered|accept|done|✅|certif)/.test(v)) return 'status-green';
  if (/(stop|note|abandon|abd|reject|withdraw|refus|❎|❌|hold)/.test(v)) return 'status-red';
  if (/(advertis|published|gazette|oppo|opposition|demand note|d-note|🥉)/.test(v)) return 'status-blue';
  if (/(stage\s*[1-3]|1️⃣|2️⃣|3️⃣|exam|process|pending|🕵|filed|ack)/.test(v)) return 'status-yellow';
  return 'status-sub';
}

export function getStageNumber(status: string): number {
  const v = normalize(status);
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
    case 'status-green':
      return { borderColor: COLORS.statusGreen, textColor: COLORS.statusGreen, backgroundColor: COLORS.statusGreenBg };
    case 'status-red':
      return { borderColor: COLORS.statusRed, textColor: COLORS.statusRed, backgroundColor: COLORS.statusRedBg };
    case 'status-blue':
      return { borderColor: COLORS.statusBlue, textColor: COLORS.statusBlue, backgroundColor: COLORS.statusBlueBg };
    case 'status-yellow':
      return { borderColor: COLORS.statusYellow, textColor: COLORS.statusYellow, backgroundColor: COLORS.statusYellowBg };
    default:
      return { borderColor: COLORS.statusSub, textColor: COLORS.statusSub, backgroundColor: COLORS.statusSubBg };
  }
}

export const STATUS_SUB_MAP: Record<string, string[]> = {
  'STAGE 1': ['APPLICATION FILED', 'ACKNOWLEDGEMENT', 'EXAMINATION'],
  'STAGE 2': ['ASSIGNED - UZMA (KARACHI)', 'ASSIGNED - UZMA (LAHORE)', 'ASSIGNED - FASIAL (KARACHI)', 'ASSIGNED - RASHID (KARACHI)', 'ASSIGNED - SULMAN (KARACHI)', 'ACCEPTED', 'HEARING'],
  'STAGE 3': ['PUBLISHED', 'OPPO: WITHDRAWN', 'OPPO: FILED', 'OPPO: RECEIVED', 'DEMAND NOTE RECEIVED', 'DEMAND NOTE PAID'],
  'STAGE 4': ['CERTIFICATE RECEIVED', 'CERTIFICATE DISPATCH', 'HEARING'],
  'STOPPED': ['ABANDONED', 'NOTE', 'HOLD', 'REFUSED'],
  'COPYRIGHT': ['FILED', 'IN NEWSPAPERS', 'ACKNOWLEDGEMENT', 'EXAMINATION', 'CERTIFICATE RECEIVED', 'CERTIFICATE DISPATCHED'],
};

export const STATUS_LIST = ['STAGE 1', 'STAGE 2', 'STAGE 3', 'STAGE 4', 'STOPPED', 'COPYRIGHT'];
export const CITY_LIST = ['KARACHI', 'LAHORE', 'ISLAMABAD', 'PESHAWAR'];
export const CLASS_LIST = Array.from({ length: 45 }, (_, i) => String(i + 1));
