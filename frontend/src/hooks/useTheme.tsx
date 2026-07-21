import { darkTheme, lightTheme } from '../theme/colors';
import { useThemeStore } from '../store/themeStore';

export const useTheme = () => {
  const isDarkTheme = useThemeStore(({ isDark }) => isDark);
  return isDarkTheme ? darkTheme : lightTheme;
};
