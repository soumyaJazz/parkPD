import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/Login';
import OtpScreen from '../screens/Otp';
import ProfileSetupScreen from '../screens/ProfileSetup';
import SignUpScreen from '../screens/SignUp';
import type { AuthFlow, AuthMethod } from '../types/auth';

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Otp: {
    flow: AuthFlow;
    method: AuthMethod;
    contact: string;
    /** Identifies the code the server just mailed, for the verify step. */
    challengeId: string;
    /** Epoch milliseconds; the code stops working after this. */
    expiresAt: number;
    /** Epoch milliseconds; the server refuses another code before this. */
    resendAfter: number;
    /**
     * What the server said when it sent the code. Carried through so the screen
     * shows the server's wording rather than a second copy of it that could
     * drift once SMS lands.
     */
    notice: string;
  };
  ProfileSetup: {
    /** The account the verified code just created; what the save is keyed on. */
    userId: string;
    /**
     * Whichever detail the account was verified with. Present means the screen
     * shows it locked - it is the address the code went to, so it can't be
     * edited here; absent means it offers an optional field for it instead.
     */
    email?: string;
    phone?: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="Otp" component={OtpScreen} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default AppNavigator;
