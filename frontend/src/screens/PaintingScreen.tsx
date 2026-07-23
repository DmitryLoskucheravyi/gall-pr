import { useEffect, useState } from 'react';
import {
  FlatList,
  ActivityIndicator,
  Pressable,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolation,
  FadeIn,
} from 'react-native-reanimated';

import AppLayout from '../components/layout/AppLayout';
import { paintingsService } from '../api/paintings.api';
import { Painting } from '../types/painting.types';
import { useAppTheme } from '../hooks/useTheme';
import { Button, Collapsible, ImageViewer } from '../components/ui';
import { NavigationProps } from '../navigation/types';
import { useAddToCart } from '../hooks/useAddToCart';
import { spacing } from '../theme/spacing';

import {
  LoaderContainer,
  BackButton,
  FullscreenButton,
  CoverImage,
  HeroAnimatedWrap,
  DotsRow,
  Dot,
  Title,
  Author,
  Price,
  Description,
  ContentCard,
  ImageWrapper,
  BottomBar,
  InfoLabel,
  InfoRow,
  HideWrapper,
  InfoValue,
  PriceTag,
  SectionTitle,
  BuyButtonWrap,
} from './styled/painting.styled';

const HERO_HEIGHT = 440;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PaintingScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<any>();
  const addToCart = useAddToCart();

  const [painting, setPainting] = useState<Painting | null>(null);
  const [loading, setLoading] = useState(true);

  const [isHideChar, setIsHideChar] = useState(true);
  const [isHideDesc, setIsHideDesc] = useState(true);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [-HERO_HEIGHT, 0, HERO_HEIGHT],
          [-HERO_HEIGHT / 2, 0, HERO_HEIGHT * 0.4],
          Extrapolation.CLAMP,
        ),
      },
      {
        scale: interpolate(
          scrollY.value,
          [-HERO_HEIGHT, 0],
          [2, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  useEffect(() => {
    loadPainting();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const handleHeroScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setHeroIndex(index);
  };

  const loadPainting = async () => {
    try {
      const data = await paintingsService.getPainting(route.params.id);
      setPainting(data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <LoaderContainer>
        <ActivityIndicator size="large" color={theme.primary} />
      </LoaderContainer>
    );
  }

  if (!painting) return null;

  const galleryImages =
    painting.images.length > 0 ? painting.images : [painting.cardImage];

  return (
    <AppLayout>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <ImageWrapper>
          <HeroAnimatedWrap style={imageStyle}>
            <FlatList
              data={galleryImages}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => `${item}-${index}`}
              onMomentumScrollEnd={handleHeroScrollEnd}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setViewerIndex(heroIndex)}
                  style={{ width: SCREEN_WIDTH, height: '100%' }}
                >
                  <CoverImage source={{ uri: item }} />
                </Pressable>
              )}
            />
          </HeroAnimatedWrap>

          <BackButton
            onPress={() => navigation.goBack()}
            style={{
              top: insets.top + spacing.sm,
              backgroundColor: theme.primary,
            }}
          >
            <Ionicons name="arrow-back" size={20} color={theme.onPrimary} />
          </BackButton>

          <FullscreenButton
            onPress={() => setViewerIndex(heroIndex)}
            style={{ top: insets.top + spacing.sm }}
          >
            <Ionicons name="expand-outline" size={18} color="#FFFFFF" />
          </FullscreenButton>

          {galleryImages.length > 1 && (
            <DotsRow>
              {galleryImages.map((_, index) => (
                <Dot key={index} $active={index === heroIndex} />
              ))}
            </DotsRow>
          )}
        </ImageWrapper>

        <ContentCard entering={FadeIn.duration(400)}>
          <Title>{painting.title}</Title>

          {painting.author && <Author>{painting.author}</Author>}

          <Price>₴ {Number(painting.price).toLocaleString()}</Price>

          <BuyButtonWrap>
            <Button onPress={() => addToCart(painting)}>Купити</Button>
          </BuyButtonWrap>

          <HideWrapper onPress={() => setIsHideDesc((prev) => !prev)}>
            <SectionTitle>Опис</SectionTitle>
            <Ionicons
              name={isHideDesc ? 'chevron-down' : 'chevron-up'}
              size={18}
              color={theme.textSecondary}
            />
          </HideWrapper>

          <Collapsible open={!isHideDesc}>
            <Description>{painting.description}</Description>
          </Collapsible>

          <HideWrapper onPress={() => setIsHideChar((prev) => !prev)}>
            <SectionTitle>Характеристики</SectionTitle>
            <Ionicons
              name={isHideChar ? 'chevron-down' : 'chevron-up'}
              size={18}
              color={theme.textSecondary}
            />
          </HideWrapper>

          <Collapsible open={!isHideChar}>
            <>
              {painting.author && (
                <InfoRow>
                  <InfoLabel>Автор</InfoLabel>
                  <InfoValue>{painting.author}</InfoValue>
                </InfoRow>
              )}

              {painting.year && (
                <InfoRow>
                  <InfoLabel>Рік</InfoLabel>
                  <InfoValue>{painting.year}</InfoValue>
                </InfoRow>
              )}

              {painting.technique && (
                <InfoRow>
                  <InfoLabel>Техніка</InfoLabel>
                  <InfoValue>{painting.technique.name}</InfoValue>
                </InfoRow>
              )}

              {painting.material && (
                <InfoRow>
                  <InfoLabel>Матеріал</InfoLabel>
                  <InfoValue>{painting.material.name}</InfoValue>
                </InfoRow>
              )}

              {painting.width && painting.height && (
                <InfoRow>
                  <InfoLabel>Розмір</InfoLabel>
                  <InfoValue>
                    {painting.width} × {painting.height} см
                  </InfoValue>
                </InfoRow>
              )}
            </>
          </Collapsible>
        </ContentCard>
      </Animated.ScrollView>

      <BottomBar style={{ paddingBottom: insets.bottom + spacing.md }}>
        <PriceTag>₴ {Number(painting.price).toLocaleString()}</PriceTag>
        <Button
          onPress={() => addToCart(painting)}
          fullWidth={false}
          style={{ flex: 1 }}
        >
          Купити
        </Button>
      </BottomBar>

      <ImageViewer
        visible={viewerIndex !== null}
        images={galleryImages}
        initialIndex={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
      />
    </AppLayout>
  );
}
