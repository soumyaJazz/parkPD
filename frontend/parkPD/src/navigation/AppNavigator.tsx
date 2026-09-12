import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { SetupDraftProvider } from '../context/SetupDraftContext';
import DoseLogScreen from '../screens/DoseLog';
import HomeScreen from '../screens/Home';
import InsightsScreen from '../screens/Insights';
import LoginScreen from '../screens/Login';
import MorningCheckScreen from '../screens/MorningCheck';
import NightReviewScreen from '../screens/NightReview';
import OtherMedsScreen from '../screens/OtherMeds';
import ReviewScreen from '../screens/Review';
import SideEffectsScreen from '../screens/SideEffects';
import OtpScreen from '../screens/Otp';
import ProfileScreen from '../screens/Profile';
import ProfileQuestionsScreen from '../screens/ProfileQuestions';
import ProfileSetupScreen from '../screens/ProfileSetup';
import SignUpScreen from '../screens/SignUp';
import { colors } from '../theme';
import type { AuthFlow, AuthMethod } from '../types/auth';
import type {
  DailyLogParts,
  MedicationPlan,
  MorningCheck,
  OtherMeds,
  SideEffects,
} from '../types/dailyLog';
import type { DoseLog } from '../types/doseLog';
import type { ProfileDetails } from '../types/profile';

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
  ProfileQuestions: {
    /**
     * What the details screen collected. Carried rather than saved: the server
     * completes a profile once, so both halves go up in a single request at
     * the end of the questionnaire.
     */
    details: ProfileDetails;
  };
  Home: undefined;
  /**
   * The profile, reopened from the menu - see `screens/Profile`.
   *
   * No params: the account is already held by the auth context, questionnaire
   * and all, so the screen fills its form in from there rather than being
   * handed a copy that could be stale by the time it is saved.
   */
  Profile: undefined;
  /**
   * One day's medicine read as a line - see `screens/Insights`.
   *
   * No params: the screen shows the last day that was logged, and which day
   * that is, only the server knows. Asking for it by name is what the calendar
   * will do later, and the endpoint behind this already takes a date - so the
   * day this opens on is a decision about the screen, not about the route.
   */
  Insights: undefined;
  /** The first of the three parts of a day's log - see `screens/MorningCheck`. */
  MorningCheck: {
    /**
     * The day being logged, as `dayKey()` - `YYYY-MM-DD` in local time. A
     * string rather than a Date: route params are serialised, and a Date that
     * has been through that comes back as one.
     */
    date: string;
  };
  /** The second part: the nine questions, once per dose - see `screens/DoseLog`. */
  DoseLog: {
    date: string;
    /**
     * The morning check, already in the shape it will be sent in.
     *
     * Carried forward rather than saved: the day's log goes up as one request
     * after the review at the end, so each step hands the next everything
     * gathered so far. Params are serialised, and this is plain JSON.
     */
    morning: MorningCheck;
    /** Which medicine, and how many times it is taken - so how many doses to ask about. */
    plan: MedicationPlan;
  };
  /**
   * The third part: the questions asked once for the whole day rather than
   * once per dose - see `screens/OtherMeds`.
   */
  OtherMeds: {
    date: string;
    morning: MorningCheck;
    plan: MedicationPlan;
    /**
     * Every dose of the day, already in the shape it will be sent in. Empty
     * when the medicine was not taken at all, which is a day with common
     * questions but no doses to have asked them about.
     */
    doses: DoseLog[];
  };
  /** The second of the common questions - see `screens/SideEffects`. */
  SideEffects: {
    date: string;
    morning: MorningCheck;
    plan: MedicationPlan;
    doses: DoseLog[];
    /** What the question before this one collected. */
    otherMeds: OtherMeds;
  };
  /** The last of the common questions - see `screens/NightReview`. */
  NightReview: {
    date: string;
    morning: MorningCheck;
    plan: MedicationPlan;
    doses: DoseLog[];
    otherMeds: OtherMeds;
    sideEffects: SideEffects;
  };
  /**
   * The last step: the whole day, checked over and sent - see `screens/Review`.
   *
   * Typed as the payload's own parts rather than listed again, because that is
   * exactly what they are: the screen hands `route.params` straight to
   * `toDailyLog`, so the two can never drift apart.
   */
  Review: DailyLogParts;
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
      {/* Above the navigator, so the questionnaire's answers survive stepping
          back to the details screen and popping the screen that holds them. */}
      <SetupDraftProvider>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user === null ? (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="SignUp" component={SignUpScreen} />
              <Stack.Screen name="Otp" component={OtpScreen} />
            </>
          ) : user.profile_completed_at ? (
            // Setup is done, so the app proper is what exists: the home screen
            // and the log a day opens into.
            <>
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="Insights" component={InsightsScreen} />
              <Stack.Screen
                name="MorningCheck"
                component={MorningCheckScreen}
              />
              <Stack.Screen name="DoseLog" component={DoseLogScreen} />
              <Stack.Screen name="OtherMeds" component={OtherMedsScreen} />
              <Stack.Screen
                name="SideEffects"
                component={SideEffectsScreen}
              />
              <Stack.Screen
                name="NightReview"
                component={NightReviewScreen}
              />
              <Stack.Screen name="Review" component={ReviewScreen} />
            </>
          ) : (
            // Setup is owed, and it runs over two screens - the details, then
            // the questionnaire - so both live in this branch. The flag comes
            // from the server, so abandoning either one, or reinstalling, still
            // lands back here rather than skipping into a half-filled account.
            <>
              {/* The screen shows whichever detail was verified as locked and
                  offers the other as an optional field, so what it is handed
                  is what proved the account - not an assumption that this is
                  always the email. */}
              <Stack.Screen
                name="ProfileSetup"
                component={ProfileSetupScreen}
                initialParams={
                  user.verified_with === 'phone'
                    ? { phone: user.phone }
                    : { email: user.email }
                }
              />
              <Stack.Screen
                name="ProfileQuestions"
                component={ProfileQuestionsScreen}
              />
            </>
          )}
        </Stack.Navigator>
      </SetupDraftProvider>
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
