import type { ReactNode } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { colors } from '../../theme';
import { styles, tone } from './Questionnaire.styles';

type CardProps = {
  question: string;
  /** Short line under the question, e.g. what a term means here. */
  hint?: string;
  children: ReactNode;
  error?: string | null;
};

/** One question, its supporting copy, and whatever answers it takes. */
export function QuestionCard({ question, hint, children, error }: CardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.question}>{question}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

/** The grey aside used where a question needs explaining before it can be answered. */
export function Note({
  title,
  lines,
}: {
  title?: string;
  lines: Array<string | { bullet: string }>;
}) {
  return (
    <View style={styles.note}>
      {title ? <Text style={styles.noteTitle}>{title}</Text> : null}
      {lines.map((line, index) =>
        typeof line === 'string' ? (
          // Anything after the opening paragraph is a closing remark following
          // the bullets, and needs the gap or it reads as one more bullet.
          <Text
            key={index}
            style={[styles.noteText, index > 0 && styles.noteTextAfter]}
          >
            {line}
          </Text>
        ) : (
          <Text key={index} style={styles.noteBullet}>
            {line.bullet}
          </Text>
        ),
      )}
    </View>
  );
}

/** The indented block a "yes" reveals. */
export function FollowUp({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.followUp}>
      {label ? <Text style={styles.followUpLabel}>{label}</Text> : null}
      {children}
    </View>
  );
}

type ChipsProps = {
  options: readonly string[];
  selected: string[];
  onToggle: (option: string) => void;
  disabled?: boolean;
};

/**
 * Multi-select chips. Selection is marked with a tick as well as the fill, so
 * the state doesn't rest on colour alone.
 */
export function ChipGroup({
  options,
  selected,
  onToggle,
  disabled,
}: ChipsProps) {
  return (
    <View style={styles.chipRow}>
      {options.map(option => {
        const isSelected = selected.includes(option);
        return (
          <Pressable
            key={option}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onToggle(option)}
            disabled={disabled}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected, disabled }}
          >
            <Text
              style={[styles.chipText, isSelected && styles.chipTextSelected]}
            >
              {isSelected ? `✓  ${option}` : option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type YesNoProps = {
  value: boolean | null;
  onChange: (value: boolean) => void;
  /**
   * Which answer is the reassuring one. Almost every question here reads the
   * other way round - "yes" is the finding - so this defaults to `no`.
   */
  goodAnswer?: 'yes' | 'no';
  disabled?: boolean;
};

export function YesNo({
  value,
  onChange,
  goodAnswer = 'no',
  disabled,
}: YesNoProps) {
  const answers: Array<{ label: string; answer: boolean }> = [
    { label: 'Yes', answer: true },
    { label: 'No', answer: false },
  ];

  return (
    <View style={styles.yesNoRow}>
      {answers.map(({ label, answer }) => {
        const isSelected = value === answer;
        const palette =
          (goodAnswer === 'yes') === answer ? tone.good : tone.bad;

        return (
          <Pressable
            key={label}
            style={[
              styles.yesNo,
              isSelected && {
                borderColor: palette.border,
                backgroundColor: palette.background,
              },
            ]}
            onPress={() => onChange(answer)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected, disabled }}
          >
            <Text
              style={[styles.yesNoText, isSelected && { color: palette.text }]}
            >
              {isSelected ? `✓  ${label}` : label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type NumberFieldProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Trailing word inside the field, e.g. "years". */
  suffix?: string;
  maxLength?: number;
  /** Uses the tinted treatment for a follow-up field. */
  tinted?: boolean;
  disabled?: boolean;
};

/** Digits only - the caller decides what the number means. */
export function NumberField({
  label,
  value,
  onChange,
  placeholder,
  suffix,
  maxLength = 3,
  tinted,
  disabled,
}: NumberFieldProps) {
  return (
    <View style={styles.numberField}>
      {label ? <Text style={styles.numberLabel}>{label}</Text> : null}
      <View
        style={[
          styles.numberInputRow,
          tinted && styles.numberTinted,
          !tinted && value !== '' && styles.numberInputFilled,
        ]}
      >
        <TextInput
          style={styles.numberInput}
          value={value}
          onChangeText={text => onChange(text.replace(/\D/g, ''))}
          placeholder={placeholder}
          placeholderTextColor={colors.border}
          keyboardType="number-pad"
          maxLength={maxLength}
          editable={!disabled}
        />
        {suffix ? <Text style={styles.numberSuffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

/** One full-width answer in an `AnswerStack`. */
export type Answer<T extends string> = {
  value: T;
  /** The tick or cross that opens the label - it stands for yes or no, not for good or bad. */
  mark: string;
  label: string;
  /** Which way the answer reads. The label already says it; this only tints it. */
  tone: keyof typeof tone;
};

type AnswerStackProps<T extends string> = {
  options: ReadonlyArray<Answer<T>>;
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
};

/**
 * Answers stacked full width, for the questions whose options are sentences.
 *
 * `YesNo` puts its two side by side, which works while they are one word each.
 * These wrap to three lines apiece in half a screen, and the shorter of two
 * wrapped answers reads as the lighter one - so they get a row each instead.
 */
export function AnswerStack<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: AnswerStackProps<T>) {
  return (
    <View style={styles.answerStack}>
      {options.map(option => {
        const isSelected = value === option.value;
        const palette = tone[option.tone];

        return (
          <Pressable
            key={option.value}
            style={[
              styles.answer,
              isSelected && {
                borderColor: palette.border,
                backgroundColor: palette.background,
              },
            ]}
            onPress={() => onChange(option.value)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected, disabled }}
          >
            <Text style={[styles.answerMark, { color: palette.text }]}>
              {option.mark}
            </Text>
            <Text
              style={[styles.answerText, isSelected && { color: palette.text }]}
            >
              {option.label}
            </Text>
            {/* Hollow until chosen, then filled: the state differs in shape as
                well as in colour, so it survives being read without it. */}
            <View
              style={[
                styles.answerDot,
                isSelected && {
                  borderColor: palette.text,
                  backgroundColor: palette.text,
                },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

export { styles as questionStyles } from './Questionnaire.styles';
