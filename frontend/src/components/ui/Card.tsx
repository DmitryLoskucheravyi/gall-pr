import styled, { useTheme } from 'styled-components/native';
import { radius } from '../../theme/radius';
import { makeShadows } from '../../theme/shadows';

type Props = {
  children: React.ReactNode;
  elevation?: 'sm' | 'md' | 'lg' | 'none';
  style?: any;
};

export default function Card({ children, elevation = 'sm', style }: Props) {
  const theme = useTheme();
  const shadows = makeShadows(theme);
  const shadowStyle = elevation === 'none' ? {} : shadows[elevation];

  return <Surface style={[shadowStyle, style]}>{children}</Surface>;
}

const Surface = styled.View`
  background-color: ${({ theme }) => theme.surface};
  border-radius: ${radius.xl}px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.border};
`;
