import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import TimePicker, { TimeField } from '../TimePicker';
import {
  addMinutes,
  dayOffsetOf,
  describeTooEarly,
  formatDuration,
  formatTime12,
  isInOrder,
  resolveAfter,
} from '../../utils/date';
import type { TimeFloor, TimeOfDay } from '../../utils/date';
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
  /**
   * The latest thing known to have happened before this, which is the earliest
   * this answer may be. Null only where nothing comes before it.
   *
   * Not the same as `anchor`, and often not the same time. The anchor is what
   * the *suggestions* are counted from - a wear-off is offered as so many hours
   * after the dose, because that is how people think of it - while the floor is
   * what the answer has to come *after*, which by then is the peak. When they
   * do coincide the floor keeps quiet, since the suggestions already say it.
   */
  floor?: TimeFloor | null;
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
 *
 * A day runs in one direction, and this is where that is enforced. An answer
 * before the floor is refused as it is given rather than collected and argued
 * with later - the clock closes, the field keeps the time it had, and the
 * message under it says what was chosen, what it clashes with, and what to do
 * instead. Suggestions that would land before the floor are not offered at all,
 * with a line saying why rather than leaving a gap in the list.
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
  floor = null,
  escape,
  disabled,
}: Props) {
  const [isClockOpen, setClockOpen] = useState(false);
  /** Why the last attempt was turned down, or null when nothing was. */
  const [refused, setRefused] = useState<string | null>(null);

  // A refusal is about one floor, so it goes when the floor moves - going back
  // and pushing the dose later is exactly how someone fixes this, and the
  // message would otherwise still be sitting there once they had.
  useEffect(() => {
    setRefused(null);
  }, [floor?.minutes]);

  const isSameTime = (a: TimeOfDay, b: TimeOfDay) =>
    a.hour === b.hour && a.minute === b.minute;

  /** Whether a reading lands on a day after the one being logged. */
  const crossesMidnight = (time: TimeOfDay) =>
    floor !== null && dayOffsetOf(resolveAfter(time, floor.minutes)) > 0;

  const pick = (time: TimeOfDay) => {
    if (floor !== null && !isInOrder(time, floor.minutes)) {
      setRefused(describeTooEarly(time, floor));
      return;
    }
    setRefused(null);
    onChange(time);
    // Naming a time undoes "it never happened" - they are two answers to the
    // same question, and the last one given is the one meant.
    if (escape?.selected) {
      escape.onPress();
    }
  };

  // Kept out of the tiles rather than shown greyed: a suggestion is a shortcut,
  // and one that cannot be taken is not a shortcut but a puzzle. The line below
  // the grid says they were dropped and what the earliest answer is, so nothing
  // simply goes missing.
  const usable =
    anchor === null || floor === null
      ? offsets
      : offsets.filter(offset =>
          isInOrder(addMinutes(anchor, offset), floor.minutes),
        );

  /**
   * Whether the floor has anything to add. When it is the same time the
   * suggestions are counted from, every tile already says it in a full
   * sentence and repeating it underneath is noise.
   */
  const floorWorthSaying =
    floor !== null && (anchor === null || !isSameTime(anchor, floor.time));

  return (
    <View>
      <TimeField
        value={escape?.selected ? null : value}
        onPress={() => setClockOpen(true)}
        label={label}
        disabled={disabled}
      />

      {/* Said in words, because the field shows a clock reading and a clock
          reading cannot say which day it is on. The review screen marks the
          same thing "(next day)" for the same reason. */}
      {floor !== null &&
      !escape?.selected &&
      value !== null &&
      crossesMidnight(value) ? (
        <Text style={styles.nextDay}>
          {`This counts as ${formatTime12(value)} the next morning — after ${
            floor.was
          } at ${formatTime12(floor.time)}.`}
        </Text>
      ) : null}

      {refused !== null ? (
        <View
          style={styles.refused}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.refusedTitle}>That time is too early</Text>
          <Text style={styles.refusedText}>{refused}</Text>
        </View>
      ) : null}

      {floor !== null && floorWorthSaying ? (
        <Text style={styles.floorHint}>
          {`Choose ${formatTime12(floor.time)} or later — that is when ${
            floor.was
          }.`}
        </Text>
      ) : null}

      {anchor === null ? (
        <Text style={styles.hint}>{noAnchorHint}</Text>
      ) : (
        <>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR USE SUGGESTIONS</Text>
            <View style={styles.dividerLine} />
          </View>

          {usable.length === 0 ? (
            <Text style={styles.hint}>
              {`Every suggestion here would be before ${formatTime12(
                floor!.time,
              )}, so please choose this time on the clock above.`}
            </Text>
          ) : (
            <View style={styles.grid}>
              {usable.map(offset => {
                const at = addMinutes(anchor, offset);
                const isSelected =
                  !escape?.selected && value !== null && isSameTime(value, at);
                const span =
                  offset === 0
                    ? `Immediately ${anchorPhrase}`
                    : `${formatDuration(offset)} ${anchorPhrase}`;
                const lands = crossesMidnight(at)
                  ? `${formatTime12(at)} next day`
                  : formatTime12(at);

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
                    accessibilityLabel={`${span}, at ${lands}`}
                    accessibilityState={{ selected: isSelected, disabled }}
                  >
                    {/* The whole sentence, not a "+30" the reader has to finish
                        in their head - and the clock time underneath, so the tile
                        also answers what that actually works out to. */}
                    <Text
                      style={[
                        styles.offset,
                        isSelected && styles.offsetSelected,
                      ]}
                    >
                      {isSelected ? `✓  ${span}` : span}
                    </Text>
                    <Text
                      style={[
                        styles.landsAt,
                        isSelected && styles.landsAtSelected,
                      ]}
                    >
                      {lands}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {usable.length > 0 && usable.length < offsets.length ? (
            <Text style={styles.hint}>
              {`Some suggestions are not shown because they would be before ${formatTime12(
                floor!.time,
              )}.`}
            </Text>
          ) : null}
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
            onPress={() => {
              setRefused(null);
              escape.onPress();
            }}
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
        // Opens on the answer in hand, else on the earliest it may be - never
        // on a time that has nothing to do with the question, and never on one
        // that would be turned down the moment it was confirmed.
        value={value ?? floor?.time ?? anchor ?? { hour: 8, minute: 0 }}
        title={pickerTitle}
        onSelect={pick}
        onClose={() => setClockOpen(false)}
      />
    </View>
  );
}

export default TimeAnswer;
