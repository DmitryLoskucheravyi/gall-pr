export const lightTheme = {
  mode: 'light' as const,

  background: '#FBF7F2',
  backgroundAlt: '#F3ECE3',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  primary: '#6B0F2E',
  primarySoft: '#F4E4E9',
  onPrimary: '#FFFFFF',

  accent: '#B8935B',
  accentSoft: '#F1E4D0',
  onAccent: '#2B1D0E',

  text: '#241417',
  textSecondary: '#8A6B72',
  textMuted: '#B3A29E',

  border: '#E8DDD3',
  borderStrong: '#D9C7BC',

  success: '#2F7A4D',
  error: '#C0392B',
  warning: '#B8860B',

  overlay: 'rgba(36, 20, 23, 0.55)',
  shadowColor: '#3A2317',
};

export const darkTheme = {
  mode: 'dark' as const,

  background: '#14100F',
  backgroundAlt: '#1B1513',
  surface: '#201A18',
  surfaceElevated: '#271F1C',

  primary: '#E7C9A9',
  primarySoft: '#332723',
  onPrimary: '#1E1310',

  accent: '#C9A468',
  accentSoft: '#2E2620',
  onAccent: '#1A140C',

  text: '#F5EDE6',
  textSecondary: '#B8A79E',
  textMuted: '#7E6F68',

  border: '#332924',
  borderStrong: '#453830',

  success: '#5FAE7F',
  error: '#E2685A',
  warning: '#D9A441',

  overlay: 'rgba(0, 0, 0, 0.65)',
  shadowColor: '#000000',
};

export type AppTheme = Omit<typeof lightTheme, 'mode'> & {
  mode: 'light' | 'dark';
};
