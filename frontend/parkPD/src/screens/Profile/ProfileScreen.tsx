import { useEffect, useRef, useState } from 'react';
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
import { updateProfile } from '../../api';
import ConfirmDialog from '../../components/ConfirmDialog';
import DatePicker from '../../components/DatePicker';
import { ProfileQuestionnaire } from '../../components/ProfileQuestionnaire';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { colors, globalStyles, minInset } from '../../theme';
import type { AuthMethod } from '../../types/auth';
import type { Gender } from '../../types/profile';
import type {
  QuestionnaireDraft,
  QuestionnaireErrors,
} from '../../types/questionnaire';
import {
  toQuestionnaireAnswers,
  toQuestionnaireDraft,
  validateQuestionnaire,
} from '../../types/questionnaire';
import {
  ageFromDate,
  ageToDob,
  dobToAge,
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
import { LockedDetail } from './parts';
import { styles } from './ProfileScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

const GENDERS: Array<{ key: Gender; label: string }> = [
  { key: 'male', label: 'Male' },
  { key: 'female', label: 'Female' },
];

/** The details half of the form, as one value so it can be compared wholesale. */
type Details = {
  fullName: string;
  email: string;
  phone: string;
  gender: Gender | null;
  /** What the user may type; `dob` is what is sent. The two move together. */
  age: string;
  /** DD/MM/YYYY. */
  dob: string;
};

/** One slot per field that can carry a message, so nothing overwrites another. */
type DetailErrors = {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  /** Covers the age/date-of-birth pair - they resolve to one value. */
  dob: string | null;
};

const NO_ERRORS: DetailErrors = {
  fullName: null,
  email: null,
  phone: null,
  gender: null,
  dob: null,
};

/**
 * The profile, reopened.
 *
 * Everything setup asked for is here and editable, apart from one thing: the
 * detail a sign-in code is actually sent to. That one is what the account is,
 * so changing it here would hand the account to a destination nobody has
 * proved they can read. It is shown, locked, with the reason next to it.
 *
 * Which of the two that is comes from the account - `verified_with` - not from
 * an assumption about how people sign up, so an account made with a mobile
 * number locks the number and leaves the address editable.
 *
 * Nothing is fetched. `GET /auth/me` already returns the whole row, clinical
 * answers included, and the auth context has been holding it since launch - so
 * the form opens filled in, with no wait and nothing to fail.
 */
function ProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();

  // Seeded once, lazily. Re-reading the account on every render would undo a
  // half-typed field the moment anything else on the screen changed.
  /** Which detail proved the account, and so which one this screen locks. */
  const verified: AuthMethod = user?.verified_with ?? 'email';

  const [original] = useState(() => ({
    details: {
      fullName: user?.full_name ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      gender: user?.gender ?? null,
      age: user?.dob ? String(dobToAge(user.dob) ?? '') : '',
      dob: user?.dob ?? '',
    } as Details,
    answers: toQuestionnaireDraft(user ?? {}),
  }));

  const [details, setDetails] = useState<Details>(original.details);
  const [answers, setAnswers] = useState<QuestionnaireDraft>(original.answers);
  const [detailErrors, setDetailErrors] = useState<DetailErrors>(NO_ERRORS);
  const [errors, setErrors] = useState<QuestionnaireErrors>({});

  const [isPickerOpen, setPickerOpen] = useState(false);
  const [isSaving, setSaving] = useState(false);
  /** The back this screen interrupted, held until the user says what to do. */
  const [pendingExit, setPendingExit] = useState<(() => void) | null>(null);

  /**
   * True once the save has gone through, so the guard below stops guarding.
   * A ref rather than state: leaving happens in the same tick, before a state
   * update would have landed.
   */
  const isLeaving = useRef(false);

  const isDirty =
    JSON.stringify({ details, answers }) !== JSON.stringify(original);

  /**
   * Leaving with changes asks first.
   *
   * On `beforeRemove` rather than on the back button, because the back button
   * is not the only way out: the Android hardware back and the swipe-back
   * gesture both land here too, and losing twenty answers to a stray swipe is
   * exactly the kind of thing this screen must not do.
   */
  useEffect(
    () =>
      navigation.addListener('beforeRemove', event => {
        if (!isDirty || isLeaving.current) {
          return;
        }
        event.preventDefault();
        setPendingExit(() => () => navigation.dispatch(event.data.action));
      }),
    [navigation, isDirty],
  );

  const set = <K extends keyof Details>(key: K, value: Details[K]) =>
    setDetails(previous => ({ ...previous, [key]: value }));

  const clearError = (field: keyof DetailErrors) =>
    setDetailErrors(previous => ({ ...previous, [field]: null }));

  /** Typing an age moves the date of birth with it, since the date is derived. */
  const handleAgeChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 3);
    setDetails(previous => ({
      ...previous,
      age: digits,
      // Clearing the age clears the date it produced - leaving one behind would
      // save a value with nothing on screen still pointing at it.
      dob: digits === '' ? '' : ageToDob(Number(digits)),
    }));
    clearError('dob');
  };

  /** Picking a date moves the age with it, the same binding in reverse. */
  const handlePickDate = (date: Date) => {
    setDetails(previous => ({
      ...previous,
      dob: formatDob(date),
      age: String(ageFromDate(date)),
    }));
    clearError('dob');
  };

  const validateDetails = (): DetailErrors => ({
    fullName: validateFullName(details.fullName),
    // Only the editable one is judged, and only once something has been typed
    // into it: an account carrying just the detail it was verified with is a
    // complete account. The locked one is never sent, so there is nothing here
    // for it to fail.
    email:
      verified === 'email' || details.email.trim() === ''
        ? null
        : validateEmail(details.email),
    phone:
      verified === 'phone' || details.phone.trim() === ''
        ? null
        : validatePhoneNumber(details.phone),
    gender: details.gender === null ? 'Select an option' : null,
    dob: validateDob(details.dob),
  });

  const handleSave = async () => {
    if (isSaving) {
      return;
    }

    const foundDetails = validateDetails();
    setDetailErrors(foundDetails);
    // A condition can't have been present for longer than the person has
    // lived, so the age on this form is the ceiling on every "how many years".
    const age = dobToAge(details.dob) ?? 0;
    const foundAnswers = validateQuestionnaire(answers, age);
    setErrors(foundAnswers);

    const unanswered =
      Object.values(foundDetails).filter(Boolean).length +
      Object.values(foundAnswers).filter(Boolean).length;
    if (unanswered > 0 || details.gender === null) {
      showToast(
        unanswered === 1
          ? 'One question still needs an answer'
          : `${unanswered} questions still need an answer`,
        'They are marked in red below.',
        'warning',
      );
      return;
    }

    setSaving(true);
    try {
      const { data, message } = await updateProfile({
        full_name: normalizeFullName(details.fullName),
        gender: details.gender,
        dob: details.dob,
        // Only the editable one travels. Null, not an empty string: it is how
        // the server is told to drop what it holds, which is different again
        // from not mentioning it - which is what the locked one gets.
        ...(verified === 'email'
          ? { phone: details.phone.trim() === '' ? null : details.phone.trim() }
          : {
              email:
                details.email.trim() === ''
                  ? null
                  : details.email.trim().toLowerCase(),
            }),
        ...toQuestionnaireAnswers(answers),
      });
      // Held by the context, so every screen showing a name or a dose mode is
      // reading the saved version from here on.
      updateUser(data.user);
      showToast('Profile saved', message);
      // Past the guard: what is on screen is what the server has.
      isLeaving.current = true;
      navigation.goBack();
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : 'Could not save your profile. Please try again.';
      showToast(message, undefined, 'error');
    } finally {
      setSaving(false);
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
          { paddingTop: Math.max(minInset.top, insets.top) },
        ]}
      >
        <ScrollView
          style={globalStyles.flex}
          contentContainerStyle={styles.content}
          // Without this the first tap on the date field only dismisses the
          // keyboard, and the picker needs a second one.
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={navigation.goBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <View style={styles.chevron} />
          </TouchableOpacity>

          <Text style={globalStyles.title}>Your profile</Text>
          <Text style={[globalStyles.subtext, styles.subtext]}>
            Change anything here and press Save changes at the bottom.
          </Text>

          <Text style={[styles.section, styles.sectionFirst]}>
            Your details
          </Text>

          {/* One of these two is the account itself and one is a detail it
              merely holds, and which is which is not a thing this screen gets
              to decide - it reads it off `verified_with`. */}
          <Text style={globalStyles.label}>Email address</Text>
          {verified === 'email' ? (
            <LockedDetail
              value={user?.email ?? 'Not given yet'}
              badge="Verified"
              reason="This is where your sign-in code is sent, so it cannot be changed here. Please contact your care team to move your account to a different address."
            />
          ) : (
            <>
              <TextInput
                style={[
                  globalStyles.input,
                  styles.field,
                  detailErrors.email !== null && globalStyles.inputError,
                ]}
                placeholder="you@example.com"
                placeholderTextColor={colors.border}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSaving}
                value={details.email}
                onChangeText={text => {
                  set('email', text);
                  clearError('email');
                }}
                onBlur={() =>
                  setDetailErrors(previous => ({
                    ...previous,
                    email: details.email.trim()
                      ? validateEmail(details.email)
                      : null,
                  }))
                }
              />
              <Text style={globalStyles.errorText}>
                {detailErrors.email ?? ''}
              </Text>
              <Text style={styles.hint}>
                Leave this empty if you would rather we did not keep your email
                address.
              </Text>
            </>
          )}

          <Text style={globalStyles.label}>Full name</Text>
          <TextInput
            style={[
              globalStyles.input,
              styles.field,
              detailErrors.fullName !== null && globalStyles.inputError,
            ]}
            placeholder="Ramesh Kumar"
            placeholderTextColor={colors.border}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            autoCorrect={false}
            editable={!isSaving}
            value={details.fullName}
            onChangeText={text => {
              set('fullName', text);
              clearError('fullName');
            }}
            onBlur={() =>
              setDetailErrors(previous => ({
                ...previous,
                fullName: validateFullName(details.fullName),
              }))
            }
          />
          <Text style={globalStyles.errorText}>
            {detailErrors.fullName ?? ''}
          </Text>

          <Text style={globalStyles.label}>Phone number</Text>
          {verified === 'phone' ? (
            <LockedDetail
              value={
                user?.phone ? formatPhoneNumber(user.phone) : 'Not given yet'
              }
              badge="Verified"
              reason="This is where your sign-in code is sent, so it cannot be changed here. Please contact your care team to move your account to a different number."
            />
          ) : (
            <>
              <TextInput
                style={[
                  globalStyles.input,
                  styles.field,
                  detailErrors.phone !== null && globalStyles.inputError,
                ]}
                placeholder="+91 98765 43210"
                placeholderTextColor={colors.border}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                maxLength={PHONE_INPUT_MAX_LENGTH}
                editable={!isSaving}
                value={details.phone}
                onChangeText={text => {
                  set('phone', sanitizePhoneNumber(text));
                  clearError('phone');
                }}
                onBlur={() =>
                  setDetailErrors(previous => ({
                    ...previous,
                    phone: details.phone.trim()
                      ? validatePhoneNumber(details.phone)
                      : null,
                  }))
                }
              />
              <Text style={globalStyles.errorText}>
                {detailErrors.phone ?? ''}
              </Text>
              <Text style={styles.hint}>
                Leave this empty if you would rather we did not keep your
                number.
              </Text>
            </>
          )}

          <Text style={globalStyles.label}>Gender</Text>
          <View style={styles.chipRow}>
            {GENDERS.map(option => {
              const selected = option.key === details.gender;
              return (
                <Pressable
                  key={option.key}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => {
                    set('gender', option.key);
                    clearError('gender');
                  }}
                  disabled={isSaving}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: isSaving }}
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
          <Text style={globalStyles.errorText}>
            {detailErrors.gender ?? ''}
          </Text>

          <Text style={globalStyles.label}>Age</Text>
          <TextInput
            style={[
              globalStyles.input,
              styles.field,
              detailErrors.dob !== null && globalStyles.inputError,
            ]}
            placeholder="23"
            placeholderTextColor={colors.border}
            keyboardType="number-pad"
            maxLength={3}
            editable={!isSaving}
            value={details.age}
            onChangeText={handleAgeChange}
            onBlur={() =>
              setDetailErrors(previous => ({
                ...previous,
                // Nothing typed is the picker's turn, not an error yet.
                dob: details.age === '' ? null : validateDob(details.dob),
              }))
            }
          />
          {/* The one message the pair can produce: only the age field can reach
              an out-of-range date, since the picker won't offer one. */}
          <Text style={globalStyles.errorText}>{detailErrors.dob ?? ''}</Text>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.orLine} />
          </View>

          <Text style={globalStyles.label}>Date of birth</Text>
          <Pressable
            style={[
              styles.dateField,
              details.dob !== '' && styles.dateFieldFilled,
            ]}
            onPress={() => setPickerOpen(true)}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel={
              details.dob === ''
                ? 'Pick your date of birth'
                : `Date of birth ${details.dob}`
            }
          >
            <Text
              style={
                details.dob === '' ? styles.datePlaceholder : styles.dateValue
              }
            >
              {details.dob === '' ? 'DD/MM/YYYY' : details.dob}
            </Text>
            <Text style={styles.dateAction}>
              {details.dob === '' ? 'Pick' : 'Change'}
            </Text>
          </Pressable>
          <Text style={styles.hint}>
            Filling in either one sets the other. Your date of birth is what we
            save - an age on its own lands on 1 January of that year.
          </Text>

          <Text style={styles.section}>Your health answers</Text>

          <ProfileQuestionnaire
            answers={answers}
            setAnswers={setAnswers}
            errors={errors}
            setErrors={setErrors}
            disabled={isSaving}
          />
        </ScrollView>

        {/* Pinned. Twenty questions is a long way to scroll back down to find
            the one control that keeps any of the answers. */}
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(minInset.bottom, insets.bottom) },
          ]}
        >
          <TouchableOpacity
            style={[globalStyles.button, isDirty && globalStyles.buttonReady]}
            onPress={() => {
              handleSave();
            }}
            disabled={isSaving}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityState={{ disabled: isSaving }}
          >
            <Text style={globalStyles.buttonText}>
              {isSaving ? 'Saving...' : 'Save changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <DatePicker
        visible={isPickerOpen}
        value={parseDob(details.dob)}
        minDate={earliestBirthDate()}
        maxDate={latestBirthDate()}
        onSelect={handlePickDate}
        onClose={() => setPickerOpen(false)}
      />

      {/* Names what is lost rather than asking "are you sure?" - the changes on
          screen are the thing at stake, and nothing else on this screen is. */}
      <ConfirmDialog
        visible={pendingExit !== null}
        title="Leave without saving?"
        message="The changes you made to your profile will not be kept."
        confirmLabel="Leave without saving"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => {
          const leave = pendingExit;
          setPendingExit(null);
          leave?.();
        }}
        onCancel={() => setPendingExit(null)}
      />
    </KeyboardAvoidingView>
  );
}

export default ProfileScreen;
