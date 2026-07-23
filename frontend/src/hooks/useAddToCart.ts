import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { NavigationProps } from '../navigation/types';
import { Painting } from '../types/painting.types';
import { cartService } from '../api/cart.api';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';

export function useAddToCart() {
  const navigation = useNavigation<NavigationProps>();
  const user = useAuthStore((state) => state.user);

  return async (painting: Painting) => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }

    try {
      await cartService.addItem(painting.id);
      await useCartStore.getState().refresh();

      useToastStore.getState().show(`Додано в кошик: ${painting.title}`);
    } catch (error: any) {
      Alert.alert(
        'Не вдалося додати в кошик',
        error?.response?.data?.message ?? 'Спробуйте ще раз пізніше',
      );
    }
  };
}
