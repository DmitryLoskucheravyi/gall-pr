import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import styled, { useTheme } from 'styled-components/native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import AppLayout from '../components/layout/AppLayout';
import { ScreenLayout } from '../components/layout/components.styled';
import { useAuthStore } from '../store/authStore';
import { NavigationProps } from '../navigation/types';
import { Badge, Button, Card } from '../components/ui';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';

const ProfileScreen = () => {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigation = useNavigation<NavigationProps>();

  useEffect(() => {
    if (!user) {
      navigation.navigate('Login');
    }
  }, [user, navigation]);

  if (!user) return null;

  const initials =
    `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();

  const rows = [
    { icon: 'mail-outline' as const, label: 'Email', value: user.email },
    { icon: 'call-outline' as const, label: 'Телефон', value: user.phone },
  ];

  return (
    <AppLayout>
      <ScreenLayout showsVerticalScrollIndicator={false}>
        <Content>
          <Hero entering={FadeInDown.duration(420)}>
            <AvatarRing>
              <Avatar>
                <AvatarText>{initials || '?'}</AvatarText>
              </Avatar>
            </AvatarRing>

            <Name>
              {user.firstName} {user.lastName}
            </Name>

            {user.role === 'ADMIN' && (
              <BadgeWrap>
                <Badge tone="primary">Адміністратор</Badge>
              </BadgeWrap>
            )}
          </Hero>

          <Animated.View entering={FadeInDown.duration(420).delay(100)}>
            <Card style={{ padding: spacing.xl }}>
              {rows.map((row, index) => (
                <Row key={row.label} $last={index === rows.length - 1}>
                  <IconSlot>
                    <Ionicons
                      name={row.icon}
                      size={18}
                      color={theme.textSecondary}
                    />
                  </IconSlot>
                  <RowText>
                    <RowLabel>{row.label}</RowLabel>
                    <RowValue>{row.value || '—'}</RowValue>
                  </RowText>
                </Row>
              ))}
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(420).delay(180)}>
            <LogoutWrap>
              <Button variant="secondary" onPress={logout}>
                Вийти з акаунту
              </Button>
            </LogoutWrap>
          </Animated.View>
        </Content>
      </ScreenLayout>
    </AppLayout>
  );
};

export default ProfileScreen;

const Content = styled.View`
  padding: ${spacing.md}px ${spacing.xxl}px ${spacing.huge}px;
  gap: ${spacing.xl}px;
`;

const Hero = styled(Animated.View)`
  align-items: center;
  padding: ${spacing.xxl}px 0 ${spacing.md}px;
`;

const AvatarRing = styled.View`
  width: 96px;
  height: 96px;
  border-radius: ${radius.pill}px;
  border-width: 2px;
  border-color: ${({ theme }) => theme.accent};
  align-items: center;
  justify-content: center;
  margin-bottom: ${spacing.lg}px;
`;

const Avatar = styled.View`
  width: 82px;
  height: 82px;
  border-radius: ${radius.pill}px;
  background-color: ${({ theme }) => theme.primary};
  align-items: center;
  justify-content: center;
`;

const AvatarText = styled.Text`
  font-family: ${typography.h1.fontFamily};
  font-size: 26px;
  color: ${({ theme }) => theme.onPrimary};
`;

const Name = styled.Text`
  font-family: ${typography.h1.fontFamily};
  font-size: ${typography.h1.fontSize}px;
  color: ${({ theme }) => theme.text};
`;

const BadgeWrap = styled.View`
  margin-top: ${spacing.md}px;
`;

const Row = styled.View<{ $last: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: ${spacing.lg}px;
  padding-bottom: ${spacing.lg}px;
  margin-bottom: ${spacing.lg}px;
  border-bottom-width: ${({ $last }) => ($last ? 0 : 1)}px;
  border-bottom-color: ${({ theme }) => theme.border};
`;

const IconSlot = styled.View`
  width: 40px;
  height: 40px;
  border-radius: ${radius.md}px;
  background-color: ${({ theme }) => theme.backgroundAlt};
  align-items: center;
  justify-content: center;
`;

const RowText = styled.View`
  flex: 1;
`;

const RowLabel = styled.Text`
  font-family: ${typography.caption.fontFamily};
  font-size: ${typography.caption.fontSize}px;
  color: ${({ theme }) => theme.textMuted};
  margin-bottom: 2px;
`;

const RowValue = styled.Text`
  font-family: ${typography.bodySemiBold.fontFamily};
  font-size: ${typography.bodyLg.fontSize}px;
  color: ${({ theme }) => theme.text};
`;

const LogoutWrap = styled.View`
  margin-top: ${spacing.md}px;
`;
