import { useEffect } from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import styled from 'styled-components/native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import { useAppTheme } from '../hooks/useTheme';
import { useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { NavigationProps } from './types';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { makeShadows } from '../theme/shadows';

const ITEMS: {
  name: 'Home' | 'Catalog' | 'Cart' | 'Profile';
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}[] = [
  { name: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { name: 'Catalog', icon: 'grid-outline', activeIcon: 'grid' },
  { name: 'Cart', icon: 'cart-outline', activeIcon: 'cart' },
  { name: 'Profile', icon: 'person-outline', activeIcon: 'person' },
];

export default function BottomMenu() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute();
  const theme = useAppTheme();
  const isDark = useThemeStore(({ isDark }) => isDark);
  const insets = useSafeAreaInsets();
  const shadows = makeShadows(theme);
  const user = useAuthStore((state) => state.user);
  const cartCount = useCartStore((state) => state.count);

  useEffect(() => {
    if (user) {
      useCartStore.getState().refresh();
    } else {
      useCartStore.getState().reset();
    }
  }, [user]);

  return (
    <ShadowContainer
      style={[shadows.lg, { bottom: insets.bottom + spacing.md }]}
    >
      <BlurView
        intensity={45}
        tint={isDark ? 'dark' : 'light'}
        style={{ borderRadius: radius.pill, overflow: 'hidden' }}
      >
        <Container>
          {ITEMS.map((item) => {
            const active = route.name === item.name;

            return (
              <Tab
                key={item.name}
                active={active}
                icon={active ? item.activeIcon : item.icon}
                badge={item.name === 'Cart' ? cartCount : undefined}
                onPress={() => navigation.navigate(item.name as any)}
              />
            );
          })}
        </Container>
      </BlurView>
    </ShadowContainer>
  );
}

function Tab({
  active,
  icon,
  badge,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: number;
  onPress: () => void;
}) {
  const theme = useAppTheme();

  const wrapperStyle = useAnimatedStyle(() => ({
    width: withSpring(active ? 46 : 42, { damping: 16 }),
    backgroundColor: active ? theme.primary : 'transparent',
  }));

  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <AnimatedIconWrapper style={wrapperStyle}>
        <Ionicons
          name={icon}
          size={22}
          color={active ? theme.onPrimary : theme.text}
        />

        {!!badge && (
          <BadgeDot>
            <BadgeText>{badge > 9 ? '9+' : badge}</BadgeText>
          </BadgeDot>
        )}
      </AnimatedIconWrapper>
    </Pressable>
  );
}

const Container = styled.View`
  height: 64px;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
  padding: 0 ${spacing.lg}px;
  background-color: rgba(255, 255, 255, 0.06);
  border-width: 1px;
  border-color: rgba(255, 255, 255, 0.12);
`;

const AnimatedIconWrapper = styled(Animated.View)`
  height: 42px;
  border-radius: ${radius.pill}px;
  justify-content: center;
  align-items: center;
`;

const BadgeDot = styled.View`
  position: absolute;
  top: -2px;
  right: -6px;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  border-radius: ${radius.pill}px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.error};
`;

const BadgeText = styled.Text`
  font-family: ${typography.overline.fontFamily};
  font-size: 9px;
  color: #ffffff;
`;

const ShadowContainer = styled(Animated.View)`
  position: absolute;
  left: ${spacing.xl}px;
  right: ${spacing.xl}px;
  border-radius: ${radius.pill}px;
`;
