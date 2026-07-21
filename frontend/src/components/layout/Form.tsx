import styled from 'styled-components/native';
import { AntDesign } from '@expo/vector-icons';
import { useState } from 'react';
import { useTheme } from 'styled-components/native';
import { useAuthStore } from '../../store/authStore';
import { useNavigation } from '@react-navigation/native';
import { register, login } from '../../api/auth.api';
import { Pressable } from 'react-native';
import { RegisterDto, LoginDto } from '../../types/auth.types';
import { NavigationProps } from '../../navigation/types';
import { Button, TextField } from '../ui';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography, fontFamily } from '../../theme/typography';

type FormProps = { type: 'login' | 'register' };

const Form = ({ type }: FormProps) => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProps>();

  const isRegister = type === 'register';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [errors, setErrors] = useState({ name: '', email: '', password: '' });

  const sanitizeEmail = (value: string) =>
    value.trim().replace(/\s/g, '').toLowerCase();

  const sanitizeName = (value: string) => value.replace(/\s+/g, ' ').trim();

  const validateForm = () => {
    const newErrors = { name: '', email: '', password: '' };

    if (isRegister) {
      const cleanName = sanitizeName(name);

      if (!cleanName) {
        newErrors.name = "Введіть ім'я";
      } else if (cleanName.length < 2) {
        newErrors.name = 'Мінімум 2 символи';
      } else if (cleanName.length > 50) {
        newErrors.name = 'Максимум 50 символів';
      } else if (!/^[a-zA-Zа-яА-ЯіІїЇєЄґҐ' -]+$/.test(cleanName)) {
        newErrors.name = "Ім'я може містити тільки літери";
      }
    }

    const cleanEmail = sanitizeEmail(email);

    if (!cleanEmail) {
      newErrors.email = 'Введіть email';
    } else {
      const emailRegex =
        /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i;

      if (!emailRegex.test(cleanEmail)) {
        newErrors.email = 'Некоректний email';
      } else if (cleanEmail.length > 254) {
        newErrors.email = 'Email занадто довгий';
      }
    }

    if (!password) {
      newErrors.password = 'Введіть пароль';
    } else if (password.length < 8) {
      newErrors.password = 'Мінімум 8 символів';
    } else if (password.length > 128) {
      newErrors.password = 'Пароль занадто довгий';
    } else if (
      isRegister &&
      (!/[A-Za-zА-Яа-яІіЇїЄєҐґ]/.test(password) || !/\d/.test(password))
    ) {
      newErrors.password = 'Пароль має містити букви та цифри';
    }

    setErrors(newErrors);

    return !Object.values(newErrors).some(Boolean);
  };

  const handleSubmit = async () => {
    if (!validateForm() || submitting) return;

    const cleanName = sanitizeName(name);
    const cleanEmail = sanitizeEmail(email);

    setSubmitting(true);

    try {
      if (isRegister) {
        const data: RegisterDto = {
          firstName: cleanName,
          lastName: '',
          email: cleanEmail,
          password,
          phone: '+380964575876',
        };

        const response = await register(data);

        useAuthStore.getState().setAuth(response);

        navigation.navigate('Home');
      } else {
        const data: LoginDto = { email: cleanEmail, password };

        const response = await login(data);

        useAuthStore.getState().setAuth(response);

        navigation.navigate('Home');
      }
    } catch (e) {
      console.log(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container>
      <FormCard>
        <Overline>{isRegister ? 'Реєстрація' : 'Вхід'}</Overline>
        <Title>{isRegister ? 'Створити акаунт' : 'З поверненням'}</Title>

        <Subtitle>
          {isRegister
            ? 'Зареєструйтесь, щоб зберігати обрані картини'
            : 'Увійдіть, щоб продовжити перегляд галереї'}
        </Subtitle>

        {isRegister && (
          <TextField
            icon="person-outline"
            placeholder="Ваше ім'я"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
            }}
            autoCapitalize="words"
            autoCorrect={false}
            textContentType="givenName"
            error={errors.name}
          />
        )}

        <TextField
          icon="mail-outline"
          placeholder="Email"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          importantForAutofill="yes"
          error={errors.email}
        />

        <TextField
          icon="lock-closed-outline"
          placeholder="Пароль"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (errors.password)
              setErrors((prev) => ({ ...prev, password: '' }));
          }}
          secure
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password"
          textContentType="password"
          error={errors.password}
        />

        <ButtonWrap>
          <Button onPress={handleSubmit} loading={submitting}>
            {isRegister ? 'Створити акаунт' : 'Увійти'}
          </Button>
        </ButtonWrap>

        <Divider>
          <Line />
          <DividerText>або</DividerText>
          <Line />
        </Divider>

        <SocialRow>
          <SocialButton>
            <AntDesign name="google" size={18} color={theme.text} />
            <SocialText>Google</SocialText>
          </SocialButton>

          <SocialButton>
            <AntDesign name="apple" size={18} color={theme.text} />
            <SocialText>Apple</SocialText>
          </SocialButton>
        </SocialRow>

        <Pressable
          onPress={() => {
            navigation.navigate(isRegister ? 'Login' : 'Register');
          }}
        >
          <LoginText>
            {isRegister ? 'Вже маєте акаунт? ' : 'Ще не маєте акаунта? '}
            <LoginLink>{isRegister ? 'Увійти' : 'Зареєструватися'}</LoginLink>
          </LoginText>
        </Pressable>
      </FormCard>
    </Container>
  );
};

