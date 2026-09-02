import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { colors } from '../../theme';
import { MINUTE_STEP, formatTime12 } from '../../utils/date';
import type { TimeOfDay } from '../../utils/date';
import { NUMBER, dialMetrics, styles } from './TimePicker.styles';

/** Which half of the time the dial is setting. */
type Part = 'hour' | 'minute';

/** How the time is being given: by the clock face, or typed. */
type Entry = 'dial' | 'keyboard';

type Meridiem = 'AM' | 'PM';

const MERIDIEMS: readonly Meridiem[] = ['AM', 'PM'];

/** Twelve positions to a ring, so one step round it is thirty degrees. */
const POSITIONS = 12;
const DEGREES_PER_POSITION = 360 / POSITIONS;

/** The 12-hour clock face back to the 24-hour value that is actually stored. */
function to24Hour(hour12: number, meridiem: Meridiem): number {
  const base = hour12 % 12;
  return meridiem === 'AM' ? base : base + 12;
}

/** Midnight and noon are both "12" on the face. */
function to12Hour(hour24: number): number {
  return hour24 % 12 === 0 ? 12 : hour24 % 12;
}

function pad(value: number): string {
  return `${value}`.padStart(2, '0');
}

/**
 * Where a number sits on the ring, measured clockwise from twelve o'clock.
 * Screen coordinates run down the y axis, which is why the quarter turn is
 * subtracted rather than added.
 */
function pointOnRing(degrees: number, radius: number, center: number) {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return {
    x: center + radius * Math.cos(radians),
    y: center + radius * Math.sin(radians),
  };
}

type Props = {
  visible: boolean;
  /** The time the dial opens on. */
  value: TimeOfDay;
  /** Named in the card's heading, e.g. "Select wake-up time". */
  title: string;
  /** Only ever called from OK - the dial moving is not yet an answer. */
  onSelect: (value: TimeOfDay) => void;
  onClose: () => void;
};

/**
 * A clock face: tap a number, or drag the hand round to it.
 *
 * Held in the card's own state until OK, so nothing is answered by a finger
 * passing over it - dragging from 3 to 9 would otherwise set, and announce,
 * every hour in between.
 *
 * The dial is not the only way in. Pointing at a 44pt puck on a ring is real
 * aim, and this app is built for hands that may not have it - so "Type the
 * time" swaps the face for two labelled fields that need none.
 */
