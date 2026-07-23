import { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';

import { useToastStore } from '../../store/toastStore';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { makeShadows } from '../../theme/shadows';

const DURATION = 1800;

export default function Toast() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const shadows = makeShadows(theme);
  const message = useToastStore((state) => state.message);
  const token = useToastStore((state) => state.token);

  const [visibleMessage, setVisibleMessage] = useState<string | null>(null);
  const translateY = useSharedValue(24);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message || token === 0) return;

    setVisibleMessage(message);
    translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
    scale.value = withSpring(1, { damping: 16, stiffness: 220 });
    opacity.value = withTiming(1, { duration: 180 });

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      translateY.value = withTiming(24, {
        duration: 220,
        easing: Easing.in(Easing.cubic),
      });
      opacity.value = withTiming(0, { duration: 220 });
    }, DURATION);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-trigger on token change only
  }, [token]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  if (!visibleMessage) return null;

  return (
    <Wrap
      pointerEvents="none"
      style={{ bottom: insets.bottom + spacing.md + 64 + spacing.lg }}
    >
      <Animated.View style={animatedStyle}>
        <Card style={shadows.md}>
          <IconCircle>
            <Ionicons name="checkmark" size={16} color={theme.onAccent} />
          </IconCircle>
          <Message>{visibleMessage}</Message>
        </Card>
      </Animated.View>
    </Wrap>
  );
}

const Wrap = styled.View`
  position: absolute;
  left: 0;
  right: 0;
  align-items: center;
  z-index: 1000;
`;

const Card = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${spacing.sm}px;
  padding: ${spacing.md}px ${spacing.lg}px;
  border-radius: ${radius.pill}px;
  background-color: ${({ theme }) => theme.surface};
  border-width: 1px;
  border-color: ${({ theme }) => theme.border};
`;

const IconCircle = styled.View`
  width: 22px;
  height: 22px;
  border-radius: ${radius.pill}px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.accent};
`;

const Message = styled.Text`
  font-family: ${typography.bodySemiBold.fontFamily};
  font-size: ${typography.body.fontSize}px;
  color: ${({ theme }) => theme.text};
`;
