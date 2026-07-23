import { useEffect, useState } from 'react';
import { FlatList, Image } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import AppLayout from '../components/layout/AppLayout';
import PaintingCard from '../components/layout/PaintingCard';
import Skeleton from '../components/ui/Skeleton';
import { Button } from '../components/ui';
import { paintingsService } from '../api/paintings.api';
import { Painting } from '../types/painting.types';
import { NavigationProps } from '../navigation/types';
import { useAddToCart } from '../hooks/useAddToCart';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';

const HomeScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProps>();
  const addToCart = useAddToCart();
  const [paintings, setPaintings] = useState<Painting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const response = await paintingsService.getPaintings(1, 20);
        setPaintings(response.data);
      } catch {
        setPaintings([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const featured = paintings.filter((p) => p.isFeatured).slice(0, 8);
  const heroImage = featured[0]?.cardImage ?? paintings[0]?.cardImage;

  return (
    <AppLayout>
      <ScreenScroll showsVerticalScrollIndicator={false}>
        <Hero entering={FadeIn.duration(500)}>
          {heroImage && (
            <HeroImage source={{ uri: heroImage }} resizeMode="cover" />
          )}
          <LinearGradient
            colors={[
              `${theme.background}00`,
              `${theme.background}CC`,
              theme.background,
            ]}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: '100%',
            }}
          />
          <HeroContent>
            <Overline>Галерея сучасного мистецтва</Overline>
            <HeroTitle>Мистецтво,{'\n'}що говорить</HeroTitle>
            <GoldRule />
            <HeroSubtitle>
              Кураторська добірка оригінальних картин від українських художників
            </HeroSubtitle>

            <ButtonWrap>
              <Button onPress={() => navigation.navigate('Catalog')}>
                Переглянути каталог
              </Button>
            </ButtonWrap>
          </HeroContent>
        </Hero>

        <Section entering={FadeInDown.duration(450).delay(120)}>
          <SectionHeader>
            <SectionTitle>Featured</SectionTitle>
            <SectionLink onPress={() => navigation.navigate('Catalog')}>
              Всі роботи →
            </SectionLink>
          </SectionHeader>

          {loading ? (
            <SkeletonRow>
              <Skeleton width={220} height={300} borderRadius={radius.xl} />
              <Skeleton width={220} height={300} borderRadius={radius.xl} />
            </SkeletonRow>
          ) : featured.length > 0 ? (
            <FlatList
              horizontal
              data={featured}
              keyExtractor={(item) => item.id.toString()}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.lg }}
              renderItem={({ item }) => (
                <CarouselItem>
                  <PaintingCard
                    painting={item}
                    onPress={() =>
                      navigation.navigate('Painting', { id: item.id })
                    }
                    onBuy={() => addToCart(item)}
                  />
                </CarouselItem>
              )}
            />
          ) : (
            <EmptyText>Скоро тут з&apos;являться нові роботи</EmptyText>
          )}
        </Section>
      </ScreenScroll>
    </AppLayout>
  );
};

export default HomeScreen;

const ScreenScroll = styled.ScrollView`
  flex: 1;
  background-color: ${({ theme }) => theme.background};
`;

const Hero = styled(Animated.View)`
  height: 460px;
  margin: 0 ${spacing.xxl}px ${spacing.xxxl}px;
  border-radius: ${radius.xxl}px;
  overflow: hidden;
  background-color: ${({ theme }) => theme.backgroundAlt};
`;

const HeroImage = styled(Image)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
`;

const HeroContent = styled.View`
  position: absolute;
  left: ${spacing.xxl}px;
  right: ${spacing.xxl}px;
  bottom: ${spacing.xxl}px;
`;

const Overline = styled.Text`
  font-family: ${typography.overline.fontFamily};
  font-size: ${typography.overline.fontSize}px;
  letter-spacing: ${typography.overline.letterSpacing}px;
  text-transform: uppercase;
  color: ${({ theme }) => theme.accent};
  margin-bottom: ${spacing.sm}px;
`;

const HeroTitle = styled.Text`
  font-family: ${typography.display.fontFamily};
  font-size: 34px;
  line-height: 40px;
  color: ${({ theme }) => theme.text};
`;

const GoldRule = styled.View`
  margin-top: ${spacing.lg}px;
  width: 40px;
  height: 3px;
  background-color: ${({ theme }) => theme.accent};
`;

const HeroSubtitle = styled.Text`
  margin-top: ${spacing.lg}px;
  font-family: ${typography.bodyLg.fontFamily};
  font-size: ${typography.bodyLg.fontSize}px;
  line-height: ${typography.bodyLg.lineHeight}px;
  color: ${({ theme }) => theme.textSecondary};
`;

const ButtonWrap = styled.View`
  margin-top: ${spacing.xxl}px;
  align-self: flex-start;
`;

const Section = styled(Animated.View)`
  padding-bottom: ${spacing.huge}px;
`;

const SectionHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: baseline;
  padding: 0 ${spacing.xxl}px;
  margin-bottom: ${spacing.lg}px;
`;

const SectionTitle = styled.Text`
  font-family: ${typography.h1.fontFamily};
  font-size: ${typography.h1.fontSize}px;
  color: ${({ theme }) => theme.text};
`;

const SectionLink = styled.Text`
  font-family: ${typography.bodySemiBold.fontFamily};
  font-size: ${typography.body.fontSize}px;
  color: ${({ theme }) => theme.primary};
`;

const CarouselItem = styled.View`
  width: 240px;
`;

const SkeletonRow = styled.View`
  flex-direction: row;
  gap: ${spacing.lg}px;
  padding: 0 ${spacing.xxl}px;
`;

const EmptyText = styled.Text`
  padding: 0 ${spacing.xxl}px;
  font-family: ${typography.body.fontFamily};
  color: ${({ theme }) => theme.textSecondary};
`;
