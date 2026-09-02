import { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, Text, TextInput, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { scaleStyles as styles, stepperStyles } from './Questionnaire.styles';

/** Matches `scaleStyles.thumb`; the arithmetic below needs it as a number. */
const THUMB = 32;

type StepButtonProps = {
  /** "−" or "+". Understood everywhere, and labelled all the same. */
  glyph: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

/**
 * One press of a stepper. Shared by the scale and the time picker, which are
 * the two places in this app where a value is set by nudging rather than typing.
 */
export function StepButton({
  glyph,
  label,
  onPress,
  disabled,
}: StepButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        stepperStyles.button,
        pressed && stepperStyles.buttonPressed,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <Text style={stepperStyles.glyph}>{glyph}</Text>
    </Pressable>
  );
}

type Props = {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  /** What one press of - or + is worth. */
  step: number;
  /** What the low end of the scale means, in words. */
  minLabel: string;
  /** What the high end means. */
  maxLabel: string;
  /** Read out in place of the question when the track takes focus. */
  accessibilityLabel: string;
  disabled?: boolean;
};

/**
 * A 0-100 scale with three ways in: drag the track, press - or +, or tap the
 * number and type it.
 *
 * The three are not decoration. A drag is a gesture, and this project never
 * lets a gesture be the only way to do something - so the steppers carry the
 * same answer for a hand that can't drag accurately, and the field carries it
 * for anyone who already knows the number they mean.
 */
export function Scale({
  value,
  onChange,
  min,
  max,
  step,
  minLabel,
  maxLabel,
  accessibilityLabel,
  disabled,
}: Props) {
  const [width, setWidth] = useState(0);
  /**
   * What the field shows while it is being typed into, which is not always a
   * value yet - clearing it to type "80" passes through empty, and an empty
   * field can't be a number on the scale.
   */
  const [typed, setTyped] = useState<string | null>(null);

  const clamp = (next: number) =>
    Math.min(max, Math.max(min, Math.round(next)));

  /**
   * The thumb's travel, which is the track less its own width: the thumb is
   * drawn inside the track, so its centre runs from half a thumb in to half a
   * thumb short of the end rather than corner to corner.
   */
  const usable = Math.max(1, width - THUMB);
  const ratio = (value - min) / (max - min);

  // Read by the pan responder, which is created once and would otherwise be
  // holding the first render's width and callback forever.
  const latest = useRef<(x: number) => void>(() => {});
  latest.current = (x: number) => {
    if (disabled || width === 0) {
      return;
    }
    onChange(clamp(min + ((x - THUMB / 2) / usable) * (max - min)));
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // The fill and the thumb take no touches of their own (see their
        // `pointerEvents` below), so the track is always the touch target and
        // `locationX` is measured from its left edge on press and on drag alike.
        onPanResponderGrant: event =>
          latest.current(event.nativeEvent.locationX),
        onPanResponderMove: event => latest.current(event.nativeEvent.locationX),
      }),
    [],
  );

  const handleLayout = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width);

  const handleType = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 3);
    if (digits === '') {
      setTyped('');
      return;
    }
    // Clamped as it is typed rather than on blur, so the field never shows a
    // number the scale can't hold.
    const next = clamp(Number(digits));
    setTyped(`${next}`);
    onChange(next);
  };

  const nudge = (delta: number) => onChange(clamp(value + delta));

  return (
    <View>
      <View style={styles.readoutRow}>
        <StepButton
          glyph="−"
          label={`Decrease by ${step}`}
          onPress={() => nudge(-step)}
          disabled={disabled || value <= min}
        />

        <View style={styles.readout}>
          <TextInput
            style={styles.input}
            value={typed ?? `${value}`}
            onChangeText={handleType}
            // Typing replaces the value rather than appending to it - tapping
            // "50" and typing 8 should mean 8, not 508.
            selectTextOnFocus
            onBlur={() => setTyped(null)}
            keyboardType="number-pad"
            maxLength={3}
            editable={!disabled}
            accessibilityLabel={`${accessibilityLabel}, type a number`}
          />
          <Text style={styles.percent}>%</Text>
        </View>

        <StepButton
          glyph="+"
          label={`Increase by ${step}`}
          onPress={() => nudge(step)}
          disabled={disabled || value >= max}
        />
      </View>

      <View
        style={styles.trackArea}
        onLayout={handleLayout}
        {...responder.panHandlers}
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ min, max, now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={event =>
          nudge(event.nativeEvent.actionName === 'increment' ? step : -step)
        }
      >
        <View style={styles.track} pointerEvents="none" />
        <View
          style={[styles.fill, { width: THUMB / 2 + ratio * usable }]}
          pointerEvents="none"
        />
        <View
          style={[styles.thumb, { left: ratio * usable }]}
          pointerEvents="none"
        />
      </View>

      {/* What the two ends mean, said in words rather than left to the numbers. */}
      <View style={styles.endRow}>
        <Text style={styles.endLabel}>{minLabel}</Text>
        <Text style={[styles.endLabel, styles.endLabelRight]}>{maxLabel}</Text>
      </View>
    </View>
  );
}
