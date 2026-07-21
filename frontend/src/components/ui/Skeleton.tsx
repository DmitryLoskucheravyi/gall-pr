import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from 'styled-components/native';
import { radius } from '../../theme/radius';

type Props = {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: any;
};

export default function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = radius.sm,
  style,
}: Props) {
  const theme = useTheme();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 750, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: theme.backgroundAlt },
        animatedStyle,
        style,
      ]}
    />
  );
}
