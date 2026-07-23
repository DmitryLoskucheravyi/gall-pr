import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';

import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RegisterScreen from '../screens/RegisterScreen';
import LoginScreen from '../screens/LoginScreen';
import CatalogScreen from '../screens/CatalogScreen';
import PaintingScreen from '../screens/PaintingScreen';
import DictionariesScreen from '../screens/DictionariesScreen';
import CartScreen from '../screens/CartScreen';
import OrdersScreen from '../screens/OrdersScreen';
import AdminOrdersScreen from '../screens/AdminOrdersScreen';
import Menu from '../components/menu/Menu';
import { Toast } from '../components/ui';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 260,
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen name="Catalog" component={CatalogScreen} />
        <Stack.Screen
          name="Painting"
          component={PaintingScreen}
          options={{ animation: 'fade_from_bottom' }}
        />
        <Stack.Screen name="Dictionaries" component={DictionariesScreen} />
        <Stack.Screen name="Cart" component={CartScreen} />
        <Stack.Screen name="Orders" component={OrdersScreen} />
        <Stack.Screen name="AdminOrders" component={AdminOrdersScreen} />
      </Stack.Navigator>
      <Menu />
      <Toast />
    </NavigationContainer>
  );
};

export default AppNavigator;
