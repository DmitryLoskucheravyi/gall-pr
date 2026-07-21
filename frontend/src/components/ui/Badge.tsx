import styled from 'styled-components/native';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Tone = 'primary' | 'accent' | 'error' | 'neutral';

type Props = { children: React.ReactNode; tone?: Tone };

export default function Badge({ children, tone = 'accent' }: Props) {
  return (
    <Container $tone={tone}>
      <Label $tone={tone}>{children}</Label>
    </Container>
  );
}

const Container = styled.View<{ $tone: Tone }>`
  align-self: flex-start;
  padding: ${spacing.xs}px ${spacing.md}px;
  border-radius: ${radius.pill}px;
  background-color: ${({ theme, $tone }) =>
    $tone === 'primary'
      ? theme.primary
      : $tone === 'accent'
        ? theme.accent
        : $tone === 'error'
          ? theme.error
          : theme.backgroundAlt};
`;

const Label = styled.Text<{ $tone: Tone }>`
  font-family: ${typography.overline.fontFamily};
  font-size: ${typography.overline.fontSize}px;
  letter-spacing: ${typography.overline.letterSpacing}px;
  text-transform: uppercase;
  color: ${({ theme, $tone }) =>
    $tone === 'primary'
      ? theme.onPrimary
      : $tone === 'accent'
        ? theme.onAccent
        : $tone === 'error'
          ? '#FFFFFF'
          : theme.textSecondary};
`;
