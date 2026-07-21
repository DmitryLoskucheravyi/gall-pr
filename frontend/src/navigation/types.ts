import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  Profile: undefined;
  Register: undefined;
  Login: undefined;
  Catalog: undefined;
  Painting: { id: number };
};

export type NavigationProps = NativeStackNavigationProp<RootStackParamList>;
