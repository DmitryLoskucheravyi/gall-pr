import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

type Props = {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
};

export default function ImageViewer({
  visible,
  images,
  initialIndex = 0,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<string>>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (!visible) return;

    setCurrentIndex(initialIndex);
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({
        offset: initialIndex * SCREEN_WIDTH,
        animated: false,
      });
    });
  }, [visible, initialIndex]);

  const handleMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Backdrop>
        <FlatList
          ref={listRef}
          data={images}
          horizontal
          pagingEnabled
          initialScrollIndex={initialIndex}
          keyExtractor={(item, index) => `${item}-${index}`}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          onMomentumScrollEnd={handleMomentumEnd}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => <ZoomableImage uri={item} />}
        />

        <CloseButton
          onPress={onClose}
          hitSlop={12}
          style={{ top: insets.top + spacing.md }}
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </CloseButton>

        {images.length > 1 && (
          <Counter style={{ top: insets.top + spacing.md }}>
            <CounterText>
              {currentIndex + 1} / {images.length}
            </CounterText>
          </Counter>
        )}
      </Backdrop>
    </Modal>
  );
}

function ZoomableImage({ uri }: { uri: string }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const resetZoom = () => {
    scale.value = withTiming(1);
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.max(
        1,
        Math.min(savedScale.value * event.scale, MAX_SCALE),
      );
    })
    .onEnd(() => {
      savedScale.value = scale.value;

      if (scale.value <= 1) {
        runOnJS(resetZoom)();
        runOnJS(setIsZoomed)(false);
      } else {
        runOnJS(setIsZoomed)(true);
      }
    });

  const panGesture = Gesture.Pan()
    .enabled(isZoomed)
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        runOnJS(resetZoom)();
        runOnJS(setIsZoomed)(false);
      } else {
        scale.value = withTiming(DOUBLE_TAP_SCALE);
        savedScale.value = DOUBLE_TAP_SCALE;
        runOnJS(setIsZoomed)(true);
      }
    });

  const composedGesture = Gesture.Simultaneous(
    doubleTapGesture,
    pinchGesture,
    panGesture,
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Page>
        <Animated.Image
          source={{ uri }}
          resizeMode="contain"
          style={[
            { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.75 },
            animatedStyle,
          ]}
        />
      </Page>
    </GestureDetector>
  );
}

const Backdrop = styled.View`
  flex: 1;
  background-color: #000000;
  justify-content: center;
`;

const Page = styled.View`
  width: ${SCREEN_WIDTH}px;
  align-items: center;
  justify-content: center;
`;

const CloseButton = styled.Pressable`
  position: absolute;
  right: ${spacing.lg}px;
  width: 40px;
  height: 40px;
  border-radius: ${radius.pill}px;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.15);
`;

const Counter = styled.View`
  position: absolute;
  align-self: center;
  padding: ${spacing.xs}px ${spacing.lg}px;
  border-radius: ${radius.pill}px;
  background-color: rgba(255, 255, 255, 0.15);
`;

const CounterText = styled.Text`
  font-family: ${typography.bodySemiBold.fontFamily};
  font-size: ${typography.caption.fontSize}px;
  color: #ffffff;
`;
