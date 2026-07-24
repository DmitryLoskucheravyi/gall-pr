import styled from 'styled-components/native';
import Animated from 'react-native-reanimated';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';

export const LoaderContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  background-color: ${({ theme }) => theme.background};
`;

export const ImageWrapper = styled.View`
  height: 440px;
  overflow: hidden;
`;

export const HeroAnimatedWrap = styled(Animated.View)`
  flex: 1;
`;

export const CoverImage = styled.Image`
  width: 100%;
  height: 100%;
`;

export const BackButton = styled.Pressable`
  position: absolute;
  left: ${spacing.lg}px;
  width: 42px;
  height: 42px;
  border-radius: ${radius.pill}px;
  justify-content: center;
  align-items: center;
`;

export const FullscreenButton = styled.Pressable`
  position: absolute;
  right: ${spacing.lg}px;
  width: 42px;
  height: 42px;
  border-radius: ${radius.pill}px;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.35);
`;

export const DotsRow = styled.View`
  position: absolute;
  bottom: ${spacing.lg}px;
  left: 0;
  right: 0;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: ${spacing.xs}px;
`;

export const Dot = styled.View<{ $active: boolean }>`
  width: ${({ $active }) => ($active ? 18 : 6)}px;
  height: 6px;
  border-radius: ${radius.pill}px;
  background-color: ${({ $active }) =>
    $active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)'};
`;

export const ContentCard = styled(Animated.View)`
  padding: ${spacing.xxl}px;
  border-top-left-radius: ${radius.xxl}px;
  border-top-right-radius: ${radius.xxl}px;
  margin-top: -${radius.xxl}px;
  background-color: ${({ theme }) => theme.background};
`;

export const Title = styled.Text`
  font-family: ${typography.h1.fontFamily};
  font-size: ${typography.h1.fontSize}px;
  color: ${({ theme }) => theme.text};
`;

export const Author = styled.Text`
  margin-top: ${spacing.xs}px;
  font-family: ${typography.bodyLg.fontFamily};
  font-size: ${typography.bodyLg.fontSize}px;
  color: ${({ theme }) => theme.textSecondary};
`;

export const Price = styled.Text`
  margin-top: ${spacing.xl}px;
  font-family: ${typography.display.fontFamily};
  font-size: 30px;
  color: ${({ theme }) => theme.primary};
`;

export const Description = styled.Text`
  font-family: ${typography.bodyLg.fontFamily};
  font-size: ${typography.bodyLg.fontSize}px;
  line-height: 26px;
  color: ${({ theme }) => theme.text};
  padding-bottom: ${spacing.lg}px;
`;

export const SectionTitle = styled.Text`
  font-family: ${typography.h3.fontFamily};
  font-size: ${typography.h3.fontSize}px;
  color: ${({ theme }) => theme.text};
`;

export const InfoRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: ${spacing.md}px 0;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.border};
`;

export const InfoLabel = styled.Text`
  font-family: ${typography.body.fontFamily};
  font-size: ${typography.body.fontSize}px;
  color: ${({ theme }) => theme.textSecondary};
`;

export const InfoValue = styled.Text`
  font-family: ${typography.bodySemiBold.fontFamily};
  font-size: ${typography.body.fontSize}px;
  color: ${({ theme }) => theme.text};
`;

export const BuyButtonWrap = styled.View`
  margin-top: ${spacing.xl}px;
`;

export const HideWrapper = styled.Pressable`
  margin-top: ${spacing.xxxl}px;
  margin-bottom: ${spacing.md}px;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;
