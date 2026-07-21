import { useState } from 'react';
import { TextInputProps } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = TextInputProps & {
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  secure?: boolean;
};

export default function TextField({ icon, error, secure, ...rest }: Props) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <Field>
      <InputBox $hasError={!!error}>
        {icon && (
          <IconSlot>
            <Ionicons name={icon} size={19} color={theme.textSecondary} />
          </IconSlot>
        )}

        <StyledInput
          placeholderTextColor={theme.textMuted}
          secureTextEntry={secure && !visible}
          {...rest}
        />

        {secure && (
          <Pressable
            hitSlop={12}
            onPress={() => setVisible((prev) => !prev)}
            style={{ paddingLeft: spacing.sm }}
          >
            <Ionicons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.textSecondary}
            />
          </Pressable>
        )}
      </InputBox>

      {!!error && (
        <ErrorRow>
          <Ionicons name="alert-circle" size={13} color={theme.error} />
          <ErrorText>{error}</ErrorText>
        </ErrorRow>
      )}
    </Field>
  );
}

const Field = styled.View`
  margin-bottom: ${spacing.lg}px;
`;

const InputBox = styled.View<{ $hasError: boolean }>`
  flex-direction: row;
  align-items: center;
  min-height: 56px;
  padding: 0 ${spacing.lg}px;
  border-radius: ${radius.lg}px;
  background-color: ${({ theme }) => theme.surface};
  border-width: 1px;
  border-color: ${({ theme, $hasError }) =>
    $hasError ? theme.error : theme.border};
`;

const IconSlot = styled.View`
  margin-right: ${spacing.md}px;
`;

const StyledInput = styled.TextInput`
  flex: 1;
  font-family: ${typography.bodyLg.fontFamily};
  font-size: ${typography.bodyLg.fontSize}px;
  color: ${({ theme }) => theme.text};
`;

const ErrorRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${spacing.xs}px;
  margin-top: ${spacing.xs}px;
  margin-left: ${spacing.xs}px;
`;

const ErrorText = styled.Text`
  font-family: ${typography.caption.fontFamily};
  font-size: ${typography.caption.fontSize}px;
  color: ${({ theme }) => theme.error};
`;
