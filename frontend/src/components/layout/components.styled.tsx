import styled from "styled-components/native";

export const ContainerLayout = styled.View`
    flex: 1;
    width: 100%;
    padding: 24px;
    padding-top: 50px;
    background-color: ${({ theme }) => theme.background};
`;

export const ScreenLayout = styled.ScrollView`
    flex: 1;
    background-color: ${({ theme }) => theme.background};
`;

export const TitleLayout = styled.Text`
    color: ${({ theme }) => theme.text};
    font-size: 30px;
    font-weight: 800;
    letter-spacing: -1px;
`;

export const TextLayout = styled.Text`
    color: ${({ theme }) => theme.text};
    font-size: 15px;
    line-height: 22px;
`;

export const Button = styled.Pressable`
    height: 58px;
    justify-content: center;
    align-items: center;
    border-radius: 18px;
    background-color: ${({ theme }) => theme.primary};
`;

export const ButtonText = styled.Text`
    color: ${({ theme }) => theme.primaryText};
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.3px;
`;

export const NavigateLink = styled.Text`
    color: ${({ theme }) => theme.text};
    font-size: 15px;
    font-weight: 600;
`;



