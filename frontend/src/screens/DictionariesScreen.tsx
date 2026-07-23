import { useEffect, useState } from 'react';
import { Alert, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled, { useTheme } from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { NavigationProps } from '../navigation/types';
import { materialsService } from '../api/materials.api';
import { techniquesService } from '../api/techniques.api';
import { Material, Technique } from '../types/dictionaries.types';
import DictionaryForm from '../components/admin/DictionaryForm';
import { Button, BottomSheet } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import AppLayout from '../components/layout/AppLayout';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';

type Tab = 'materials' | 'techniques';
type Item = Material | Technique;

export default function DictionariesScreen() {
  const navigation = useNavigation<NavigationProps>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);

  const [tab, setTab] = useState<Tab>('materials');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigation.navigate('Home');
    }
  }, [user, navigation]);

  useEffect(() => {
    loadItems();
  }, [tab]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const data =
        tab === 'materials'
          ? await materialsService.getMaterials()
          : await techniquesService.getTechniques();
      setItems(data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (name: string) => {
    if (tab === 'materials') {
      await materialsService.createMaterial(name);
    } else {
      await techniquesService.createTechnique(name);
    }
    setShowForm(false);
    loadItems();
  };

  const handleUpdate = async (name: string) => {
    if (!editingItem) return;

    if (tab === 'materials') {
      await materialsService.updateMaterial(editingItem.id, name);
    } else {
      await techniquesService.updateTechnique(editingItem.id, name);
    }
    setEditingItem(null);
    loadItems();
  };

  const handleDelete = (item: Item) => {
    Alert.alert('Видалити запис?', item.name, [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Видалити',
        style: 'destructive',
        onPress: async () => {
          try {
            if (tab === 'materials') {
              await materialsService.deleteMaterial(item.id);
            } else {
              await techniquesService.deleteTechnique(item.id);
            }
            setItems((prev) => prev.filter((entry) => entry.id !== item.id));
          } catch (error) {
            console.log(error);
          }
        },
      },
    ]);
  };

  if (user && user.role !== 'ADMIN') {
    return null;
  }

  return (
    <AppLayout>
      <ScreenLayout>
        <TabsRow>
          <TabButton
            $active={tab === 'materials'}
            onPress={() => setTab('materials')}
          >
            <TabText $active={tab === 'materials'}>Матеріали</TabText>
          </TabButton>
          <TabButton
            $active={tab === 'techniques'}
            onPress={() => setTab('techniques')}
          >
            <TabText $active={tab === 'techniques'}>Техніки</TabText>
          </TabButton>
        </TabsRow>

        {loading ? (
          <Centered>
            <ActivityIndicator size="large" color={theme.primary} />
          </Centered>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: spacing.md,
              paddingBottom: insets.bottom + 90,
              paddingHorizontal: spacing.xl,
            }}
            ListHeaderComponent={
              <ListHeaderContainer>
                <Button
                  icon={
                    <Ionicons
                      name="add-circle-outline"
                      size={20}
                      color={theme.onPrimary}
                    />
                  }
                  onPress={() => setShowForm(true)}
                >
                  {tab === 'materials' ? 'Додати матеріал' : 'Додати техніку'}
                </Button>
              </ListHeaderContainer>
            }
            ListEmptyComponent={
              <EmptyState>
                <Ionicons
                  name="file-tray-outline"
                  size={40}
                  color={theme.textMuted}
                />
                <EmptyText>Записів поки немає</EmptyText>
              </EmptyState>
            }
            renderItem={({ item, index }) => (
              <Animated.View
                entering={FadeInUp.duration(320).delay((index % 8) * 40)}
              >
                <Row>
                  <RowText>{item.name}</RowText>

                  <RowActions>
                    <ActionButton
                      onPress={() => setEditingItem(item)}
                      hitSlop={8}
                    >
                      <Ionicons
                        name="pencil-outline"
                        size={18}
                        color={theme.textSecondary}
                      />
                    </ActionButton>
                    <ActionButton
                      onPress={() => handleDelete(item)}
                      hitSlop={8}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={theme.error}
                      />
                    </ActionButton>
                  </RowActions>
                </Row>
              </Animated.View>
            )}
          />
        )}

        <BottomSheet visible={showForm} onClose={() => setShowForm(false)}>
          <DictionaryForm
            title={tab === 'materials' ? 'Новий матеріал' : 'Нова техніка'}
            onSubmit={handleCreate}
          />
        </BottomSheet>

        <BottomSheet
          visible={!!editingItem}
          onClose={() => setEditingItem(null)}
        >
          {editingItem && (
            <DictionaryForm
              title={
                tab === 'materials'
                  ? 'Редагування матеріалу'
                  : 'Редагування техніки'
              }
              initialName={editingItem.name}
              onSubmit={handleUpdate}
            />
          )}
        </BottomSheet>
      </ScreenLayout>
    </AppLayout>
  );
}

const ScreenLayout = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.background};
`;

const Centered = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const TabsRow = styled.View`
  flex-direction: row;
  gap: ${spacing.sm}px;
  padding: ${spacing.md}px ${spacing.xl}px 0;
`;

const TabButton = styled(Pressable)<{ $active: boolean }>`
  flex: 1;
  align-items: center;
  padding: ${spacing.md}px 0;
  border-radius: ${radius.lg}px;
  background-color: ${({ theme, $active }) =>
    $active ? theme.primary : theme.surface};
  border-width: 1px;
  border-color: ${({ theme, $active }) =>
    $active ? theme.primary : theme.border};
`;

const TabText = styled.Text<{ $active: boolean }>`
  font-family: ${typography.bodySemiBold.fontFamily};
  font-size: ${typography.bodyLg.fontSize}px;
  color: ${({ theme, $active }) => ($active ? theme.onPrimary : theme.text)};
`;

const ListHeaderContainer = styled.View`
  margin-bottom: ${spacing.xl}px;
`;

const EmptyState = styled.View`
  padding-top: ${spacing.huge}px;
  align-items: center;
  gap: ${spacing.md}px;
`;

const EmptyText = styled.Text`
  font-family: ${typography.body.fontFamily};
  color: ${({ theme }) => theme.textSecondary};
`;

const Row = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: ${spacing.lg}px;
  margin-bottom: ${spacing.md}px;
  border-radius: ${radius.lg}px;
  background-color: ${({ theme }) => theme.surface};
  border-width: 1px;
  border-color: ${({ theme }) => theme.border};
`;

const RowText = styled.Text`
  flex: 1;
  font-family: ${typography.bodyLg.fontFamily};
  font-size: ${typography.bodyLg.fontSize}px;
  color: ${({ theme }) => theme.text};
`;

const RowActions = styled.View`
  flex-direction: row;
  gap: ${spacing.lg}px;
`;

const ActionButton = styled(Pressable)`
  padding: ${spacing.xs}px;
`;
