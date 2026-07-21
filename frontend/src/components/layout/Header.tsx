import { Pressable } from 'react-native';
import styled from 'styled-components/native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect } from 'react';

import { useAppTheme } from '../../hooks/useTheme';
import { useMenu } from '../../hooks/useMenu';
import { useThemeStore } from '../../store/themeStore';
import { NavigationProps } from '../../navigation/types';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const Header = () => {
  const theme = useAppTheme();
  const { isDark, toggleTheme } = useThemeStore();
  const navigation = useNavigation<NavigationProps>();
  const { openMenu } = useMenu();
  const insets = useSafeAreaInsets();

  const rotation = useSharedValue(isDark ? 1 : 0);

  useEffect(() => {
    rotation.value = withTiming(isDark ? 1 : 0, { duration: 320 });
  }, [isDark, rotation]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 180}deg` }],
  }));

  return (
    <HeaderContainer style={{ paddingTop: insets.top + spacing.md }}>
      <HeaderLayout>
        <Pressable onPress={() => navigation.navigate('Home')} hitSlop={8}>
          <Wordmark>Viktorumm</Wordmark>
          <Rule />
        </Pressable>

        <IconContainer>
          <Pressable onPress={toggleTheme} hitSlop={10}>
            <Animated.View style={iconStyle}>
              <Ionicons
                name={!isDark ? 'sunny-outline' : 'moon-outline'}
                size={22}
                color={theme.text}
              />
            </Animated.View>
          </Pressable>

          <Pressable onPress={openMenu} hitSlop={10}>
            <Ionicons name="menu-outline" size={28} color={theme.text} />
          </Pressable>
        </IconContainer>
      </HeaderLayout>
    </HeaderContainer>
  );
};

export default Header;

const HeaderContainer = styled.View`
  width: 100%;
  padding: 0 ${spacing.xxl}px ${spacing.md}px;
  background-color: ${({ theme }) => theme.background};
`;

const HeaderLayout = styled.View`
  width: 100%;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const Wordmark = styled.Text`
  color: ${({ theme }) => theme.text};
  font-family: ${typography.h2.fontFamily};
  font-size: 21px;
  letter-spacing: 0.5px;
`;

const Rule = styled.View`
  margin-top: 3px;
  width: 22px;
  height: 2px;
  background-color: ${({ theme }) => theme.accent};
`;

const IconContainer = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${spacing.xl}px;
`;
