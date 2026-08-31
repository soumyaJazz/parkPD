import { useEffect, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TextInputKeyPressEvent,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { isDeadChallenge, requestOtp, verifyOtp } from '../../api';
import type { OtpChallenge } from '../../api';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { globalStyles, minInset } from '../../theme';
import { formatPhoneNumber } from '../../utils/validation';
import { styles } from './OtpScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Otp'>;

const OTP_LENGTH = 4;

function formatCountdown(totalSeconds: number): string {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/** Whole seconds until an epoch-ms deadline, floored at zero. */
function secondsUntil(deadline: number): number {
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

/**
 * The line to show for a rejected request. Anything the api layer throws is an
 * ApiError carrying the server's own copy; `fallback` covers the rest.
 */
function errorMessage(thrown: unknown, fallback: string): string {
  return thrown instanceof Error ? thrown.message : fallback;
}

function OtpScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const { flow, method, contact } = route.params;
  const displayContact =
    method === 'phone' ? formatPhoneNumber(contact) : contact;

  // Resending issues a fresh challenge, so this can't stay a route param -
  // the old challengeId stops being the one the typed code belongs to.
  const [challenge, setChallenge] = useState<OtpChallenge>({
    challengeId: route.params.challengeId,
    expiresAt: route.params.expiresAt,
    resendAfter: route.params.resendAfter,
  });

  // The server's own confirmation - kept in state because resending issues a
  // fresh one, and it is the only place that knows where the code went.
  const [notice, setNotice] = useState(route.params.notice);

  const inputs = useRef<Array<ComponentRef<typeof TextInput> | null>>([]);
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  // The challenge is spent the moment the server accepts the code, so once it
  // has there is nothing left on this screen to submit or resend.
  const [isVerified, setIsVerified] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    secondsUntil(challenge.resendAfter),
  );

  const isComplete = digits.every(digit => digit !== '');
  const canSubmit = isComplete && !isVerifying && !isVerified;
  const canResend = secondsLeft === 0 && !isResending && !isVerified;
  const buttonLabel = isVerified
    ? 'Verified'
    : isVerifying
      ? 'Verifying...'
      : 'Continue';

  // Counts down to the server's own cooldown deadline. Each tick recomputes
  // from the clock rather than subtracting one, so time spent with the app
  // backgrounded (where timers are throttled) doesn't leave the countdown
  // running behind the deadline it describes.
  useEffect(() => {
    setSecondsLeft(secondsUntil(challenge.resendAfter));

    const timer = setInterval(() => {
      const remaining = secondsUntil(challenge.resendAfter);
      setSecondsLeft(remaining);
      if (remaining === 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [challenge.resendAfter]);

  const handleChangeDigit = (text: string, index: number) => {
    let cleaned = text.replace(/\D/g, '');
    setError(null);

    const next = [...digits];

    if (!cleaned) {
      next[index] = '';
      setDigits(next);
      return;
    }

    // Typing into a filled box replaces that digit rather than shifting the
    // rest of the code along.
    if (cleaned.length === 2 && cleaned[0] === digits[index]) {
      cleaned = cleaned.slice(1);
    }

    // A pasted or SMS-autofilled code spills across the boxes that follow.
    for (let i = 0; i < cleaned.length && index + i < OTP_LENGTH; i++) {
      next[index + i] = cleaned[i];
    }
    setDigits(next);

    const focusTarget = Math.min(index + cleaned.length, OTP_LENGTH - 1);
    inputs.current[focusTarget]?.focus();
  };

  const handleKeyPress = (event: TextInputKeyPressEvent, index: number) => {
    // Backspace on an empty box clears and moves to the previous one.
    if (event.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
      inputs.current[index - 1]?.focus();
    }
  };

  const handleContinue = async () => {
    if (!canSubmit) {
      return;
    }

    setIsVerifying(true);
    setError(null);
    try {
      // challenge.challengeId, not the route param - a resend replaced it, and
      // the typed code belongs to whichever challenge was issued last.
      const { data, message } = await verifyOtp(
        challenge.challengeId,
        digits.join(''),
        flow,
      );
      setIsVerified(true);
      showToast(data.isNewUser ? 'Welcome to parkPD' : 'Welcome back', message);

      // Holding the session is the whole navigation. The navigator swaps this
      // stack out for the app's own the moment a user exists, and reads the
      // account to decide between profile setup and home - so there is nothing
      // to reset here, and no way back to a challenge that is already spent.
      await signIn(data);
    } catch (verifyError) {
      const message = errorMessage(
        verifyError,
        'Could not verify the code. Please try again.',
      );
      showToast(message, undefined, 'error');

      // Expired, spent or locked out: the challenge is gone server-side, so
      // there is nothing left on this screen to get right. Send them back to
      // the form they came from to ask for a new code - it still holds the
      // address they typed, and the toast host is mounted at the app root, so
      // the server's reason stays on screen through the transition.
      if (isDeadChallenge(verifyError)) {
        if (flow === 'signup') {
          navigation.navigate('SignUp');
        } else {
          navigation.navigate('Login');
        }
        return;
      }

      // A wrong guess, then - the code itself is still live. Inline under the
      // boxes pins the reason to what was typed, and clearing them beats making
      // the user backspace through four digits that are already known bad.
      setError(message);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) {
      return;
    }

    setIsResending(true);
    setError(null);
    try {
      // A new challenge replaces the old one outright: the server keeps a
      // single live code per address, so the previous challengeId is dead.
      const { data, message } = await requestOtp(contact, flow, method);
      setChallenge(data);
      setNotice(message);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
      // The banner reads the same before and after, so the countdown resetting
      // is the only on-screen change - a popup confirms the resend went out.
      showToast('Code sent', message);
    } catch (resendError) {
      const message = errorMessage(
        resendError,
        'Could not send a new code. Please try again.',
      );
      setError(message);
      showToast(message, undefined, 'error');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={globalStyles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[
          globalStyles.screen,
          {
            paddingTop: Math.max(minInset.top, insets.top),
            paddingBottom: Math.max(minInset.bottom, insets.bottom),
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={navigation.goBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <View style={styles.chevron} />
        </TouchableOpacity>

        <Text style={globalStyles.title}>Please enter 4-digit code</Text>
        <Text style={globalStyles.subtext}>{notice}</Text>

        <View style={styles.contactRow}>
          <Text style={styles.contact} numberOfLines={1}>
            {displayContact}
          </Text>
          <TouchableOpacity onPress={navigation.goBack}>
            <Text style={styles.editLink}>Edit</Text>
          </TouchableOpacity>
        </View>

        <Text style={globalStyles.label}>Enter OTP</Text>
        <View style={styles.otpRow}>
          {digits.map((digit, index) => (
            <TextInput
              key={index}
              ref={element => {
                inputs.current[index] = element;
              }}
              style={[
                globalStyles.input,
                styles.otpBox,
                digit !== '' && globalStyles.inputActive,
              ]}
              value={digit}
              onChangeText={text => handleChangeDigit(text, index)}
              onKeyPress={event => handleKeyPress(event, index)}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH}
              selectTextOnFocus
              autoFocus={index === 0}
              autoComplete={index === 0 ? 'sms-otp' : 'off'}
              textContentType={index === 0 ? 'oneTimeCode' : 'none'}
            />
          ))}
        </View>
        <Text style={globalStyles.errorText}>{error ?? ''}</Text>

        <View style={styles.resendRow}>
          {canResend ? (
            <View />
          ) : (
            <Text style={styles.timer}>
              Resend code in {formatCountdown(secondsLeft)}
            </Text>
          )}
          <TouchableOpacity
            onPress={() => {
              handleResend();
            }}
            disabled={!canResend}
          >
            <Text style={[styles.resend, !canResend && styles.resendDisabled]}>
              {isResending ? 'Sending...' : 'Resend'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={globalStyles.spacer} />

        <TouchableOpacity
          style={[globalStyles.button, isComplete && globalStyles.buttonReady]}
          onPress={() => {
            handleContinue();
          }}
          disabled={!canSubmit}
          activeOpacity={0.9}
        >
          <Text style={globalStyles.buttonText}>{buttonLabel}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

export default OtpScreen;
