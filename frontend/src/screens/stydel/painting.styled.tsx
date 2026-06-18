import styled from "styled-components/native";

export const LoaderContainer = styled.View`
    flex: 1;
    justify-content: center;
    align-items: center;
`;

export const ImageWrapper = styled.View`
    position: relative;
`;

export const CoverImage = styled.Image`
    width: 100%;
    height: 420px;

    border-bottom-left-radius: 20px;
    border-bottom-right-radius: 20px;
`;

export const BackButton = styled.Pressable`
    position: absolute;

    left: 16px;

    width: 44px;
    height: 44px;

    border-radius: 22px;

    justify-content: center;
    align-items: center;

    overflow: hidden;
`;

export const ContentCard = styled.View`
    padding: 20px;
`;

export const Title = styled.Text`
    margin-top: 20px;

    font-size: 28px;
    font-weight: 700;

    color: ${({ theme }) => theme.text};
`;

export const Author = styled.Text`
    margin-top: 6px;

    font-size: 16px;

    color: ${({ theme }) => theme.secondaryText};
`;

export const Price = styled.Text`
    margin-top: 20px;

    font-size: 34px;
    font-weight: 800;

    color: ${({ theme }) => theme.primary};
`;

export const Description = styled.Text`
    margin-top: 24px;

    font-size: 16px;
    line-height: 28px;

    color: ${({ theme }) => theme.text};
`;

export const SectionTitle = styled.Text`
    margin-top: 36px;
    margin-bottom: 16px;

    font-size: 22px;
    font-weight: 700;

    color: ${({ theme }) => theme.text};
`;

export const InfoRow = styled.View`
    flex-direction: row;
    justify-content: space-between;
    align-items: center;

    padding-vertical: 14px;

    border-bottom-width: 1px;
    border-bottom-color: ${({ theme }) => theme.border};
`;

export const InfoLabel = styled.Text`
    font-size: 15px;

    color: ${({ theme }) => theme.secondaryText};
`;

export const InfoValue = styled.Text`
    font-size: 15px;
    font-weight: 600;

    color: ${({ theme }) => theme.text};
`;

export const GalleryImage = styled.Image`
    width: 320px;
    height: 220px;

    border-radius: 16px;

    margin-right: 12px;

    background-color: ${({ theme }) => theme.card};
`;

export const BottomBar = styled.View`
    padding: 16px;
    margin-bottom: 100px;

    border-top-width: 1px;
    border-top-color: ${({ theme }) => theme.border};

    background-color: ${({ theme }) => theme.background};
`;

export const BuyButton = styled.Pressable`
    height: 56px;

    border-radius: 14px;

    justify-content: center;
    align-items: center;

    background-color: ${({ theme }) => theme.primary};
`;

export const BuyButtonText = styled.Text`
    font-size: 16px;
    font-weight: 700;

    color: ${({ theme }) => theme.primaryText};
`;
export const HideWrapper = styled.Pressable`
background-color: transparent;
flex:1;
flex-direction: row;
gap: 20px;
align-items: center;
`;

