import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/Login';
import OtpScreen from '../screens/Otp';
import SignUpScreen from '../screens/SignUp';
import type { AuthFlow, AuthMethod } from '../types/auth';

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Otp: { flow: AuthFlow; method: AuthMethod; contact: string };
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default AppNavigator;
