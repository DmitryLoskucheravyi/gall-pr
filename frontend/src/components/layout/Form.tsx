import styled from 'styled-components/native';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import { useNavigation } from '@react-navigation/native';
import { register, login } from '../../api/auth.api';
import { Pressable } from 'react-native';
import { RegisterDto, LoginDto } from '../../types/auth.types';
import { NavigationProps } from '../menu/Menu';

const Container = styled.View`
  flex: 1;
  padding: 24px;
  padding-top: 80px;
`;

const LoginText = styled.Text`
  margin-top: 24px;
  text-align: center;
  color: ${({ theme }) => theme.secondaryText};
`;

const LoginLink = styled.Text`
  color: ${({ theme }) => theme.text};
  font-weight: 700;
  text-decoration-line: underline;
`;

const FormCard = styled.View`
  width: 100%;
  border-width: 1px;
  border-color: ${({ theme }) => theme.border};
  padding: 32px 24px;

  border-radius: 24px;

  background-color: ${({ theme }) => `${theme.background}B3`};
`;

const Title = styled.Text`
  font-size: 34px;
  font-weight: 800;

  letter-spacing: -1px;

  color: ${({ theme }) => theme.text};
`;

const Subtitle = styled.Text`
  margin-top: 6px;
  margin-bottom: 36px;

  font-size: 15px;
  line-height: 22px;

  color: ${({ theme }) => theme.text};
`;

const Field = styled.View`
  margin-bottom: 16px;
`;

const InputBox = styled.View<{ hasError?: boolean }>`
  flex-direction: row;
  align-items: center;

  min-height: 58px;

  padding: 0 18px;

  border-radius: 18px;

  background-color: ${({ theme }) => theme.background};
  border-width: 1px;
  border-color: ${({ theme, hasError }) =>
    hasError ? theme.error : theme.border};
`;

const StyledInput = styled.TextInput`
  flex: 1;

  font-size: 16px;

  color: ${({ theme }) => theme.text};
`;

const InputIcon = styled.View`
  margin-right: 14px;
`;

const PasswordContainer = styled.View`
  flex: 1;
`;

const EyeButton = styled.Pressable`
  position: absolute;

  right: 0;
  top: 50%;

  transform: translateY(-10px);
`;

const ErrorRow = styled.View`
  flex-direction: row;
  align-items: center;

  margin-top: 8px;
`;

const ErrorText = styled.Text`
  margin-left: 6px;

  font-size: 12px;
  font-weight: 600;

  color: ${({ theme }) => theme.error};
`;

const SubmitButton = styled.Pressable`
  height: 58px;

  margin-top: 12px;

  justify-content: center;
  align-items: center;

  border-width: 1px;
  border-color: ${({ theme }) => theme.border};

  border-radius: 18px;

  background-color: ${({ theme }) => theme.card};
`;

const SubmitText = styled.Text`
  color: ${({ theme }) => theme.text};

  font-size: 16px;
  font-weight: 700;
`;

const Divider = styled.View`
  flex-direction: row;
  align-items: center;

  margin: 28px 0;
`;

const Line = styled.View`
  flex: 1;

  height: 1px;

  background-color: ${({ theme }) => theme.border};
`;

const DividerText = styled.Text`
  margin: 0 12px;

  font-size: 13px;
  font-weight: 500;

  color: ${({ theme }) => theme.secondaryText};
`;

const SocialRow = styled.View`
  flex-direction: row;
  gap: 12px;
`;

const SocialButton = styled.Pressable`
  flex: 1;

  height: 56px;

  flex-direction: row;
  justify-content: center;
  align-items: center;

  gap: 10px;

  border-radius: 18px;

  background-color: ${({ theme }) => theme.card};

  border-width: 1px;
  border-color: ${({ theme }) => theme.border};
`;

const SocialText = styled.Text`
  color: ${({ theme }) => theme.text};

  font-size: 14px;
  font-weight: 600;
`;
type FormProps = { type: 'login' | 'register' };

const Form = ({ type }: FormProps) => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProps>();

  const isRegister = type === 'register';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);

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
    if (!validateForm()) return;

    const cleanName = sanitizeName(name);
    const cleanEmail = sanitizeEmail(email);

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
    }
  };

  return (
    <Container>
      <FormCard>
        <Title>{isRegister ? 'Створити акаунт' : 'Вхід в акаунт'}</Title>

        <Subtitle>
          {isRegister
            ? 'Зареєструйтесь для продовження'
            : 'Увійдіть для продовження'}
        </Subtitle>

        {isRegister && (
          <Field>
            <InputBox hasError={!!errors.name}>
              <InputIcon>
                <Ionicons name="person-outline" size={20} color={theme.text} />
              </InputIcon>

              <StyledInput
                placeholder="Ваше ім'я"
                value={name}
                onChangeText={(text) => {
                  setName(text);

                  if (errors.name) {
                    setErrors((prev) => ({ ...prev, name: '' }));
                  }
                }}
                autoCapitalize="words"
                autoCorrect={false}
                textContentType="givenName"
                placeholderTextColor={theme.text}
              />
            </InputBox>

            {!!errors.name && (
              <ErrorRow>
                <Ionicons name="alert-circle" size={14} color={theme.error} />
                <ErrorText>{errors.name}</ErrorText>
              </ErrorRow>
            )}
          </Field>
        )}

        <Field>
          <InputBox hasError={!!errors.email}>
            <InputIcon>
              <Ionicons name="mail-outline" size={20} color={theme.text} />
            </InputIcon>

            <StyledInput
              placeholder="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);

                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: '' }));
                }
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              importantForAutofill="yes"
              placeholderTextColor={theme.text}
            />
          </InputBox>

          {!!errors.email && (
            <ErrorRow>
              <Ionicons name="alert-circle" size={14} color={theme.error} />
              <ErrorText>{errors.email}</ErrorText>
            </ErrorRow>
          )}
        </Field>

        <Field>
          <InputBox hasError={!!errors.password}>
            <InputIcon>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={theme.text}
              />
            </InputIcon>

            <PasswordContainer>
              <StyledInput
                placeholder="Пароль"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);

                  if (errors.password) {
                    setErrors((prev) => ({ ...prev, password: '' }));
                  }
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                placeholderTextColor={theme.text}
              />

              <EyeButton onPress={() => setShowPassword((prev) => !prev)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={theme.text}
                />
              </EyeButton>
            </PasswordContainer>
          </InputBox>

          {!!errors.password && (
            <ErrorRow>
              <Ionicons name="alert-circle" size={14} color={theme.error} />
              <ErrorText>{errors.password}</ErrorText>
            </ErrorRow>
          )}
        </Field>

        <SubmitButton onPress={handleSubmit}>
          <SubmitText>{isRegister ? 'Створити акаунт' : 'Увійти'}</SubmitText>
        </SubmitButton>

        <Divider>
          <Line />
          <DividerText>або</DividerText>
          <Line />
        </Divider>

        <SocialRow>
          <SocialButton>
            <AntDesign name="google" size={20} color={theme.text} />
            <SocialText>Google</SocialText>
          </SocialButton>

          <SocialButton>
            <AntDesign name="apple" size={20} color={theme.text} />
            <SocialText>Apple</SocialText>
          </SocialButton>
        </SocialRow>
        <Pressable
          onPress={() => {
            if (isRegister) {
              navigation.navigate('Login');
            } else {
              navigation.navigate('Register');
            }
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
