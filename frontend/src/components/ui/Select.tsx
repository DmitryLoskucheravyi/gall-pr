import { useState } from 'react';
import { Pressable } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from './BottomSheet';
import { radius } from '../../theme/radius';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Option = { id: number; name: string };

type Props = {
  placeholder: string;
  value?: number | null;
  options: Option[];
  onChange: (id: number) => void;
};

export default function Select({
  placeholder,
  value,
  options,
  onChange,
}: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === value);

  return (
    <>
      <Field onPress={() => setOpen(true)}>
        <FieldText $muted={!selected}>
          {selected ? selected.name : placeholder}
        </FieldText>
        <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
      </Field>

      <BottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        minHeight={0.5}
      >
        <SheetTitle>{placeholder}</SheetTitle>

        {options.map((option) => (
          <OptionRow
            key={option.id}
            onPress={() => {
              onChange(option.id);
              setOpen(false);
            }}
          >
            <OptionText>{option.name}</OptionText>
            {option.id === value && (
              <Ionicons name="checkmark" size={18} color={theme.accent} />
            )}
          </OptionRow>
        ))}
      </BottomSheet>
    </>
  );
}

const Field = styled(Pressable)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  min-height: 56px;
  padding: 0 ${spacing.lg}px;
  border-radius: ${radius.lg}px;
  background-color: ${({ theme }) => theme.surface};
  border-width: 1px;
  border-color: ${({ theme }) => theme.border};
  margin-bottom: ${spacing.lg}px;
`;

const FieldText = styled.Text<{ $muted: boolean }>`
  font-family: ${typography.bodyLg.fontFamily};
  font-size: ${typography.bodyLg.fontSize}px;
  color: ${({ theme, $muted }) => ($muted ? theme.textMuted : theme.text)};
`;

const SheetTitle = styled.Text`
  margin-bottom: ${spacing.lg}px;
  font-family: ${typography.h2.fontFamily};
  font-size: ${typography.h2.fontSize}px;
  color: ${({ theme }) => theme.text};
`;

const OptionRow = styled(Pressable)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: ${spacing.lg}px 0;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.border};
`;

const OptionText = styled.Text`
  font-family: ${typography.bodyLg.fontFamily};
  font-size: ${typography.bodyLg.fontSize}px;
  color: ${({ theme }) => theme.text};
`;
