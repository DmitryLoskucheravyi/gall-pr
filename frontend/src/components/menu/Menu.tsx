import { Pressable } from 'react-native';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '../../hooks/useTheme';
import { useMenu } from '../../hooks/useMenu';
import { useAuthStore } from '../../store/authStore';
import { NavigationProps } from '../../navigation/types';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';

export default function Menu() {
  const theme = useAppTheme();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const navigation = useNavigation<NavigationProps>();
  const { isMenuOpen, closeMenu } = useMenu();
  const insets = useSafeAreaInsets();

  const navTo = (route: 'Home' | 'Catalog' | 'Profile' | 'Login') => {
    closeMenu();
    setTimeout(() => navigation.navigate(route as any), 180);
  };

  const panelStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: withSpring(isMenuOpen ? 0 : 420, {
          damping: 22,
          stiffness: 220,
        }),
      },
    ],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isMenuOpen ? 1 : 0, { duration: 220 }),
  }));

  return (
    <Root pointerEvents={isMenuOpen ? 'auto' : 'none'}>
      <Backdrop style={backdropStyle}>
        <Pressable style={{ flex: 1 }} onPress={closeMenu} />
      </Backdrop>

      <Panel style={[panelStyle, { paddingTop: insets.top + spacing.xxxl }]}>
        <CloseButton onPress={closeMenu} hitSlop={12}>
          <Ionicons name="close-outline" size={28} color={theme.text} />
        </CloseButton>

        {isAuthenticated && user && (
          <Greeting>
            <GreetingLabel>Вітаємо,</GreetingLabel>
            <GreetingName>{user.firstName}</GreetingName>
          </Greeting>
        )}

        <NavContainer>
          <LinkWrapper onPress={() => navTo('Home')}>
            <Ionicons name="home-outline" size={22} color={theme.text} />
            <LinkText>Головна</LinkText>
          </LinkWrapper>

          <LinkWrapper onPress={() => navTo('Catalog')}>
            <Ionicons name="grid-outline" size={22} color={theme.text} />
            <LinkText>Каталог</LinkText>
          </LinkWrapper>

          {isAuthenticated ? (
            <LinkWrapper onPress={() => navTo('Profile')}>
              <Ionicons name="person-outline" size={22} color={theme.text} />
              <LinkText>Профіль</LinkText>
            </LinkWrapper>
          ) : (
            <LinkWrapper onPress={() => navTo('Login')}>
              <Ionicons name="log-in-outline" size={22} color={theme.text} />
              <LinkText>Увійти</LinkText>
            </LinkWrapper>
          )}
        </NavContainer>

        {isAuthenticated && (
          <LogoutWrapper
            onPress={() => {
              closeMenu();
              logout();
            }}
          >
            <Ionicons name="log-out-outline" size={20} color={theme.error} />
            <LogoutText>Вийти</LogoutText>
          </LogoutWrapper>
        )}
      </Panel>
    </Root>
  );
}

const Root = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
`;

const Backdrop = styled(Animated.View)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${({ theme }) => theme.overlay};
`;

const Panel = styled(Animated.View)`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 78%;
  padding: 0 ${spacing.xxl}px;
  background-color: ${({ theme }) => theme.background};
`;

const CloseButton = styled.Pressable`
  position: absolute;
  top: ${spacing.xl}px;
  right: ${spacing.xl}px;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: ${radius.pill}px;
  background-color: ${({ theme }) => theme.backgroundAlt};
`;

const Greeting = styled.View`
  margin-bottom: ${spacing.xxxl}px;
`;

const GreetingLabel = styled.Text`
  font-family: ${typography.body.fontFamily};
  font-size: ${typography.body.fontSize}px;
  color: ${({ theme }) => theme.textSecondary};
`;

const GreetingName = styled.Text`
  margin-top: 2px;
  font-family: ${typography.h1.fontFamily};
  font-size: 26px;
  color: ${({ theme }) => theme.text};
`;

const NavContainer = styled.View`
  gap: ${spacing.sm}px;
`;

const LinkWrapper = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: ${spacing.lg}px;
  min-height: 52px;
`;

const LinkText = styled.Text`
  font-family: ${typography.h3.fontFamily};
  font-size: ${typography.h3.fontSize}px;
  color: ${({ theme }) => theme.text};
`;

const LogoutWrapper = styled.Pressable`
  position: absolute;
  bottom: ${spacing.huge}px;
  left: ${spacing.xxl}px;
  flex-direction: row;
  align-items: center;
  gap: ${spacing.md}px;
`;

const LogoutText = styled.Text`
  font-family: ${typography.bodySemiBold.fontFamily};
  font-size: ${typography.body.fontSize}px;
  color: ${({ theme }) => theme.error};
`;
