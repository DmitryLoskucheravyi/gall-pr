import { ActivityIndicator, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useAppTheme } from '../../hooks/useTheme';

export default function LoadingScreen() {
  const theme = useAppTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Animated.View
        entering={FadeIn.duration(400)}
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
        }}
      >
        <View style={{ alignItems: 'center' }}>
          <Animated.Text
            style={{ fontSize: 26, letterSpacing: 0.5, color: theme.text }}
          >
            Viktorumm
          </Animated.Text>

          <View
            style={{
              marginTop: 10,
              width: 32,
              height: 2,
              backgroundColor: theme.accent,
            }}
          />
        </View>

        <ActivityIndicator size="small" color={theme.primary} />
      </Animated.View>
    </View>
  );
}
