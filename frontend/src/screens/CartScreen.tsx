import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  ActivityIndicator,
  Image,
  Pressable,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled, { useTheme } from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { NavigationProps } from '../navigation/types';
import { cartService } from '../api/cart.api';
import { ordersService } from '../api/orders.api';
import { CartItem } from '../types/cart.types';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui';
import AppLayout from '../components/layout/AppLayout';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';

export default function CartScreen() {
  const navigation = useNavigation<NavigationProps>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);

  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    if (!user) {
      navigation.navigate('Login');
    }
  }, [user, navigation]);

  const loadCart = useCallback(async () => {
    try {
      const cart = await cartService.getCart();
      setItems(cart.items);
      setTotal(cart.total);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadCart();
      }
    }, [user, loadCart]),
  );

  const handleRemove = async (item: CartItem) => {
    try {
      await cartService.removeItem(item.paintingId);
      await loadCart();
      useCartStore.getState().refresh();
    } catch (error) {
      console.log(error);
    }
  };

  const handleCheckout = async () => {
    if (checkingOut || items.length === 0) return;

    try {
      setCheckingOut(true);
      const order = await ordersService.checkout();
      useCartStore.getState().refresh();
      Alert.alert(
        'Замовлення оформлено',
        `Замовлення №${order.id} прийнято в обробку`,
        [
          {
            text: 'Мої замовлення',
            onPress: () => navigation.navigate('Orders'),
          },
        ],
      );
      loadCart();
    } catch (error: any) {
      Alert.alert(
        'Не вдалося оформити замовлення',
        error?.response?.data?.message ?? 'Спробуйте ще раз пізніше',
      );
      loadCart();
    } finally {
      setCheckingOut(false);
    }
  };

  if (!user) return null;

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
      <ScreenLayout>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + 220,
            paddingHorizontal: spacing.xl,
          }}
          ListHeaderComponent={<Title>Кошик</Title>}
          ListEmptyComponent={
            <EmptyState>
              <Ionicons name="cart-outline" size={40} color={theme.textMuted} />
              <EmptyText>Кошик порожній</EmptyText>
            </EmptyState>
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInUp.duration(300).delay((index % 8) * 40)}
            >
              <Row>
                <Thumb source={{ uri: item.painting.cardImage }} />

                <RowContent>
                  <RowTitle numberOfLines={1}>{item.painting.title}</RowTitle>
                  <RowPrice>
                    {Number(item.painting.price).toLocaleString()} ₴
                  </RowPrice>
                </RowContent>

                <RemoveButton onPress={() => handleRemove(item)} hitSlop={8}>
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={theme.error}
                  />
                </RemoveButton>
              </Row>
            </Animated.View>
          )}
        />

        {items.length > 0 && (
          <BottomBar
            style={{
              paddingBottom: insets.bottom + spacing.md + 64 + spacing.md,
            }}
          >
            <TotalRow>
              <TotalLabel>Разом</TotalLabel>
              <TotalValue>{total.toLocaleString()} ₴</TotalValue>
            </TotalRow>

            <Button onPress={handleCheckout} loading={checkingOut}>
              Оформити замовлення
            </Button>
          </BottomBar>
        )}
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

const Title = styled.Text`
  margin-bottom: ${spacing.lg}px;
  font-family: ${typography.h1.fontFamily};
  font-size: ${typography.h1.fontSize}px;
  color: ${({ theme }) => theme.text};
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
  gap: ${spacing.md}px;
  padding: ${spacing.md}px;
  margin-bottom: ${spacing.md}px;
  border-radius: ${radius.lg}px;
  background-color: ${({ theme }) => theme.surface};
  border-width: 1px;
  border-color: ${({ theme }) => theme.border};
`;

const Thumb = styled(Image)`
  width: 64px;
  height: 64px;
  border-radius: ${radius.md}px;
`;

const RowContent = styled.View`
  flex: 1;
`;

const RowTitle = styled.Text`
  font-family: ${typography.bodySemiBold.fontFamily};
  font-size: ${typography.bodyLg.fontSize}px;
  color: ${({ theme }) => theme.text};
`;

const RowPrice = styled.Text`
  margin-top: 2px;
  font-family: ${typography.caption.fontFamily};
  font-size: ${typography.caption.fontSize}px;
  color: ${({ theme }) => theme.textMuted};
`;

const RemoveButton = styled(Pressable)`
  padding: ${spacing.xs}px;
`;

const BottomBar = styled.View`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: ${spacing.lg}px ${spacing.xl}px 0;
  background-color: ${({ theme }) => theme.background};
  border-top-width: 1px;
  border-top-color: ${({ theme }) => theme.border};
`;

const TotalRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: ${spacing.md}px;
`;

const TotalLabel = styled.Text`
  font-family: ${typography.body.fontFamily};
  color: ${({ theme }) => theme.textSecondary};
`;

const TotalValue = styled.Text`
  font-family: ${typography.h2.fontFamily};
  font-size: ${typography.h2.fontSize}px;
  color: ${({ theme }) => theme.text};
`;
