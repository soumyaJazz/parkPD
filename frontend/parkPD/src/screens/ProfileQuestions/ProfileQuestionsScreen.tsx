import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { completeProfile } from '../../api';
import { ProfileQuestionnaire } from '../../components/ProfileQuestionnaire';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSetupDraft } from '../../context/SetupDraftContext';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { globalStyles, minInset } from '../../theme';
import type { QuestionnaireErrors } from '../../types/questionnaire';
import {
  toQuestionnaireAnswers,
  validateQuestionnaire,
} from '../../types/questionnaire';
import { dobToAge } from '../../utils/dob';
import { styles } from './ProfileQuestionsScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileQuestions'>;

function ProfileQuestionsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { updateUser } = useAuth();
  // Held above this screen: a phone number already on another account is only
  // rejected at save time, and fixing it means stepping back to the details -
  // which unmounts this screen. The answers have to outlive that.
  const { draft: answers, setDraft: setAnswers, clearDraft } = useSetupDraft();
  const { details } = route.params;
  const [errors, setErrors] = useState<QuestionnaireErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // A condition can't have been present for longer than the person has lived,
  // so their age is the ceiling on every "for how many years" answer.
  const age = dobToAge(details.dob) ?? 0;

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    const found = validateQuestionnaire(answers, age);
    setErrors(found);
    const unanswered = Object.values(found).filter(Boolean).length;
    if (unanswered > 0) {
      showToast(
        unanswered === 1
          ? 'One question still needs an answer'
          : `${unanswered} questions still need an answer`,
        'They are marked in red below.',
        'warning',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, message } = await completeProfile({
        ...details,
        ...toQuestionnaireAnswers(answers),
      });
      showToast('Profile saved', message);
      // Saved, so the held answers are spent - a later sign-in on this device
      // should start from an empty form, not this one.
      clearDraft();
      // The saved account comes back carrying profile_completed_at, which is
      // what the navigator branches on - handing it to the context is what
      // moves the app past setup. No navigation call: this screen unmounts with
      // the branch that mounted it.
      updateUser(data.user);
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'Could not save your answers. Please try again.';
      showToast(message, undefined, 'error');
    } finally {
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
        <ScrollView
          style={globalStyles.flex}
          contentContainerStyle={styles.content}
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

          <Text style={globalStyles.title}>A few health questions</Text>
          <Text style={[globalStyles.subtext, styles.subtext]}>
            These help us tailor parkPD to you. Take your time - there are no
            wrong answers.
          </Text>

          <ProfileQuestionnaire
            answers={answers}
            setAnswers={setAnswers}
            errors={errors}
            setErrors={setErrors}
            disabled={isSubmitting}
          />

          <TouchableOpacity
            style={[globalStyles.button, globalStyles.buttonReady, styles.submit]}
            onPress={() => {
              handleSubmit();
            }}
            disabled={isSubmitting}
            activeOpacity={0.9}
          >
            <Text style={globalStyles.buttonText}>
              {isSubmitting ? 'Saving...' : 'Finish setup'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

export default ProfileQuestionsScreen;
