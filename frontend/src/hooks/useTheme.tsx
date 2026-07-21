import { darkTheme, lightTheme } from '../theme/colors';
import { useThemeStore } from '../store/themeStore';

export const useAppTheme = () => {
  const isDarkTheme = useThemeStore(({ isDark }) => isDark);
  return isDarkTheme ? darkTheme : lightTheme;
};
