import { useEffect, useState } from 'react';
import { FlatList, ActivityIndicator } from 'react-native';
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
import { Button, Collapsible } from '../components/ui';
import { NavigationProps } from '../navigation/types';
import { spacing } from '../theme/spacing';

import {
  LoaderContainer,
  BackButton,
  CoverImage,
  Title,
  Author,
  Price,
  Description,
  GalleryImage,
  ContentCard,
  SectionHeaderStandalone,
  ImageWrapper,
  BottomBar,
  InfoLabel,
  InfoRow,
  HideWrapper,
  InfoValue,
  PriceTag,
  SectionTitle,
} from './styled/painting.styled';

const HERO_HEIGHT = 440;

export default function PaintingScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<any>();

  const [painting, setPainting] = useState<Painting | null>(null);
  const [loading, setLoading] = useState(true);

  const [isHideChar, setIsHideChar] = useState(true);
  const [isHideDesc, setIsHideDesc] = useState(true);

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

  return (
    <AppLayout>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <ImageWrapper>
          <CoverImage source={{ uri: painting.cardImage }} style={imageStyle} />

          <BackButton
            onPress={() => navigation.goBack()}
            style={{
              top: insets.top + spacing.sm,
              backgroundColor: theme.primary,
            }}
          >
            <Ionicons name="arrow-back" size={20} color={theme.onPrimary} />
          </BackButton>
        </ImageWrapper>

        <ContentCard entering={FadeIn.duration(400)}>
          <Title>{painting.title}</Title>

          {painting.author && <Author>{painting.author}</Author>}

          <Price>₴ {Number(painting.price).toLocaleString()}</Price>

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
                  <InfoValue>{painting.technique}</InfoValue>
                </InfoRow>
              )}

              {painting.material && (
                <InfoRow>
                  <InfoLabel>Матеріал</InfoLabel>
                  <InfoValue>{painting.material}</InfoValue>
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

          {painting.images.length > 0 && (
            <>
              <SectionHeaderStandalone>Галерея</SectionHeaderStandalone>

              <FlatList
                horizontal
                pagingEnabled
                data={painting.images}
                keyExtractor={(item, index) => `${item}-${index}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: spacing.xxl }}
                renderItem={({ item }) => (
                  <GalleryImage source={{ uri: item }} />
                )}
              />
            </>
          )}
        </ContentCard>
      </Animated.ScrollView>

      <BottomBar style={{ paddingBottom: insets.bottom + spacing.md }}>
        <PriceTag>₴ {Number(painting.price).toLocaleString()}</PriceTag>
        <Button onPress={() => {}} fullWidth={false} style={{ flex: 1 }}>
          Купити
        </Button>
      </BottomBar>
    </AppLayout>
  );
}
