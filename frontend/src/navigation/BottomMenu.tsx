import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import styled from 'styled-components/native';
import { useTheme } from '../hooks/useTheme';
import { useThemeStore } from '../store/themeStore';
import { BlurView } from 'expo-blur';
export default function BottomMenu() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const theme = useTheme();
  const isDark = useThemeStore(({ isDark }) => isDark);
  const items = [
    { name: 'Home', icon: 'home-outline', activeIcon: 'home' },
    { name: 'Catalog', icon: 'grid-outline', activeIcon: 'grid' },
    { name: 'Cart', icon: 'cart-outline', activeIcon: 'cart' },
    { name: 'Profile', icon: 'person-outline', activeIcon: 'person' },
  ];

  return (
    <ShadowContainer>
      <BlurView
        intensity={40}
        tint={isDark ? 'dark' : 'light'}
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 20,
          borderRadius: 999,
          overflow: 'hidden',

          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 24,

          elevation: 12,
        }}
      >
        <Container>
          {items.map((item) => {
            const active = route.name === item.name;

            return (
              <Pressable
                key={item.name}
                onPress={() => navigation.navigate(item.name)}
              >
                <IconWrapper active={active}>
                  <Ionicons
                    name={active ? item.activeIcon : item.icon}
                    size={22}
                    color={active ? '#FFFFFF' : theme.text}
                  />
                </IconWrapper>
              </Pressable>
            );
          })}
        </Container>
      </BlurView>
    </ShadowContainer>
  );
}
const Container = styled.View`
  height: 64px;

  flex-direction: row;
  justify-content: space-around;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  border-width: 1px;
  border-color: rgba(255, 255, 255, 0.12);
`;

const IconWrapper = styled.View<{ active: boolean }>`
  width: 42px;
  height: 42px;

  border-radius: 21px;

  justify-content: center;
  align-items: center;

  background-color: ${({ active, theme }) =>
    active ? `${theme.primary}AC` : 'transparent'};
`;
const ShadowContainer = styled.View`
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: 20px;

  border-radius: 999px;

  shadow-color: #000;
  shadow-offset: 0px 10px;
  shadow-opacity: 0.25;
  shadow-radius: 30px;

  elevation: 20;
`;
