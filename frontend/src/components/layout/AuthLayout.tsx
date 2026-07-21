import { ReactNode } from 'react';
import { ImageBackground } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const navigation = useNavigation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground
      resizeMode="cover"
      source={require('../../../assets/bg/register.png')}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <LinearGradient
        colors={[
          `${theme.background}E6`,
          `${theme.background}F5`,
          theme.background,
        ]}
        style={{ flex: 1 }}
      >
        <Scroll
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <BackButton
            onPress={() => navigation.goBack()}
            hitSlop={10}
            style={{ top: insets.top + spacing.sm }}
          >
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </BackButton>

          {children}
        </Scroll>
      </LinearGradient>
    </ImageBackground>
  );
}

const Scroll = styled.ScrollView`
  flex: 1;
`;

const BackButton = styled.Pressable`
  position: absolute;
  left: ${spacing.xl}px;
  z-index: 10;
  width: 40px;
  height: 40px;
  border-radius: ${radius.pill}px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.surface};
`;
