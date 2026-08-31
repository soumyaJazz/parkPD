import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import HomeScreen from '../screens/Home';
import LoginScreen from '../screens/Login';
import OtpScreen from '../screens/Otp';
import ProfileSetupScreen from '../screens/ProfileSetup';
import SignUpScreen from '../screens/SignUp';
import { colors } from '../theme';
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
    /**
     * Whichever detail the account was verified with. Present means the screen
     * shows it locked - it is the address the code went to, so it can't be
     * edited here; absent means it offers an optional field for it instead.
     *
     * Which account is being filled in isn't here: the server takes that from
     * the access token, so the screen never needs to name it.
     */
    email?: string;
    phone?: string;
  };
  Home: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Which screens exist is decided by the session, not by navigation calls.
 *
 * Signing in doesn't push or reset anything: holding a user swaps the whole
 * auth stack out for the app's own, so the screens behind it unmount and there
 * is no back gesture into a spent OTP form. Signing out is the same move in
 * reverse. That is why nothing in here is reachable by name from the other
 * side - the two groups are never mounted at the same time.
 */
function AppNavigator() {
  const { user, isRestoring } = useAuth();

  // A saved session is checked against the server at launch. Showing the
  // sign-in screen during that check would flash it at someone who is already
  // signed in, then yank it away a moment later.
  if (isRestoring) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user === null ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="Otp" component={OtpScreen} />
          </>
        ) : user.profileCompletedAt ? (
          <Stack.Screen name="Home" component={HomeScreen} />
        ) : (
          // Setup is owed. The flag comes from the server, so abandoning this
          // screen - or reinstalling - still lands back here rather than
          // skipping into an app with a half-filled account.
          <Stack.Screen
            name="ProfileSetup"
            component={ProfileSetupScreen}
            initialParams={{ email: user.email }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});

export default AppNavigator;
