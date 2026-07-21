import { ReactNode } from 'react';
import { ActivityIndicator } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import AnimatedPressable from './AnimatedPressable';

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  style?: any;
};

const HEIGHTS: Record<Size, number> = { sm: 40, md: 50, lg: 58 };

export default function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  fullWidth = true,
  style,
}: Props) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const colors = {
    primary: { bg: theme.primary, fg: theme.onPrimary, border: theme.primary },
    secondary: { bg: 'transparent', fg: theme.text, border: theme.border },
    ghost: { bg: 'transparent', fg: theme.primary, border: 'transparent' },
    accent: { bg: theme.accent, fg: theme.onAccent, border: theme.accent },
    destructive: { bg: theme.error, fg: '#FFFFFF', border: theme.error },
  }[variant];

  return (
    <Container
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      $fullWidth={fullWidth}
      style={[
        {
          height: HEIGHTS[size],
          backgroundColor: colors.bg,
          borderColor: colors.border,
          opacity: isDisabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.fg} />
      ) : (
        <>
          {icon}
          <Label style={{ color: colors.fg }}>{children}</Label>
        </>
      )}
    </Container>
  );
}

const Container = styled(AnimatedPressable)<{ $fullWidth: boolean }>`
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
  padding: 0 ${spacing.xxl}px;
  border-radius: ${radius.lg}px;
  border-width: 1px;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: ${spacing.sm}px;
`;

const Label = styled.Text`
  font-family: ${typography.button.fontFamily};
  font-size: ${typography.button.fontSize}px;
  letter-spacing: ${typography.button.letterSpacing}px;
`;
