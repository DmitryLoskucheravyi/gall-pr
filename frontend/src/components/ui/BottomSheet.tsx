import { ReactNode, useEffect } from 'react';
import { Modal, Pressable, Dimensions, ScrollView } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import styled, { useTheme } from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = { visible: boolean; onClose: () => void; children: ReactNode };

export default function BottomSheet({ visible, onClose, children }: Props) {
  const theme = useTheme();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
      });
      backdropOpacity.value = withTiming(1, { duration: 250 });
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, {
        duration: 250,
        easing: Easing.in(Easing.cubic),
      });
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, translateY, backdropOpacity]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Container>
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: theme.overlay,
            },
            backdropStyle,
          ]}
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>

        <Sheet style={sheetStyle}>
          <Handle />
          <CloseButton onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={theme.textSecondary} />
          </CloseButton>
          <ScrollView
            style={{ flexShrink: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: spacing.xxl,
              paddingBottom: spacing.xxxl,
            }}
          >
            {children}
          </ScrollView>
        </Sheet>
      </Container>
    </Modal>
  );
}

const Container = styled.View`
  flex: 1;
  justify-content: flex-end;
`;

const Sheet = styled(Animated.View)`
  max-height: 92%;
  background-color: ${({ theme }) => theme.background};
  border-top-left-radius: ${radius.xxl}px;
  border-top-right-radius: ${radius.xxl}px;
  padding-top: ${spacing.xl}px;
`;

const Handle = styled.View`
  align-self: center;
  width: 40px;
  height: 4px;
  border-radius: ${radius.pill}px;
  background-color: ${({ theme }) => theme.border};
  margin-bottom: ${spacing.lg}px;
`;

const CloseButton = styled.Pressable`
  position: absolute;
  top: ${spacing.lg}px;
  right: ${spacing.lg}px;
  width: 36px;
  height: 36px;
  border-radius: ${radius.pill}px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.backgroundAlt};
  z-index: 10;
`;
