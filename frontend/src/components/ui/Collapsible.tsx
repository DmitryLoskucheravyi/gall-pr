import { ReactNode, useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';

type Props = { open: boolean; children: ReactNode };

export default function Collapsible({ open, children }: Props) {
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const height = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (measuredHeight === 0) return;
    height.value = withTiming(open ? measuredHeight : 0, { duration: 260 });
    opacity.value = withTiming(open ? 1 : 0, { duration: open ? 220 : 140 });
  }, [open, measuredHeight, height, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
  }));

  return (
    <>
      {/* Invisible full-width measurer: decoupled from the clipped/animated
          box below so its height reading is never affected by the current
          animation state, and left/right keep it at the real content width
          so multi-line text wraps (and measures) the same as when visible. */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, right: 0, opacity: 0 }}
        onLayout={(e) => {
          const h = Math.round(e.nativeEvent.layout.height);
          if (h > 0 && h !== measuredHeight) {
            setMeasuredHeight(h);
          }
        }}
      >
        {children}
      </View>

      <Animated.View style={[{ overflow: 'hidden' }, animatedStyle]}>
        {children}
      </Animated.View>
    </>
  );
}
