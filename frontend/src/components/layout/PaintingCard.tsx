import { Image, Pressable, View } from 'react-native';
import styled from 'styled-components/native';

import { Painting } from '../../types/painting.types';

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
  const hasDiscount = painting.discount > 0;

  const currentPrice = Number(painting.price);

  const oldPrice = hasDiscount
    ? currentPrice / (1 - painting.discount / 100)
    : currentPrice;

  return (
    <Container>
      <ImageWrapper>
        <CardImage source={{ uri: painting.cardImage }} />

        {hasDiscount && (
          <DiscountBadge>
            <DiscountText>-{painting.discount}%</DiscountText>
          </DiscountBadge>
        )}
      </ImageWrapper>

      <Content>
        <Title numberOfLines={1}>{painting.title}</Title>

        {!!painting.author && (
          <Author numberOfLines={1}>{painting.author}</Author>
        )}

        {painting.width && painting.height && (
          <Size>
            {painting.width} × {painting.height} см
          </Size>
        )}

        <PriceContainer>
          <CurrentPrice>{currentPrice.toLocaleString()} ₴</CurrentPrice>

          {hasDiscount && (
            <OldPrice>{Math.round(oldPrice).toLocaleString()} ₴</OldPrice>
          )}
        </PriceContainer>

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
      </Content>
    </Container>
  );
}

const Container = styled.View`
  flex: 1;
  margin: 8px;
  background: ${({ theme }) => theme.card};
  border-radius: 20px;
  overflow: hidden;
  elevation: 4;
  border-width: 1px;
  border-color: ${({ theme }) => theme.text};
`;

const ImageWrapper = styled.View`
  position: relative;
`;

const CardImage = styled(Image)`
  width: 100%;
  height: 240px;
`;

const DiscountBadge = styled.View`
  position: absolute;
  top: 12px;
  left: 12px;
  background: #ff4d4f;
  padding: 6px 10px;
  border-radius: 999px;
`;

const DiscountText = styled.Text`
  color: white;
  font-weight: 700;
`;

const Content = styled.View`
  padding: 14px;
`;

const Title = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
`;

const Author = styled.Text`
  margin-top: 4px;
  color: ${({ theme }) => theme.secondaryText};
`;

const Size = styled.Text`
  margin-top: 6px;
  color: ${({ theme }) => theme.secondaryText};
  font-size: 12px;
`;

const PriceContainer = styled.View`
  margin-top: 12px;
`;

const CurrentPrice = styled.Text`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.primary};
`;

const OldPrice = styled.Text`
  margin-top: 2px;
  text-decoration-line: line-through;
  color: ${({ theme }) => theme.secondaryText};
`;

const ButtonsRow = styled(View)`
  flex-direction: row;
  margin-top: 16px;
`;

const DetailsButton = styled(Pressable)`
  flex: 1;
  padding: 12px;
  margin-right: 8px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.primary};
  border-radius: 12px;
  align-items: center;
`;

const BuyButton = styled(Pressable)`
  flex: 1;
  padding: 12px;
  background-color: ${({ theme }) =>
    theme.background === '#EFFDFF' ? '#660029' : '#AFE1FF'};
  border-radius: 12px;
  overflow: hidden;
  align-items: center;
  justify-content: center;
`;

const DetailsText = styled.Text`
  color: ${({ theme }) => theme.primary};
  font-weight: 600;
`;

const BuyText = styled.Text`
  color: ${({ theme }) => theme.background};
  font-weight: 600;
`;

const AdminButtonsRow = styled(View)`
  flex-direction: row;
  margin-top: 10px;
`;

const EditButton = styled(Pressable)`
  flex: 1;
  padding: 12px;
  margin-right: 8px;
  border-radius: 12px;
  background-color: ${({ theme }) =>
    theme.background === '#EFFDFF' ? '#2563EB' : '#4B5563'};
  align-items: center;
`;

const DeleteButton = styled(Pressable)`
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  background-color: ${({ theme }) =>
    theme.background === '#EFFDFF' ? '#DC2626' : '#991B1B'};
  align-items: center;
`;

const EditText = styled.Text`
  color: white;
  font-weight: 600;
`;

const DeleteText = styled.Text`
  color: white;
  font-weight: 600;
`;
