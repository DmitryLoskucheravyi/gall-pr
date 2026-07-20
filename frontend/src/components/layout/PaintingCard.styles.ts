import { Image, Pressable, View } from "react-native";
import styled from "styled-components/native";

export const Container = styled.View`
  flex: 1;
  margin: 8px;

  background: ${({ theme }) => theme.card};

  border-radius: 20px;

  overflow: hidden;

  elevation: 4;
  border-width: 1px;
  border-color: ${({ theme }) => theme.text};
`;

export const ImageWrapper = styled.View`
  position: relative;
`;

export const CardImage = styled(Image)`
  width: 100%;
  height: 240px;
`;

export const DiscountBadge = styled.View`
  position: absolute;

  top: 12px;
  left: 12px;

  background: #ff4d4f;

  padding: 6px 10px;

  border-radius: 999px;
`;

export const DiscountText = styled.Text`
  color: white;
  font-weight: 700;
`;

export const Content = styled.View`
  padding: 14px;
`;

export const Title = styled.Text`
  font-size: 16px;
  font-weight: 700;

  color: ${({ theme }) => theme.text};
`;

export const Author = styled.Text`
  margin-top: 4px;

  color: ${({ theme }) => theme.secondaryText};
`;

export const Size = styled.Text`
  margin-top: 6px;

  color: ${({ theme }) => theme.secondaryText};

  font-size: 12px;
`;

export const PriceContainer = styled.View`
  margin-top: 12px;
`;

export const CurrentPrice = styled.Text`
  font-size: 20px;
  font-weight: 700;

  color: ${({ theme }) => theme.primary};
`;

export const OldPrice = styled.Text`
  margin-top: 2px;

  text-decoration-line: line-through;

  color: ${({ theme }) => theme.secondaryText};
`;

export const ButtonsRow = styled(View)`
  flex-direction: row;

  margin-top: 16px;
`;

export const DetailsButton = styled(Pressable)`
  flex: 1;

  padding: 12px;

  margin-right: 8px;

  border-width: 1px;
  border-color: ${({ theme }) => theme.primary};

  border-radius: 12px;

  align-items: center;
`;

export const BuyButton = styled(Pressable)`
  flex: 1;

  padding: 12px;

  background: ${({ theme }) => theme.primary};

  border-radius: 12px;

  align-items: center;
`;

export const DetailsText = styled.Text`
  color: ${({ theme }) => theme.primary};

  font-weight: 600;
`;

export const BuyText = styled.Text`
  color: ${({ theme }) => theme.background};

  font-weight: 600;
`;

export const AdminButtonsRow = styled(View)`
  flex-direction: row;

  margin-top: 10px;
`;

export const EditButton = styled(Pressable)`
  flex: 1;

  padding: 12px;

  margin-right: 8px;

  border-radius: 12px;

  background: ${({ theme }) => theme.text};

  align-items: center;
`;

export const DeleteButton = styled(Pressable)`
  flex: 1;

  padding: 12px;

  border-radius: 12px;

  background: ${({ theme }) => theme.text};

  align-items: center;
`;

export const EditText = styled.Text`
  color: white;
  font-weight: 600;
`;

export const DeleteText = styled.Text`
  color: white;
  font-weight: 600;
`;
