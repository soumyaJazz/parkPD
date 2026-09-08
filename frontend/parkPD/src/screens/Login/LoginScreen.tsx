import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { requestOtp } from '../../api';
import AuthForm from '../../components/AuthForm';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import type { AuthMethod } from '../../types/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

function LoginScreen({ navigation }: Props) {
  const handleSubmit = async (method: AuthMethod, contact: string) => {
    // 'login' is what makes the server reject a detail with no account behind
    // it, instead of quietly sending a code that could never be used. It is
    // also what catches the near miss: a detail that is on an account, but not
    // the one that account signs in with - the server names the right one.
    const { data: challenge, message } = await requestOtp(
      contact,
      'login',
      method,
    );

    navigation.navigate('Otp', {
      flow: 'login',
      method,
      contact,
      notice: message,
      ...challenge,
    });
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
