import styled from 'styled-components/native';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export const ContainerLayout = styled.View`
  flex: 1;
  width: 100%;
  padding: ${spacing.xxl}px;
  background-color: ${({ theme }) => theme.background};
`;

export const ScreenLayout = styled.ScrollView`
  flex: 1;
  background-color: ${({ theme }) => theme.background};
`;

export const TitleLayout = styled.Text`
  color: ${({ theme }) => theme.text};
  font-family: ${typography.h1.fontFamily};
  font-size: ${typography.h1.fontSize}px;
  letter-spacing: ${typography.h1.letterSpacing}px;
`;

export const TextLayout = styled.Text`
  color: ${({ theme }) => theme.text};
  font-family: ${typography.body.fontFamily};
  font-size: ${typography.bodyLg.fontSize}px;
  line-height: ${typography.bodyLg.lineHeight}px;
`;

export const NavigateLink = styled.Text`
  color: ${({ theme }) => theme.text};
  font-family: ${typography.bodySemiBold.fontFamily};
  font-size: ${typography.body.fontSize}px;
`;
