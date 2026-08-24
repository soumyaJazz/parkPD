import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AuthForm from '../../components/AuthForm';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import type { AuthMethod } from '../../types/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

function SignUpScreen({ navigation }: Props) {
  const handleSubmit = (method: AuthMethod, contact: string) => {
    // TODO: register the contact with the backend before navigating.
    navigation.navigate('Otp', { flow: 'signup', method, contact });
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
