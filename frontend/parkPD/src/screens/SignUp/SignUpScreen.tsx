import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { requestOtp } from '../../api';
import AuthForm from '../../components/AuthForm';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import type { AuthMethod } from '../../types/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

function SignUpScreen({ navigation }: Props) {
  const handleSubmit = async (method: AuthMethod, contact: string) => {
    // /auth/request-otp takes an email; there is no SMS sender behind the phone
    // tab yet, so say that rather than letting the server reject the format.
    if (method === 'phone') {
      throw new Error(
        "Phone sign-up isn't available yet. Use your email address.",
      );
    }

    // Throwing propagates to AuthForm, which puts the message under the field.
    // "already registered" surfaces here, before any mail is sent.
    const { data: challenge, message } = await requestOtp(
      contact,
      'signup',
      method,
    );

    // Only navigate once the code is actually on its way, and carry the
    // challenge along - it's what the verify step matches the typed code against.
    navigation.navigate('Otp', {
      flow: 'signup',
      method,
      contact,
      notice: message,
      ...challenge,
    });
  };

  return (
    <AuthForm
      title="Sign up for parkPD"
      subtext="We'll send you a 4-digit code to confirm your details."
      onSubmit={handleSubmit}
      footerText="Already have an account?"
      footerActionLabel="Log in"
      onFooterAction={() => navigation.navigate('Login')}
    />
  );
}

export default SignUpScreen;
