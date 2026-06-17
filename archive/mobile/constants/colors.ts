export const COLORS = {
  black: '#0C0C0C',
  cream: '#F0E8D0',
  cream2: '#E8DFC7',
  white: '#FAF6EE',
  orange: '#C94A00',
  teal: '#0A6B52',
  tealLt: '#0D9970',
  yellow: '#D4A800',
  gray: '#666666',
  dim: '#555555',

  shadowColor: '#0C0C0C',

  statusGreen: '#0A6B52',
  statusGreenBg: 'rgba(10,107,82,0.12)',
  statusRed: '#C94A00',
  statusRedBg: 'rgba(201,74,0,0.10)',
  statusBlue: '#0D9970',
  statusBlueBg: 'rgba(13,153,112,0.12)',
  statusYellow: '#D4A800',
  statusYellowBg: 'rgba(212,168,0,0.15)',
  statusSub: '#555555',
  statusSubBg: 'rgba(12,12,12,0.08)',
} as const;

export type ColorKey = keyof typeof COLORS;
