import { Image } from 'react-native';
import styled, { useTheme } from 'styled-components/native';

import { Painting } from '../../types/painting.types';
import AnimatedPressable from '../ui/AnimatedPressable';
import { useImageAspectRatio } from '../../hooks/useImageAspectRatio';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { makeShadows } from '../../theme/shadows';

type Props = {
  painting: Painting;
  onPress?: () => void;
  onBuy?: () => void;
  isAdmin?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
};

export default function PaintingCard({
  painting,
  onPress,
  onBuy,
  isAdmin,
  onEdit,
  onDelete,
}: Props) {
  const theme = useTheme();
  const shadows = makeShadows(theme);
  const hasDiscount = painting.discount > 0;

  const aspectRatio = useImageAspectRatio(painting.cardImage, 1);

  const currentPrice = Number(painting.price);

  const oldPrice = hasDiscount
    ? currentPrice / (1 - painting.discount / 100)
    : currentPrice;

  return (
    <Container style={shadows.sm}>
      <AnimatedPressable
        onPress={onPress}
        scaleTo={0.98}
        style={{ width: '100%' }}
      >
        <ImageWrapper>
          <CardImage
            source={{ uri: painting.cardImage }}
            $aspectRatio={aspectRatio}
          />

          {hasDiscount && (
            <DiscountBadge>
              <DiscountText>-{painting.discount}%</DiscountText>
            </DiscountBadge>
          )}

          {painting.isFeatured && (
            <FeaturedBadge>
              <FeaturedText>Featured</FeaturedText>
            </FeaturedBadge>
          )}
        </ImageWrapper>

        <Content>
          <TopRow>
            <Title numberOfLines={1}>{painting.title}</Title>

            <PriceContainer>
              <CurrentPrice>{currentPrice.toLocaleString()} ₴</CurrentPrice>

              {hasDiscount && (
                <OldPrice>{Math.round(oldPrice).toLocaleString()} ₴</OldPrice>
              )}
            </PriceContainer>
          </TopRow>

          <BottomRow>
            {painting.width && painting.height ? (
              <Size numberOfLines={1}>
                {painting.width} × {painting.height} см
              </Size>
            ) : (
              <Size />
            )}

            {!!painting.author && (
              <Author numberOfLines={1}>{painting.author}</Author>
            )}
          </BottomRow>
        </Content>
      </AnimatedPressable>

      <ButtonsRow>
        <DetailsButton onPress={onPress}>
          <DetailsText>Детальніше</DetailsText>
        </DetailsButton>

        <BuyButton onPress={onBuy}>
          <BuyText>Купити</BuyText>
        </BuyButton>
      </ButtonsRow>

      {isAdmin && (
        <AdminButtonsRow>
          <EditButton onPress={onEdit}>
            <EditText>Редагувати</EditText>
          </EditButton>

          <DeleteButton onPress={onDelete}>
            <DeleteText>Видалити</DeleteText>
          </DeleteButton>
        </AdminButtonsRow>
      )}
    </Container>
  );
}

const Container = styled.View`
  flex: 1;
  margin: ${spacing.sm}px;
  background-color: ${({ theme }) => theme.surface};
  border-radius: ${radius.xl}px;
  overflow: hidden;
  border-width: 1px;
  border-color: ${({ theme }) => theme.border};
`;

const ImageWrapper = styled.View`
  position: relative;
`;

const CardImage = styled(Image)<{ $aspectRatio: number }>`
  width: 100%;
  aspect-ratio: ${({ $aspectRatio }) => $aspectRatio};
`;

const DiscountBadge = styled.View`
  position: absolute;
  top: ${spacing.md}px;
  left: ${spacing.md}px;
  background-color: ${({ theme }) => theme.error};
  padding: ${spacing.xs}px ${spacing.md}px;
  border-radius: ${radius.pill}px;
`;

const DiscountText = styled.Text`
  color: white;
  font-family: ${typography.overline.fontFamily};
  font-size: ${typography.overline.fontSize}px;
`;

