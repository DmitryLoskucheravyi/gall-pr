import { useCallback, useEffect, useState } from 'react';
import { FlatList, ActivityIndicator, Image } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styled, { useTheme } from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { NavigationProps } from '../navigation/types';
import { ordersService } from '../api/orders.api';
import { Order, OrderStatus } from '../types/order.types';
import { useAuthStore } from '../store/authStore';
import { Badge } from '../components/ui';
import AppLayout from '../components/layout/AppLayout';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Очікує',
  CONFIRMED: 'Підтверджено',
  CANCELLED: 'Скасовано',
  COMPLETED: 'Виконано',
};

const STATUS_TONE: Record<
  OrderStatus,
  'primary' | 'accent' | 'error' | 'neutral'
> = {
  PENDING: 'accent',
  CONFIRMED: 'primary',
  CANCELLED: 'error',
  COMPLETED: 'primary',
};

export default function OrdersScreen() {
  const navigation = useNavigation<NavigationProps>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigation.navigate('Login');
    }
  }, [user, navigation]);

  const loadOrders = useCallback(async () => {
    try {
      const data = await ordersService.getOrders();
      setOrders(data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadOrders();
      }
    }, [user, loadOrders]),
  );

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
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + 90,
            paddingHorizontal: spacing.xl,
          }}
          ListHeaderComponent={<Title>Мої замовлення</Title>}
          ListEmptyComponent={
            <EmptyState>
              <Ionicons
                name="receipt-outline"
                size={40}
                color={theme.textMuted}
              />
              <EmptyText>Замовлень поки немає</EmptyText>
            </EmptyState>
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInUp.duration(300).delay((index % 8) * 40)}
            >
              <Card>
                <CardHeader>
                  <OrderNumber>Замовлення №{item.id}</OrderNumber>
                  <Badge tone={STATUS_TONE[item.status]}>
                    {STATUS_LABEL[item.status]}
                  </Badge>
                </CardHeader>

                <OrderDate>
                  {new Date(item.createdAt).toLocaleDateString('uk-UA')}
                </OrderDate>

                <ThumbsRow>
                  {item.items.map((orderItem) => (
                    <Thumb
                      key={orderItem.id}
                      source={{ uri: orderItem.painting.cardImage }}
                    />
                  ))}
                </ThumbsRow>

                <CardFooter>
                  <ItemsCount>
                    {item.items.length}{' '}
                    {item.items.length === 1 ? 'робота' : 'роботи'}
                  </ItemsCount>
                  <TotalValue>
                    {Number(item.total).toLocaleString()} ₴
                  </TotalValue>
                </CardFooter>
              </Card>
            </Animated.View>
          )}
        />
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

const Card = styled.View`
  padding: ${spacing.lg}px;
  margin-bottom: ${spacing.lg}px;
  border-radius: ${radius.lg}px;
  background-color: ${({ theme }) => theme.surface};
  border-width: 1px;
  border-color: ${({ theme }) => theme.border};
`;

const CardHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const OrderNumber = styled.Text`
  font-family: ${typography.bodySemiBold.fontFamily};
  font-size: ${typography.bodyLg.fontSize}px;
  color: ${({ theme }) => theme.text};
`;

const OrderDate = styled.Text`
  margin-top: 2px;
  font-family: ${typography.caption.fontFamily};
  font-size: ${typography.caption.fontSize}px;
  color: ${({ theme }) => theme.textMuted};
`;

const ThumbsRow = styled.View`
  flex-direction: row;
  gap: ${spacing.sm}px;
  margin-top: ${spacing.md}px;
`;

const Thumb = styled(Image)`
  width: 52px;
  height: 52px;
  border-radius: ${radius.md}px;
`;

const CardFooter = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-top: ${spacing.md}px;
  padding-top: ${spacing.md}px;
  border-top-width: 1px;
  border-top-color: ${({ theme }) => theme.border};
`;

const ItemsCount = styled.Text`
  font-family: ${typography.body.fontFamily};
  color: ${({ theme }) => theme.textSecondary};
`;

const TotalValue = styled.Text`
  font-family: ${typography.bodySemiBold.fontFamily};
  font-size: ${typography.bodyLg.fontSize}px;
  color: ${({ theme }) => theme.primary};
`;
