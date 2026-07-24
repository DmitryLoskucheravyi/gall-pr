import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  Profile: undefined;
  Register: undefined;
  Login: undefined;
  Catalog: undefined;
  Painting: { id: number };
  Dictionaries: undefined;
  Cart: undefined;
  Orders: undefined;
  AdminOrders: undefined;
  AdminSettings: undefined;
};

export type NavigationProps = NativeStackNavigationProp<RootStackParamList>;
