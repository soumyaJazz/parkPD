import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import DatePicker from '../../components/DatePicker';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { colors, globalStyles, minInset } from '../../theme';
import type { Gender, ProfileDetails } from '../../types/profile';
import {
  ageFromDate,
  ageToDob,
  earliestBirthDate,
  formatDob,
  latestBirthDate,
  parseDob,
  validateDob,
} from '../../utils/dob';
import {
  PHONE_INPUT_MAX_LENGTH,
  formatPhoneNumber,
  normalizeFullName,
  sanitizePhoneNumber,
  validateEmail,
  validateFullName,
  validatePhoneNumber,
} from '../../utils/validation';
import { styles } from './ProfileSetupScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileSetup'>;

const GENDERS: Array<{ key: Gender; label: string }> = [
  { key: 'male', label: 'Male' },
  { key: 'female', label: 'Female' },
];

/** One slot per field that can carry a message, so nothing overwrites another. */
type FieldErrors = {
  fullName: string | null;
  phone: string | null;
  email: string | null;
  gender: string | null;
  /** Covers the age/date-of-birth pair - they resolve to one value. */
  dob: string | null;
};

const NO_ERRORS: FieldErrors = {
  fullName: null,
  phone: null,
  email: null,
  gender: null,
  dob: null,
};

/**
 * The details asked for once, straight after sign-up.
 *
 * Whichever contact detail the account was verified with arrives as a route
 * param and is shown locked - it is the address the code went to, so letting it
 * be edited here would silently detach the account from what was verified. The
 * other one is offered as an optional field.
 */
function ProfileSetupScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { email: verifiedEmail, phone: verifiedPhone } = route.params;

  // Undefined is what "not verified with this" means, and testing it directly
  // is what lets the locked branches below render the value without a cast.
  const emailLocked = verifiedEmail !== undefined;
  const phoneLocked = verifiedPhone !== undefined;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);

  // Age is what the user may type; dob is what gets sent. Each edit writes both
  // from the one that was touched, so they are never separately maintained and
  // can't fall out of step.
  const [age, setAge] = useState('');
  const [dob, setDob] = useState('');

  const [isPickerOpen, setPickerOpen] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>(NO_ERRORS);

  const selectedDate = parseDob(dob);
  const isReady = fullName.trim() !== '' && gender !== null && dob !== '';

  const clearError = (field: keyof FieldErrors) =>
    setErrors(previous => ({ ...previous, [field]: null }));

  /** Typing an age moves the date of birth with it, since the date is derived. */
  const handleAgeChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 3);
    setAge(digits);
    // Clearing the age clears the date it produced - leaving one behind would
    // submit a value with nothing on screen still pointing at it.
    setDob(digits === '' ? '' : ageToDob(Number(digits)));
    clearError('dob');
  };

  /** Picking a date moves the age with it, the same binding in reverse. */
  const handlePickDate = (date: Date) => {
    setDob(formatDob(date));
    setAge(String(ageFromDate(date)));
    clearError('dob');
  };

  const validateAll = (): FieldErrors => ({
    fullName: validateFullName(fullName),
    // Optional: only judged once something has been typed into it.
    phone: !phoneLocked && phone.trim() ? validatePhoneNumber(phone) : null,
    email: !emailLocked && email.trim() ? validateEmail(email) : null,
    gender: gender === null ? 'Select an option' : null,
    dob: validateDob(dob),
  });

  const handleNext = () => {
    const nextErrors = validateAll();
    setErrors(nextErrors);
    // The gender check is already one of the errors above; repeating it is what
    // narrows it away from null for the payload.
    if (gender === null || Object.values(nextErrors).some(m => m !== null)) {
      return;
    }

    // The form's two age inputs collapse to one field here: only `dob` travels.
    const details: ProfileDetails = {
      full_name: normalizeFullName(fullName),
      gender,
      dob,
    };
    // Left out entirely when locked or blank, so the server can tell "not
    // given" from "cleared" and never has to diff against what it already has.
    if (!emailLocked && email.trim()) {
      details.email = email.trim().toLowerCase();
    }
    if (!phoneLocked && phone.trim()) {
      details.phone = phone.trim();
    }

    // Nothing is saved yet. The questionnaire that follows sends both halves
    // in one request, so a run abandoned there leaves no half-filled account
    // behind - and the navigator still owes this screen on the next launch.
    navigation.navigate('ProfileQuestions', { details });
  };

  const renderLocked = (value: string) => (
    <View style={styles.locked}>
      <Text style={styles.lockedValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.lockedBadge}>Verified</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={globalStyles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[
          globalStyles.screen,
          { paddingTop: Math.max(minInset.top, insets.top) },
        ]}
      >
        {/* The indicator is deliberately left on: this form is taller than the
            screen on every phone, and it is the only cue that there is more
            below the fold. The button is no longer down there with it. */}
        <ScrollView
          style={globalStyles.flex}
          contentContainerStyle={styles.content}
          // Without this the first tap on the date field only dismisses the
          // keyboard, and the picker needs a second one.
          keyboardShouldPersistTaps="handled"
        >
          <Text style={globalStyles.title}>Set up your profile</Text>
          <Text style={[globalStyles.subtext, styles.subtext]}>
            A few details so we know who we're saving a space for.
          </Text>

          <Text style={globalStyles.label}>Full name</Text>
          <TextInput
            style={[
              globalStyles.input,
              styles.field,
              errors.fullName !== null && globalStyles.inputError,
            ]}
            placeholder="Ramesh Kumar"
            placeholderTextColor={colors.border}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            autoCorrect={false}
            value={fullName}
            onChangeText={text => {
              setFullName(text);
              clearError('fullName');
            }}
            onBlur={() =>
              setErrors(previous => ({
                ...previous,
                fullName: validateFullName(fullName),
              }))
            }
            returnKeyType="next"
          />
          <Text style={globalStyles.errorText}>{errors.fullName ?? ''}</Text>

          <View style={styles.labelRow}>
            <Text style={globalStyles.label}>Phone number</Text>
            {!phoneLocked && <Text style={styles.optional}>Optional</Text>}
          </View>
          {verifiedPhone !== undefined ? (
            renderLocked(formatPhoneNumber(verifiedPhone))
          ) : (
            <>
              <TextInput
                style={[
                  globalStyles.input,
                  styles.field,
                  errors.phone !== null && globalStyles.inputError,
                ]}
                placeholder="+91 98765 43210"
                placeholderTextColor={colors.border}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                maxLength={PHONE_INPUT_MAX_LENGTH}
                value={phone}
                onChangeText={text => {
                  setPhone(sanitizePhoneNumber(text));
                  clearError('phone');
                }}
                onBlur={() =>
                  setErrors(previous => ({
                    ...previous,
                    phone: phone.trim() ? validatePhoneNumber(phone) : null,
                  }))
                }
              />
              <Text style={globalStyles.errorText}>{errors.phone ?? ''}</Text>
            </>
          )}

          <View style={styles.labelRow}>
            <Text style={globalStyles.label}>Email address</Text>
            {!emailLocked && <Text style={styles.optional}>Optional</Text>}
          </View>
          {verifiedEmail !== undefined ? (
            renderLocked(verifiedEmail)
          ) : (
            <>
              <TextInput
                style={[
                  globalStyles.input,
                  styles.field,
                  errors.email !== null && globalStyles.inputError,
                ]}
                placeholder="you@example.com"
                placeholderTextColor={colors.border}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={text => {
                  setEmail(text);
                  clearError('email');
                }}
                onBlur={() =>
                  setErrors(previous => ({
                    ...previous,
                    email: email.trim() ? validateEmail(email) : null,
                  }))
                }
              />
              <Text style={globalStyles.errorText}>{errors.email ?? ''}</Text>
            </>
          )}

          <Text style={globalStyles.label}>Gender</Text>
          <View style={styles.chipRow}>
            {GENDERS.map(option => {
              const selected = option.key === gender;
              return (
                <Pressable
                  key={option.key}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => {
                    setGender(option.key);
                    clearError('gender');
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selected && styles.chipTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={globalStyles.errorText}>{errors.gender ?? ''}</Text>

          <Text style={globalStyles.label}>Age</Text>
          <TextInput
            style={[
              globalStyles.input,
              styles.field,
              errors.dob !== null && globalStyles.inputError,
            ]}
            placeholder="23"
            placeholderTextColor={colors.border}
            keyboardType="number-pad"
            maxLength={3}
            value={age}
            onChangeText={handleAgeChange}
            onBlur={() =>
              setErrors(previous => ({
                ...previous,
                // Nothing typed is the picker's turn, not an error yet.
                dob: age === '' ? null : validateDob(dob),
              }))
            }
          />
          {/* The one message the pair can produce: only the age field can reach
              an out-of-range date, since the picker won't offer one. */}
          <Text style={globalStyles.errorText}>{errors.dob ?? ''}</Text>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.orLine} />
          </View>

          <Text style={globalStyles.label}>Date of birth</Text>
          <Pressable
            style={[styles.dateField, dob !== '' && styles.dateFieldFilled]}
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={
              dob === '' ? 'Pick your date of birth' : `Date of birth ${dob}`
            }
          >
            <Text style={dob === '' ? styles.datePlaceholder : styles.dateValue}>
              {dob === '' ? 'DD/MM/YYYY' : dob}
            </Text>
            <Text style={styles.dateAction}>
              {dob === '' ? 'Pick' : 'Change'}
            </Text>
          </Pressable>
          <Text style={styles.hint}>
            Filling in either one sets the other. Your date of birth is what we
            save - an age on its own lands on 1 January of that year.
          </Text>

          {/* Inside the scroll, not pinned over it. Pinned, it sat on top of the
              date field - the last thing the form asks for - so the page looked
              finished while a required field was still hidden underneath. Here
              the button is the end of the content, and reaching it means having
              scrolled past every field. */}
        </ScrollView>

        {/* Pinned, not the last thing in the scroll. Measured on an iPhone 17
            Pro, this form is 887pt of content in a 778pt window - so the one
            control that finishes the screen sat 109 points below the fold,
            with the scroll indicator as its only advertisement. Behind the
            keyboard it was further still. */}
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(minInset.bottom, insets.bottom) },
          ]}
        >
          <TouchableOpacity
            style={[
              globalStyles.button,
              isReady && globalStyles.buttonReady,
            ]}
            onPress={() => {
              handleNext();
            }}
            activeOpacity={0.9}
          >
            <Text style={globalStyles.buttonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>

      <DatePicker
        visible={isPickerOpen}
        value={selectedDate}
        minDate={earliestBirthDate()}
        maxDate={latestBirthDate()}
        onSelect={handlePickDate}
        onClose={() => setPickerOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}

export default ProfileSetupScreen;