export default Form;

const Container = styled.View`
  flex: 1;
  padding: ${spacing.xxl}px;
  padding-top: ${spacing.huge}px;
  justify-content: center;
`;

const FormCard = styled.View`
  width: 100%;
  border-width: 1px;
  border-color: ${({ theme }) => theme.border};
  padding: ${spacing.xxxl}px ${spacing.xxl}px;
  border-radius: ${radius.xxl}px;
  background-color: ${({ theme }) => `${theme.surface}F0`};
`;

const Overline = styled.Text`
  font-family: ${typography.overline.fontFamily};
  font-size: ${typography.overline.fontSize}px;
  letter-spacing: ${typography.overline.letterSpacing}px;
  text-transform: uppercase;
  color: ${({ theme }) => theme.accent};
  margin-bottom: ${spacing.sm}px;
`;

const Title = styled.Text`
  font-family: ${typography.display.fontFamily};
  font-size: 30px;
  color: ${({ theme }) => theme.text};
`;

const Subtitle = styled.Text`
  margin-top: ${spacing.sm}px;
  margin-bottom: ${spacing.xxxl}px;
  font-family: ${typography.body.fontFamily};
  font-size: ${typography.bodyLg.fontSize}px;
  line-height: ${typography.bodyLg.lineHeight}px;
  color: ${({ theme }) => theme.textSecondary};
`;

const ButtonWrap = styled.View`
  margin-top: ${spacing.sm}px;
`;

const Divider = styled.View`
  flex-direction: row;
  align-items: center;
  margin: ${spacing.xxl}px 0;
`;

const Line = styled.View`
  flex: 1;
  height: 1px;
  background-color: ${({ theme }) => theme.border};
`;

const DividerText = styled.Text`
  margin: 0 ${spacing.md}px;
  font-family: ${typography.body.fontFamily};
  font-size: ${typography.caption.fontSize}px;
  color: ${({ theme }) => theme.textSecondary};
`;

const SocialRow = styled.View`
  flex-direction: row;
  gap: ${spacing.md}px;
`;

const SocialButton = styled.Pressable`
  flex: 1;
  height: 52px;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: ${spacing.sm}px;
  border-radius: ${radius.lg}px;
  background-color: ${({ theme }) => theme.background};
  border-width: 1px;
  border-color: ${({ theme }) => theme.border};
`;

const SocialText = styled.Text`
  font-family: ${typography.bodySemiBold.fontFamily};
  font-size: ${typography.body.fontSize}px;
  color: ${({ theme }) => theme.text};
`;

const LoginText = styled.Text`
  margin-top: ${spacing.xxl}px;
  text-align: center;
  font-family: ${typography.body.fontFamily};
  font-size: ${typography.body.fontSize}px;
  color: ${({ theme }) => theme.textSecondary};
`;

const LoginLink = styled.Text`
  font-family: ${fontFamily.bodyBold};
  font-size: ${typography.body.fontSize}px;
  color: ${({ theme }) => theme.primary};
`;
