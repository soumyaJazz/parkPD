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
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { globalStyles, minInset } from '../../theme';
import { formatPhoneNumber } from '../../utils/validation';
import { styles } from './OtpScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Otp'>;

const OTP_LENGTH = 4;
const RESEND_SECONDS = 56;

function formatCountdown(totalSeconds: number): string {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function OtpScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { flow, method, contact } = route.params;
  const displayContact =
    method === 'phone' ? formatPhoneNumber(contact) : contact;

  const inputs = useRef<Array<ComponentRef<typeof TextInput> | null>>([]);
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  const isComplete = digits.every(digit => digit !== '');
  const canResend = secondsLeft === 0;

  // Ticks the resend countdown down one second at a time.
  useEffect(() => {
    if (secondsLeft === 0) {
      return;
    }
    const timer = setTimeout(() => setSecondsLeft(current => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

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

  const handleContinue = () => {
    if (!isComplete || isVerifying) {
      return;
    }

    const code = digits.join('');
    setIsVerifying(true);

    // TODO: wire up to the OTP verify endpoint for this flow.
    console.log('verify otp', { flow, method, contact, code });
    setTimeout(() => setIsVerifying(false), 1200);
  };

  const handleResend = () => {
    if (!canResend) {
      return;
    }

    // TODO: ask the backend to send a new code.
    console.log('resend otp', { flow, method, contact });
    setDigits(Array(OTP_LENGTH).fill(''));
    setError(null);
    setSecondsLeft(RESEND_SECONDS);
    inputs.current[0]?.focus();
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
        <Text style={globalStyles.subtext}>We sent a 4-digit code to you at</Text>

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
          <TouchableOpacity onPress={handleResend} disabled={!canResend}>
            <Text style={[styles.resend, !canResend && styles.resendDisabled]}>
              Resend
            </Text>
          </TouchableOpacity>
        </View>

        <View style={globalStyles.spacer} />

        <TouchableOpacity
          style={[globalStyles.button, isComplete && globalStyles.buttonReady]}
          onPress={handleContinue}
          disabled={!isComplete || isVerifying}
          activeOpacity={0.9}
        >
          <Text style={globalStyles.buttonText}>
            {isVerifying ? 'Verifying...' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

export default OtpScreen;
