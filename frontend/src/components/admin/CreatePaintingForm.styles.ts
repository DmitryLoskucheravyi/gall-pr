import styled from "styled-components/native";
import { Image, Switch } from "react-native";

export const Container = styled.View`
  margin-top: 16px;
  padding: 16px;
  border-radius: 20px;
  background-color: ${({ theme }) => theme.card};
  border-width: 1px;
  border-color: ${({ theme }) => theme.border};
  shadow-color: #000;
  shadow-offset: 0px 4px;
  shadow-opacity: 0.15;
  shadow-radius: 10px;
  elevation: 5;
`;

export const Title = styled.Text`
  margin-bottom: 20px;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
`;

export const Input = styled.TextInput.attrs(({ theme }) => ({
  placeholderTextColor: theme.secondaryText,
}))`
  margin-bottom: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  color: ${({ theme }) => theme.text};
  background-color: ${({ theme }) => theme.background};
  border-width: 1px;
  border-color: ${({ theme }) => theme.border};
`;

export const DescriptionInput = styled(Input)`
  height: 120px;
  text-align-vertical: top;
`;

export const SwitchRow = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin: 8px 0 16px;
`;

export const Label = styled.Text`
  font-size: 16px;
  font-weight: 500;
  color: white;
`;

export const PickButton = styled.Pressable`
  height: 52px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background-color: ${({ theme }) => theme.background};
  border-width: 1px;
  border-color: ${({ theme }) => theme.border};
`;

export const CreateButton = styled.Pressable`
  height: 56px;
  margin-top: 16px;
  flex-direction: row;
  gap: 10px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background-color: ${({ theme }) => theme.primary};
`;

export const ButtonText = styled.Text`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
`;

export const Preview = styled(Image)`
  width: 100%;
  height: 240px;
  margin-top: 16px;
  border-radius: 16px;
`;

export const StyledSwitch = styled(Switch)``;
