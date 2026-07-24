import { useEffect, useState } from 'react';
import {
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Pressable,
  View,
} from 'react-native';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled, { useTheme } from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { NavigationProps } from '../navigation/types';
import { paintingsService } from '../api/paintings.api';
import { techniquesService } from '../api/techniques.api';
import { Painting } from '../types/painting.types';
import { Technique } from '../types/dictionaries.types';
import CreatePaintingForm from '../components/admin/CreatePaintingForm';
import PaintingCard from '../components/layout/PaintingCard';
import { Button, BottomSheet } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import { useAddToCart } from '../hooks/useAddToCart';
import AppLayout from '../components/layout/AppLayout';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export default function CatalogScreen() {
  const navigation = useNavigation<NavigationProps>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const addToCart = useAddToCart();
  const [paintings, setPaintings] = useState<Painting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPainting, setEditingPainting] = useState<Painting | null>(null);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [selectedTechniqueId, setSelectedTechniqueId] = useState<number | null>(
    null,
  );

  useEffect(() => {
    techniquesService
      .getTechniques()
      .then(setTechniques)
      .catch((error) => console.log(error));
  }, []);

  useEffect(() => {
    loadPaintings();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the filter changes
  }, [selectedTechniqueId]);

  const loadPaintings = async () => {
    try {
      const response = await paintingsService.getPaintings(
        1,
        12,
        selectedTechniqueId ?? undefined,
      );
      setPaintings(response.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = (painting: Painting) => {
    Alert.alert('Видалити картину?', painting.title, [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Видалити',
        style: 'destructive',
        onPress: async () => {
          try {
            await paintingsService.deletePainting(painting.id);
            setPaintings((prev) =>
              prev.filter((item) => item.id !== painting.id),
            );
          } catch (error: any) {
            Alert.alert(
              'Не вдалося видалити картину',
              error?.response?.data?.message ?? 'Спробуйте ще раз пізніше',
            );
          }
        },
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPaintings();
  };

  const renderHeader = () => (
    <ListHeaderContainer>
      {user?.role === 'ADMIN' && (
        <CreateButtonWrap>
          <Button
            icon={
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={theme.onPrimary}
              />
            }
            onPress={() => setShowCreateForm(true)}
          >
            Створити картину
          </Button>
        </CreateButtonWrap>
      )}

      <FilterRow
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.sm }}
      >
        <Chip
          $active={selectedTechniqueId === null}
          onPress={() => setSelectedTechniqueId(null)}
        >
          <ChipText $active={selectedTechniqueId === null}>Усі</ChipText>
        </Chip>

        {techniques.map((technique) => (
          <Chip
            key={technique.id}
            $active={selectedTechniqueId === technique.id}
            onPress={() => setSelectedTechniqueId(technique.id)}
          >
            <ChipText $active={selectedTechniqueId === technique.id}>
              {technique.name}
            </ChipText>
          </Chip>
        ))}
      </FilterRow>
    </ListHeaderContainer>
  );

  if (loading) {
    return (
      <Centered>
        <ActivityIndicator size="large" color={theme.primary} />
      </Centered>
    );
  }

  return (
    <AppLayout>
      <ScreenLayout>
        <FlatList
          data={paintings}
          ListHeaderComponent={renderHeader}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + 90,
            paddingHorizontal: spacing.sm,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <EmptyState>
              <Ionicons
                name="image-outline"
                size={40}
                color={theme.textMuted}
              />
              <EmptyText>Картин поки немає</EmptyText>
            </EmptyState>
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInUp.duration(360).delay((index % 6) * 60)}
              style={{ flex: 1 }}
            >
              <PaintingCard
                painting={item}
                isAdmin={user?.role === 'ADMIN'}
                onPress={() => navigation.navigate('Painting', { id: item.id })}
                onBuy={() => addToCart(item)}
                onEdit={() => setEditingPainting(item)}
                onDelete={() => handleDelete(item)}
              />
            </Animated.View>
          )}
        />

        <BottomSheet
          visible={!!editingPainting}
          onClose={() => setEditingPainting(null)}
        >
          {editingPainting && (
            <CreatePaintingForm
              painting={editingPainting}
              onCreated={() => {
                loadPaintings();
                setEditingPainting(null);
              }}
              onClose={() => setEditingPainting(null)}
            />
          )}
        </BottomSheet>

        <BottomSheet
          visible={showCreateForm}
          onClose={() => setShowCreateForm(false)}
        >
          <CreatePaintingForm
            onCreated={() => {
              setShowCreateForm(false);
              loadPaintings();
            }}
            onClose={() => setShowCreateForm(false)}
          />
        </BottomSheet>
      </ScreenLayout>
    </AppLayout>
  );
}

const ScreenLayout = styled.View`
  flex: 1;
  background-color: ${({ theme }) => theme.background};
`;

const Centered = styled(View)`
  flex: 1;
  justify-content: center;
  align-items: center;
  background-color: ${({ theme }) => theme.background};
`;

const ListHeaderContainer = styled.View`
  margin-bottom: ${spacing.md}px;
`;

const CreateButtonWrap = styled.View`
  margin: ${spacing.md}px ${spacing.sm}px ${spacing.xl}px;
`;

const FilterRow = styled(ScrollView)`
  flex-grow: 0;
`;

const Chip = styled(Pressable)<{ $active: boolean }>`
  margin-right: ${spacing.sm}px;
  padding: ${spacing.sm}px ${spacing.lg}px;
  border-radius: ${radius.pill}px;
  border-width: 1px;
  border-color: ${({ theme, $active }) =>
    $active ? theme.primary : theme.border};
  background-color: ${({ theme, $active }) =>
    $active ? theme.primary : theme.surface};
`;

const ChipText = styled.Text<{ $active: boolean }>`
  font-family: ${typography.bodySemiBold.fontFamily};
  font-size: ${typography.body.fontSize}px;
  color: ${({ theme, $active }) => ($active ? theme.onPrimary : theme.text)};
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
