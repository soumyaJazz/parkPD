import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AuthForm from '../../components/AuthForm';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import type { AuthMethod } from '../../types/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

function LoginScreen({ navigation }: Props) {
  const handleSubmit = (method: AuthMethod, contact: string) => {
    // TODO: request a code from the backend before navigating.
    navigation.navigate('Otp', { flow: 'login', method, contact });
  };

  return (
    <AuthForm
      title="Log in to parkPD"
      subtext="We'll send you a 4-digit code to verify it's you."
      onSubmit={handleSubmit}
      footerText="Don't have an account?"
      footerActionLabel="Sign up"
      onFooterAction={() => navigation.navigate('SignUp')}
    />
  );
}

export default LoginScreen;
