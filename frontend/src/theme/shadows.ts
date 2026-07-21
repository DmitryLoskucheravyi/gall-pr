import { AppTheme } from './colors';

export const makeShadows = (theme: AppTheme) => ({
  sm: {
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.mode === 'dark' ? 0.4 : 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: theme.mode === 'dark' ? 0.45 : 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  lg: {
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: theme.mode === 'dark' ? 0.5 : 0.14,
    shadowRadius: 28,
    elevation: 12,
  },
});

export type Shadows = ReturnType<typeof makeShadows>;
