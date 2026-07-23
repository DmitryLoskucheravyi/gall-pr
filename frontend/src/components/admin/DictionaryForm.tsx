import { useState } from 'react';
import styled from 'styled-components/native';

import { Button, TextField } from '../ui';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = {
  title: string;
  initialName?: string;
  onSubmit: (name: string) => Promise<void>;
};

export default function DictionaryForm({
  title,
  initialName,
  onSubmit,
}: Props) {
  const [name, setName] = useState(initialName ?? '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || isLoading) return;

    try {
      setIsLoading(true);
      await onSubmit(name.trim());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <Title>{title}</Title>

      <TextField placeholder="Назва" value={name} onChangeText={setName} />

      <SubmitWrap>
        <Button onPress={handleSubmit} loading={isLoading}>
          {initialName ? 'Зберегти' : 'Створити'}
        </Button>
      </SubmitWrap>
    </Container>
  );
}

const Container = styled.View`
  padding-top: ${spacing.sm}px;
`;

const Title = styled.Text`
  margin-bottom: ${spacing.xl}px;
  font-family: ${typography.h2.fontFamily};
  font-size: ${typography.h2.fontSize}px;
  color: ${({ theme }) => theme.text};
`;

const SubmitWrap = styled.View`
  margin-top: ${spacing.md}px;
`;
