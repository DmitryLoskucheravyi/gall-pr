import { ImageBackground, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { ScreenLayout } from '../components/layout/components.styled';
import Form from '../components/layout/Form';

const RegisterScreen = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  return (
    <ImageBackground
      resizeMode="cover"
      source={require('../../assets/bg/register.png')}
      style={{ flex: 1 }}
    >
      <ScreenLayout>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ position: 'absolute', top: 50, left: 25, zIndex: 10 }}
        >
          <Ionicons name="arrow-back" size={28} color={theme.text} />
        </Pressable>

        <Form type="register" />
      </ScreenLayout>
    </ImageBackground>
  );
};

export default RegisterScreen;
