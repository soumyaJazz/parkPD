import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, globalStyles, minInset } from '../../theme';
import { showToast } from '../Toast';
import type { AuthMethod } from '../../types/auth';
import {
  PHONE_INPUT_MAX_LENGTH,
  sanitizePhoneNumber,
  validateEmail,
  validatePhoneNumber,
} from '../../utils/validation';
import { styles } from './AuthForm.styles';

type Props = {
  title: string;
  subtext: string;
  submitLabel?: string;
  /** Shown on the button while `onSubmit` is in flight. */
  submittingLabel?: string;
  /**
   * Rejecting is how a screen reports a failed submit: the message is shown
   * under the field, so the screen never has to own error UI of its own.
   */
  onSubmit: (method: AuthMethod, contact: string) => void | Promise<void>;
  /** Prompt shown under the button, e.g. "Don't have an account?". */
  footerText: string;
  footerActionLabel: string;
  onFooterAction: () => void;
};

const METHODS: Array<{ key: AuthMethod; label: string; available: boolean }> = [
  { key: 'email', label: 'Email', available: true },
  // /auth/request-otp is email-only - there is no SMS sender behind this yet.
  // Flip to true once one exists; the screens' phone guard covers the gap if
  // it gets flipped early.
  { key: 'phone', label: 'Phone', available: false },
];

/** Named in the hint under the control, so it can't fall out of step with the list. */
const unavailableMethod = METHODS.find(option => !option.available);

/**
 * The email/phone identity form shared by the login and sign-up screens.
 * Only the copy differs between them, so the behaviour lives here once.
 */
function AuthForm({
  title,
  subtext,
  submitLabel = 'Continue',
  submittingLabel = 'Sending code...',
  onSubmit,
  footerText,
  footerActionLabel,
  onFooterAction,
}: Props) {
  const insets = useSafeAreaInsets();
  const [method, setMethod] = useState<AuthMethod>('email');
  // Kept apart so switching tabs doesn't discard what was already typed.
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPhone = method === 'phone';
  const value = isPhone ? phone : email;
  const validate = isPhone ? validatePhoneNumber : validateEmail;
  const isReady = validate(value) === null;

  const handleChange = (text: string) => {
    if (isPhone) {
      setPhone(sanitizePhoneNumber(text));
    } else {
      setEmail(text);
    }
    setError(null);
  };

  const handleSelectMethod = (next: AuthMethod) => {
    setMethod(next);
    setError(null);
  };

  const handleSubmit = async () => {
    // the submit-key path can fire again while the first request is open
    if (isSubmitting) {
      return;
    }

    const validationError = validate(value);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(method, value.trim());
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Something went wrong. Please try again.';
      // Inline under the field pins it to what's wrong; the toast is what
      // catches it if the user has already looked away from the input.
      setError(message);
      showToast(message, undefined, 'error');
    } finally {
      // the screen stays mounted underneath after navigating away, so this has
      // to run either way or coming back leaves a dead button
      setIsSubmitting(false);
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
        <View style={globalStyles.contentCentered}>
          <Text style={globalStyles.title}>{title}</Text>
          <Text style={[globalStyles.subtext, styles.subtext]}>{subtext}</Text>

          <View
            style={[
              styles.segmented,
              unavailableMethod && styles.segmentedWithHint,
            ]}
          >
            {METHODS.map(option => {
              const selected = option.key === method;
              const disabled = !option.available;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.segment, selected && styles.segmentActive]}
                  onPress={() => handleSelectMethod(option.key)}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      selected && styles.segmentTextActive,
                      disabled && styles.segmentTextDisabled,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {unavailableMethod && (
            <Text style={styles.methodHint}>
              {unavailableMethod.label} verification is coming soon.
            </Text>
          )}

          <Text style={globalStyles.label}>
            {isPhone ? 'Phone number' : 'Email address'}
          </Text>
          <TextInput
            // Remounts on switch so the keyboard and autofill hints reset.
            key={method}
            style={[
              globalStyles.input,
              !isPhone && styles.inputEmail,
              focused && globalStyles.inputActive,
              error != null && globalStyles.inputError,
            ]}
            placeholder={isPhone ? '+91 98765 43210' : 'you@example.com'}
            placeholderTextColor={colors.border}
            keyboardType={isPhone ? 'phone-pad' : 'email-address'}
            autoComplete={isPhone ? 'tel' : 'email'}
            textContentType={isPhone ? 'telephoneNumber' : 'emailAddress'}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            maxLength={isPhone ? PHONE_INPUT_MAX_LENGTH : undefined}
            value={value}
            onChangeText={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              setError(validate(value));
            }}
            onSubmitEditing={() => {
              handleSubmit();
            }}
            editable={!isSubmitting}
            returnKeyType="go"
          />
          <Text style={globalStyles.errorText}>{error ?? ''}</Text>
        </View>

        <TouchableOpacity
          style={[globalStyles.button, isReady && globalStyles.buttonReady]}
          onPress={() => {
            handleSubmit();
          }}
          disabled={isSubmitting}
          activeOpacity={0.9}
        >
          <Text style={globalStyles.buttonText}>
            {isSubmitting ? submittingLabel : submitLabel}
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{footerText}</Text>
          <TouchableOpacity onPress={onFooterAction} accessibilityRole="button">
            <Text style={styles.footerLink}>{footerActionLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export default AuthForm;
