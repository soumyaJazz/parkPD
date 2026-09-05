import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import TimePicker, { TimeField } from '../TimePicker';
import { addMinutes, formatDuration, formatTime12 } from '../../utils/date';
import type { TimeOfDay } from '../../utils/date';
import { escapeTone, styles } from './TimeAnswer.styles';

/** The answer that whatever was being asked about never happened. */
export type Escape = {
  label: string;
  /** `good` for "symptoms did not return", `bad` for "no improvement". */
  tone: keyof typeof escapeTone;
  selected: boolean;
  onPress: () => void;
};

type Props = {
  value: TimeOfDay | null;
  onChange: (time: TimeOfDay) => void;
  /** What this time is, in the spoken labels. */
  label: string;
  /** The heading on the clock when it opens. */
  pickerTitle: string;
  /**
   * What the offsets are measured from, and what to call it. Null where there
   * is nothing to measure from - the clock then stands on its own.
   */
  anchor: TimeOfDay | null;
  anchorPhrase: string;
  offsets: readonly number[];
  /** Shown in place of the suggestions when there is nothing to measure from. */
  noAnchorHint: string;
  escape?: Escape;
  disabled?: boolean;
};

/**
 * A time, given either by the clock or by how long after something else it was.
 *
 * The offsets are the quick way, not the only way: every one of these questions
 * opens the same dial the rest of the app uses, so an answer that isn't on the
 * list is no harder to give than one that is. Which tile reads as chosen is
 * worked out from the time itself, so picking 8:15 on the clock lights "+15
 * min" rather than leaving the two disagreeing.
 */
function TimeAnswer({
  value,
  onChange,
  label,
  pickerTitle,
  anchor,
  anchorPhrase,
  offsets,
  noAnchorHint,
  escape,
  disabled,
}: Props) {
  const [isClockOpen, setClockOpen] = useState(false);

  const isSameTime = (a: TimeOfDay, b: TimeOfDay) =>
    a.hour === b.hour && a.minute === b.minute;

  const pick = (time: TimeOfDay) => {
    onChange(time);
    // Naming a time undoes "it never happened" - they are two answers to the
    // same question, and the last one given is the one meant.
    if (escape?.selected) {
      escape.onPress();
    }
  };

  return (
    <View>
      <TimeField
        value={escape?.selected ? null : value}
        onPress={() => setClockOpen(true)}
        label={label}
        disabled={disabled}
      />

      {anchor === null ? (
        <Text style={styles.hint}>{noAnchorHint}</Text>
      ) : (
        <>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR USE SUGGESTIONS</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.grid}>
            {offsets.map(offset => {
              const at = addMinutes(anchor, offset);
              const isSelected =
                !escape?.selected && value !== null && isSameTime(value, at);
              const span =
                offset === 0
                  ? `Immediately ${anchorPhrase}`
                  : `${formatDuration(offset)} ${anchorPhrase}`;

              return (
                <Pressable
                  key={offset}
                  style={[
                    styles.suggestion,
                    isSelected && styles.suggestionSelected,
                  ]}
                  onPress={() => pick(at)}
                  disabled={disabled}
                  accessibilityRole="radio"
                  accessibilityLabel={`${span}, at ${formatTime12(at)}`}
                  accessibilityState={{ selected: isSelected, disabled }}
                >
                  {/* The whole sentence, not a "+30" the reader has to finish
                      in their head - and the clock time underneath, so the tile
                      also answers what that actually works out to. */}
                  <Text
                    style={[styles.offset, isSelected && styles.offsetSelected]}
                  >
                    {isSelected ? `✓  ${span}` : span}
                  </Text>
                  <Text
                    style={[styles.landsAt, isSelected && styles.landsAtSelected]}
                  >
                    {formatTime12(at)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {escape ? (
        <>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={[
              styles.escape,
              { borderColor: escapeTone[escape.tone].border },
              escape.selected && {
                backgroundColor: escapeTone[escape.tone].background,
              },
            ]}
            onPress={escape.onPress}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ selected: escape.selected, disabled }}
          >
            <Text
              style={[
                styles.escapeText,
                { color: escapeTone[escape.tone].text },
              ]}
            >
              {escape.selected ? `✓  ${escape.label}` : escape.label}
            </Text>
          </Pressable>
        </>
      ) : null}

      <TimePicker
        visible={isClockOpen}
        // Opens on the answer in hand, else on the anchor - never on a time
        // that has nothing to do with the question.
        value={value ?? anchor ?? { hour: 8, minute: 0 }}
        title={pickerTitle}
        onSelect={pick}
        onClose={() => setClockOpen(false)}
      />
    </View>
  );
}

export default TimeAnswer;
