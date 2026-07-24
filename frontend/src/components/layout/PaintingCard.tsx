import { useState } from 'react';
import { Image } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

import { Painting } from '../../types/painting.types';
import AnimatedPressable from '../ui/AnimatedPressable';
import { useImageAspectRatio } from '../../hooks/useImageAspectRatio';
import { useSettingsStore } from '../../store/settingsStore';
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
  compact?: boolean;
};

export default function PaintingCard({
  painting,
  onPress,
  onBuy,
  isAdmin,
  onEdit,
  onDelete,
  compact,
}: Props) {
  const theme = useTheme();
  const shadows = makeShadows(theme);
  const authorName = useSettingsStore((state) => state.authorName);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);

  const aspectRatio = useImageAspectRatio(painting.cardImage, 1);

  const currentPrice = Number(painting.price);

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
        </ImageWrapper>
      </AnimatedPressable>

      {isAdmin && !compact && (
        <AdminMenuWrap>
          {isAdminMenuOpen && (
            <IconStack
              entering={FadeInUp.duration(180)}
              exiting={FadeOutDown.duration(150)}
            >
              <IconButton
                onPress={() => {
                  setIsAdminMenuOpen(false);
                  onEdit?.();
                }}
              >
                <Ionicons
                  name="settings-outline"
                  size={16}
                  color={theme.text}
                />
              </IconButton>

              <IconButton
                $danger
                onPress={() => {
                  setIsAdminMenuOpen(false);
                  onDelete?.();
                }}
              >
                <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
              </IconButton>
            </IconStack>
          )}

          <ToggleButton
            onPress={() => setIsAdminMenuOpen((prev) => !prev)}
            hitSlop={8}
          >
            <Ionicons
              name={isAdminMenuOpen ? 'chevron-down' : 'chevron-up'}
              size={18}
              color="#FFFFFF"
            />
          </ToggleButton>
        </AdminMenuWrap>
      )}

      {compact ? (
        <CompactContent>
          <Title numberOfLines={1}>{painting.title}</Title>

          <PriceContainer>
            <CurrentPrice>{currentPrice.toLocaleString()} ₴</CurrentPrice>
          </PriceContainer>
        </CompactContent>
      ) : (
        <BodyRow>
          <Content>
            <Title numberOfLines={1}>{painting.title}</Title>

            {!!authorName && <Author numberOfLines={1}>{authorName}</Author>}

            {painting.width && painting.height && (
              <Size>
                {painting.width} × {painting.height} см
              </Size>
            )}

            <PriceContainer>
              <CurrentPrice>{currentPrice.toLocaleString()} ₴</CurrentPrice>
            </PriceContainer>
          </Content>

          <ButtonsColumn>
            <DetailsButton onPress={onPress}>
              <DetailsText>Детальніше</DetailsText>
            </DetailsButton>

            <BuyButton onPress={onBuy}>
              <BuyText>Купити</BuyText>
            </BuyButton>
          </ButtonsColumn>
        </BodyRow>
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

const AdminMenuWrap = styled.View`
  position: absolute;
  top: ${spacing.md}px;
  right: ${spacing.md}px;
  align-items: center;
  z-index: 10;
`;

const IconStack = styled(Animated.View)`
  margin-bottom: ${spacing.sm}px;
  gap: ${spacing.sm}px;
  align-items: center;
`;

const IconButton = styled.Pressable<{ $danger?: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: ${radius.pill}px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme, $danger }) =>
    $danger ? theme.error : theme.backgroundAlt};
`;

const ToggleButton = styled.Pressable`
  width: 32px;
  height: 32px;
  border-radius: ${radius.pill}px;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.45);
`;

const CompactContent = styled.View`
  padding: ${spacing.lg}px;
`;

const BodyRow = styled.View`
  flex-direction: row;
  padding: ${spacing.lg}px;
  gap: ${spacing.md}px;
`;

const Content = styled.View`
  flex: 1;
`;

const Title = styled.Text`
  font-family: ${typography.h3.fontFamily};
  font-size: ${typography.h3.fontSize}px;
  color: ${({ theme }) => theme.text};
`;

const Author = styled.Text`
  margin-top: 4px;
  font-family: ${typography.body.fontFamily};
  color: ${({ theme }) => theme.textSecondary};
  font-size: ${typography.body.fontSize}px;
`;

const Size = styled.Text`
  margin-top: 6px;
  font-family: ${typography.caption.fontFamily};
  color: ${({ theme }) => theme.textMuted};
  font-size: ${typography.caption.fontSize}px;
`;

const PriceContainer = styled.View`
  margin-top: ${spacing.md}px;
  flex-direction: row;
  align-items: baseline;
  gap: ${spacing.sm}px;
`;

const CurrentPrice = styled.Text`
  font-family: ${typography.h3.fontFamily};
  font-size: 19px;
  color: ${({ theme }) => theme.primary};
`;

const ButtonsColumn = styled.View`
  width: 220px;
  gap: ${spacing.sm}px;
  justify-content: center;
`;

const DetailsButton = styled.Pressable`
  padding: ${spacing.md}px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.border};
  border-radius: ${radius.md}px;
  align-items: center;
`;

const BuyButton = styled.Pressable`
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
