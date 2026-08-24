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
  onSubmit: (method: AuthMethod, contact: string) => void;
  /** Prompt shown under the button, e.g. "Don't have an account?". */
  footerText: string;
  footerActionLabel: string;
  onFooterAction: () => void;
};

const METHODS: Array<{ key: AuthMethod; label: string }> = [
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
];

/**
 * The email/phone identity form shared by the login and sign-up screens.
 * Only the copy differs between them, so the behaviour lives here once.
 */
function AuthForm({
  title,
  subtext,
  submitLabel = 'Continue',
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

  const handleSubmit = () => {
    const validationError = validate(value);
    if (validationError) {
      setError(validationError);
      return;
    }
    onSubmit(method, value.trim());
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

          <View style={styles.segmented}>
            {METHODS.map(option => {
              const selected = option.key === method;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.segment, selected && styles.segmentActive]}
                  onPress={() => handleSelectMethod(option.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      selected && styles.segmentTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

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
            onSubmitEditing={handleSubmit}
            returnKeyType="go"
          />
          <Text style={globalStyles.errorText}>{error ?? ''}</Text>
        </View>

        <TouchableOpacity
          style={[globalStyles.button, isReady && globalStyles.buttonReady]}
          onPress={handleSubmit}
          activeOpacity={0.9}
        >
          <Text style={globalStyles.buttonText}>{submitLabel}</Text>
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