const FeaturedBadge = styled.View`
  position: absolute;
  top: ${spacing.md}px;
  right: ${spacing.md}px;
  background-color: ${({ theme }) => theme.accent};
  padding: ${spacing.xs}px ${spacing.md}px;
  border-radius: ${radius.pill}px;
`;

const FeaturedText = styled.Text`
  color: ${({ theme }) => theme.onAccent};
  font-family: ${typography.overline.fontFamily};
  font-size: ${typography.overline.fontSize}px;
  letter-spacing: 1px;
  text-transform: uppercase;
`;

const Content = styled.View`
  padding: ${spacing.lg}px;
`;

const TopRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  gap: ${spacing.sm}px;
`;

const BottomRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: ${spacing.sm}px;
  margin-top: ${spacing.sm}px;
`;

const Title = styled.Text`
  flex: 1;
  font-family: ${typography.h3.fontFamily};
  font-size: ${typography.h3.fontSize}px;
  color: ${({ theme }) => theme.text};
`;

const Author = styled.Text`
  font-family: ${typography.body.fontFamily};
  color: ${({ theme }) => theme.textSecondary};
  font-size: ${typography.body.fontSize}px;
`;

const Size = styled.Text`
  font-family: ${typography.caption.fontFamily};
  color: ${({ theme }) => theme.textMuted};
  font-size: ${typography.caption.fontSize}px;
`;

const PriceContainer = styled.View`
  flex-shrink: 0;
  flex-direction: row;
  align-items: baseline;
  gap: ${spacing.sm}px;
`;

const CurrentPrice = styled.Text`
  font-family: ${typography.h3.fontFamily};
  font-size: 19px;
  color: ${({ theme }) => theme.primary};
`;

const OldPrice = styled.Text`
  font-family: ${typography.body.fontFamily};
  font-size: ${typography.body.fontSize}px;
  text-decoration-line: line-through;
  color: ${({ theme }) => theme.textMuted};
`;

const ButtonsRow = styled.View`
  flex-direction: row;
  gap: ${spacing.sm}px;
  padding: 0 ${spacing.lg}px ${spacing.lg}px;
`;

const DetailsButton = styled.Pressable`
  flex: 1;
  padding: ${spacing.md}px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.border};
  border-radius: ${radius.md}px;
  align-items: center;
`;

const BuyButton = styled.Pressable`
  flex: 1;
  padding: ${spacing.md}px;
  background-color: ${({ theme }) => theme.primary};
  border-radius: ${radius.md}px;
  align-items: center;
  justify-content: center;
`;

const DetailsText = styled.Text`
  color: ${({ theme }) => theme.text};
  font-family: ${typography.bodySemiBold.fontFamily};
  font-size: ${typography.body.fontSize}px;
`;

const BuyText = styled.Text`
  color: ${({ theme }) => theme.onPrimary};
  font-family: ${typography.bodySemiBold.fontFamily};
  font-size: ${typography.body.fontSize}px;
`;

const AdminButtonsRow = styled.View`
  flex-direction: row;
  gap: ${spacing.sm}px;
  padding: 0 ${spacing.lg}px ${spacing.lg}px;
`;

const EditButton = styled.Pressable`
  flex: 1;
  padding: ${spacing.md}px;
  border-radius: ${radius.md}px;
  background-color: ${({ theme }) => theme.backgroundAlt};
  align-items: center;
`;

const DeleteButton = styled.Pressable`
  flex: 1;
  padding: ${spacing.md}px;
  border-radius: ${radius.md}px;
  background-color: ${({ theme }) => theme.error};
  align-items: center;
`;

const EditText = styled.Text`
  color: ${({ theme }) => theme.text};
  font-family: ${typography.bodySemiBold.fontFamily};
  font-size: ${typography.body.fontSize}px;
`;

const DeleteText = styled.Text`
  color: white;
  font-family: ${typography.bodySemiBold.fontFamily};
  font-size: ${typography.body.fontSize}px;
`;
