import AuthLayout from '../components/layout/AuthLayout';
import Form from '../components/layout/Form';

const LoginScreen = () => {
  return (
    <AuthLayout>
      <Form type="login" />
    </AuthLayout>
  );
};

export default LoginScreen;
