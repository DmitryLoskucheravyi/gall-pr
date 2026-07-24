import { useEffect, useState } from 'react';
import { Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import styled, { useTheme } from 'styled-components/native';

import { NavigationProps } from '../navigation/types';
import { settingsService } from '../api/settings.api';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import { Button, TextField } from '../components/ui';
import { ScreenLayout } from '../components/layout/components.styled';
import AppLayout from '../components/layout/AppLayout';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export default function AdminSettingsScreen() {
  const navigation = useNavigation<NavigationProps>();
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);

  const [authorName, setAuthorNameInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigation.navigate('Home');
    }
  }, [user, navigation]);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;

    settingsService
      .getSettings()
      .then((settings) => setAuthorNameInput(settings.authorName))
      .catch((error) => console.log(error))
      .finally(() => setLoading(false));
  }, [user]);

  const handleSave = async () => {
    if (saving) return;

    try {
      setSaving(true);
      const settings = await settingsService.updateSettings(authorName.trim());
      useSettingsStore.getState().setAuthorName(settings.authorName);
      Alert.alert('Збережено', 'Автора оновлено на всіх картинах');
    } catch (error: any) {
      Alert.alert(
        'Не вдалося зберегти',
        error?.response?.data?.message ?? 'Спробуйте ще раз пізніше',
      );
    } finally {
      setSaving(false);
    }
  };

  if (user && user.role !== 'ADMIN') {
    return null;
  }

  if (loading) {
    return (
      <AppLayout>
        <Centered>
          <ActivityIndicator size="large" color={theme.primary} />
        </Centered>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ScreenLayout showsVerticalScrollIndicator={false}>
        <Content>
          <Title>Налаштування</Title>

          <FieldLabel>Поточний автор</FieldLabel>
          <FieldHint>
            Цей автор відображатиметься на всіх картинах у каталозі
          </FieldHint>

          <TextField
            placeholder="Ім'я автора"
            value={authorName}
            onChangeText={setAuthorNameInput}
          />

          <Button onPress={handleSave} loading={saving}>
            Зберегти
          </Button>
        </Content>
      </ScreenLayout>
    </AppLayout>
  );
}

const Centered = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  background-color: ${({ theme }) => theme.background};
`;

const Content = styled.View`
  padding: ${spacing.md}px ${spacing.xxl}px ${spacing.huge}px;
`;

const Title = styled.Text`
  margin-bottom: ${spacing.xl}px;
  font-family: ${typography.h1.fontFamily};
  font-size: ${typography.h1.fontSize}px;
  color: ${({ theme }) => theme.text};
`;

const FieldLabel = styled.Text`
  font-family: ${typography.bodySemiBold.fontFamily};
  font-size: ${typography.bodyLg.fontSize}px;
  color: ${({ theme }) => theme.text};
`;

const FieldHint = styled.Text`
  margin-top: 4px;
  margin-bottom: ${spacing.lg}px;
  font-family: ${typography.caption.fontFamily};
  font-size: ${typography.caption.fontSize}px;
  color: ${({ theme }) => theme.textSecondary};
`;
