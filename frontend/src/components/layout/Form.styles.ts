import styled from "styled-components/native";

export const Container = styled.View`
  flex: 1;
  padding: 24px;
  padding-top: 80px;
`;

export const LoginText = styled.Text`
  margin-top: 24px;
  text-align: center;
  color: ${({ theme }) => theme.secondaryText};
`;

export const LoginLink = styled.Text`
  color: ${({ theme }) => theme.text};
  font-weight: 700;
  text-decoration-line: underline;
`;

export const FormCard = styled.View`
  width: 100%;
  border-width: 1px;
  border-color: ${({ theme }) => theme.border};
  padding: 32px 24px;

  border-radius: 24px;

  background-color: ${({ theme }) => `${theme.background}B3`};
`;

export const Title = styled.Text`
  font-size: 34px;
  font-weight: 800;

  letter-spacing: -1px;

  color: ${({ theme }) => theme.text};
`;

export const Subtitle = styled.Text`
  margin-top: 6px;
  margin-bottom: 36px;

  font-size: 15px;
  line-height: 22px;

  color: ${({ theme }) => theme.text};
`;

export const Field = styled.View`
  margin-bottom: 16px;
`;

export const InputBox = styled.View<{ hasError?: boolean }>`
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

export const StyledInput = styled.TextInput`
  flex: 1;

  font-size: 16px;

  color: ${({ theme }) => theme.text};
`;

export const InputIcon = styled.View`
  margin-right: 14px;
`;

export const PasswordContainer = styled.View`
  flex: 1;
`;

export const EyeButton = styled.Pressable`
  position: absolute;

  right: 0;
  top: 50%;

  transform: translateY(-10px);
`;

export const ErrorRow = styled.View`
  flex-direction: row;
  align-items: center;

  margin-top: 8px;
`;

export const ErrorText = styled.Text`
  margin-left: 6px;

  font-size: 12px;
  font-weight: 600;

  color: ${({ theme }) => theme.error};
`;

export const SubmitButton = styled.Pressable`
  height: 58px;

  margin-top: 12px;

  justify-content: center;
  align-items: center;

  border-width: 1px;
  border-color: ${({ theme }) => theme.border};

  border-radius: 18px;

  background-color: ${({ theme }) => theme.card};
`;

export const SubmitText = styled.Text`
  color: ${({ theme }) => theme.text};

  font-size: 16px;
  font-weight: 700;
`;

export const Divider = styled.View`
  flex-direction: row;
  align-items: center;

  margin: 28px 0;
`;

export const Line = styled.View`
  flex: 1;

  height: 1px;

  background-color: ${({ theme }) => theme.border};
`;

export const DividerText = styled.Text`
  margin: 0 12px;

  font-size: 13px;
  font-weight: 500;

  color: ${({ theme }) => theme.secondaryText};
`;

export const SocialRow = styled.View`
  flex-direction: row;
  gap: 12px;
`;

export const SocialButton = styled.Pressable`
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

export const SocialText = styled.Text`
  color: ${({ theme }) => theme.text};

  font-size: 14px;
  font-weight: 600;
`;