function TimePicker({ visible, value, title, onSelect, onClose }: Props) {
  const { width } = useWindowDimensions();
  const { size, center, ring } = dialMetrics(width);

  const [hour, setHour] = useState(() => to12Hour(value.hour));
  const [minute, setMinute] = useState(value.minute);
  const [meridiem, setMeridiem] = useState<Meridiem>(
    value.hour < 12 ? 'AM' : 'PM',
  );
  const [part, setPart] = useState<Part>('hour');
  const [entry, setEntry] = useState<Entry>('dial');

  // Reopening starts from the time in hand rather than from wherever the last
  // visit was left, and always on the hour.
  useEffect(() => {
    if (visible) {
      setHour(to12Hour(value.hour));
      setMinute(value.minute);
      setMeridiem(value.hour < 12 ? 'AM' : 'PM');
      setPart('hour');
      setEntry('dial');
    }
  }, [visible, value]);

  const isHour = part === 'hour';

  /** The twelve pucks of whichever ring is showing. */
  const numbers = useMemo(
    () =>
      Array.from({ length: POSITIONS }, (_, index) => {
        const degrees = (index + 1) * DEGREES_PER_POSITION;
        const point = pointOnRing(degrees, ring, center);
        return {
          // Hours run 1-12; minutes run 00-55 in fives, so twelve o'clock is 0.
          value: isHour ? index + 1 : ((index + 1) % POSITIONS) * MINUTE_STEP,
          left: point.x - NUMBER / 2,
          top: point.y - NUMBER / 2,
        };
      }),
    [isHour, ring, center],
  );

  const handDegrees = isHour
    ? (hour % POSITIONS) * DEGREES_PER_POSITION
    : (minute / 60) * 360;
  const tip = pointOnRing(handDegrees, ring, center);

  // Read by the pan responder, which is created once and would otherwise hold
  // the first render's geometry and mode forever.
  const latest = useRef<(x: number, y: number) => void>(() => {});
  latest.current = (x: number, y: number) => {
    let degrees =
      (Math.atan2(y - center, x - center) * 180) / Math.PI + 90;
    if (degrees < 0) {
      degrees += 360;
    }
    const position = Math.round(degrees / DEGREES_PER_POSITION) % POSITIONS;
    if (isHour) {
      setHour(position === 0 ? POSITIONS : position);
    } else {
      // Snapped to the numbers actually printed on the ring; a minute between
      // them is reachable by typing, where it can be meant rather than landed on.
      setMinute(position * MINUTE_STEP);
    }
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // The hand and the numbers take no touches of their own, so the face is
        // always the touch target and these are measured from its top left.
        onPanResponderGrant: event =>
          latest.current(
            event.nativeEvent.locationX,
            event.nativeEvent.locationY,
          ),
        onPanResponderMove: event =>
          latest.current(
            event.nativeEvent.locationX,
            event.nativeEvent.locationY,
          ),
        // Choosing an hour moves the face on to the minutes, the way a clock
        // picker is expected to. Nothing is lost by it: the hour stays on
        // screen, tapping it comes back, and OK is still unpressed.
        onPanResponderRelease: () => setPart('minute'),
      }),
    [],
  );

  const handleType = (next: Part, raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 2);
    if (digits === '') {
      // Cleared on the way to typing something else; 12 and 00 are the values
      // an empty field falls back to rather than a blank the card can't use.
      if (next === 'hour') {
        setHour(POSITIONS);
      } else {
        setMinute(0);
      }
      return;
    }
    const parsed = Number(digits);
    if (next === 'hour') {
      setHour(Math.min(12, Math.max(1, parsed)));
    } else {
      setMinute(Math.min(59, parsed));
    }
  };

  const picked: TimeOfDay = { hour: to24Hour(hour, meridiem), minute };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        {/*
          Tapping the dimmed area closes, the way a sheet does - as a sibling
          behind the card, not a parent wrapped around it, or it would take the
          touch responder on every drag that began on the dial. Cancel below
          does the same job for anyone who doesn't know the gesture.
        */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />

        <View style={styles.card} accessibilityViewIsModal>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.timeRow}>
            <Pressable
              style={[styles.field, isHour && entry === 'dial' && styles.fieldActive]}
              onPress={() => setPart('hour')}
              accessibilityRole="button"
              accessibilityLabel={`Hour, ${hour}, set the hour`}
              accessibilityState={{ selected: isHour }}
            >
              <Text
                style={[
                  styles.fieldText,
                  isHour && entry === 'dial' && styles.fieldTextActive,
                ]}
              >
                {pad(hour)}
              </Text>
            </Pressable>

            <Text style={styles.colon}>:</Text>

            <Pressable
              style={[
                styles.field,
                !isHour && entry === 'dial' && styles.fieldActive,
              ]}
              onPress={() => setPart('minute')}
              accessibilityRole="button"
              accessibilityLabel={`Minutes, ${minute}, set the minutes`}
              accessibilityState={{ selected: !isHour }}
            >
              <Text
                style={[
                  styles.fieldText,
                  !isHour && entry === 'dial' && styles.fieldTextActive,
                ]}
              >
                {pad(minute)}
              </Text>
            </Pressable>

            <View style={styles.meridiemColumn}>
              {MERIDIEMS.map(option => {
                const isSelected = option === meridiem;
                return (
                  <Pressable
                    key={option}
                    style={[
                      styles.meridiem,
                      isSelected && styles.meridiemSelected,
                    ]}
                    onPress={() => setMeridiem(option)}
                    accessibilityRole="radio"
                    accessibilityLabel={
                      option === 'AM'
                        ? 'Morning, A M'
                        : 'Afternoon or evening, P M'
                    }
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      style={[
                        styles.meridiemText,
                        isSelected && styles.meridiemTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {entry === 'dial' ? (
            <>
              <Text style={styles.dialCaption}>
                {isHour ? 'Choose the hour' : 'Choose the minutes'}
              </Text>

              <View style={styles.dialWrap}>
                <View
                  style={[
                    styles.dial,
                    { width: size, height: size, borderRadius: size / 2 },
                  ]}
                  {...responder.panHandlers}
                  accessibilityRole="adjustable"
                  accessibilityLabel={
                    isHour ? 'Hour dial' : 'Minute dial'
                  }
                  accessibilityValue={{ text: formatTime12(picked) }}
                  accessibilityActions={[
                    { name: 'increment' },
                    { name: 'decrement' },
                  ]}
                  onAccessibilityAction={event => {
                    const step =
                      event.nativeEvent.actionName === 'increment' ? 1 : -1;
                    if (isHour) {
                      setHour(((hour - 1 + step + POSITIONS) % POSITIONS) + 1);
                    } else {
                      setMinute((minute + step * MINUTE_STEP + 60) % 60);
                    }
                  }}
                >
                  <Svg
                    width={size}
                    height={size}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                  >
                    <Line
                      x1={center}
                      y1={center}
                      x2={tip.x}
                      y2={tip.y}
                      stroke={colors.primary}
                      strokeWidth={2}
                    />
                    <Circle cx={center} cy={center} r={4} fill={colors.primary} />
                  </Svg>

                  {/* Drawn over the hand, so the puck covers where it ends.
                      Hidden from screen readers: they cannot aim at a ring, and
                      the dial above and the typed fields both answer for them. */}
                  <View
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  >
                    {numbers.map(number => {
                      const isSelected =
                        number.value === (isHour ? hour : minute);
                      return (
                        <View
                          key={number.value}
                          style={[
                            styles.number,
                            { left: number.left, top: number.top },
                            isSelected && styles.numberSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.numberText,
                              isSelected && styles.numberTextSelected,
                            ]}
                          >
                            {isHour ? number.value : pad(number.value)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.entry}>
              <View style={styles.entryRow}>
                <View style={styles.entryField}>
                  <Text style={styles.entryLabel}>Hour</Text>
                  <TextInput
                    style={styles.entryInput}
                    value={pad(hour)}
                    onChangeText={raw => handleType('hour', raw)}
                    selectTextOnFocus
                    keyboardType="number-pad"
                    maxLength={2}
                    accessibilityLabel="Hour, 1 to 12"
                  />
                </View>
                <View style={styles.entryField}>
                  <Text style={styles.entryLabel}>Minutes</Text>
                  <TextInput
                    style={styles.entryInput}
                    value={pad(minute)}
                    onChangeText={raw => handleType('minute', raw)}
                    selectTextOnFocus
                    keyboardType="number-pad"
                    maxLength={2}
                    accessibilityLabel="Minutes, 0 to 59"
                  />
                </View>
              </View>
              <Text style={styles.entryHint}>
                Hour 1 to 12, minutes 0 to 59. Choose AM or PM above.
              </Text>
            </View>
          )}

          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [
                styles.modeButton,
                pressed && styles.modeButtonPressed,
              ]}
              onPress={() => setEntry(entry === 'dial' ? 'keyboard' : 'dial')}
              accessibilityRole="button"
            >
              <Text style={styles.modeButtonText}>
                {entry === 'dial' ? 'Type the time' : 'Use the clock'}
              </Text>
            </Pressable>

            <View style={styles.footer}>
              <Pressable
                style={({ pressed }) => [
                  styles.action,
                  pressed && styles.actionPressed,
                ]}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Cancel, keep the time unchanged"
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>

              {/* Nothing is set until this is pressed - the dial can be moved
                  about freely, and the time above is what OK will save. */}
              <Pressable
                style={({ pressed }) => [
                  styles.action,
                  pressed && styles.actionPressed,
                ]}
                onPress={() => {
                  onSelect(picked);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityLabel={`OK, set the time to ${formatTime12(picked)}`}
              >
                <Text style={styles.confirmText}>OK</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default TimePicker;
