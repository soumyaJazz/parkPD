import { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  Text,
  View,
} from 'react-native';
import { noticeStyles as styles } from './TimePicker.styles';

/**
 * How long the notice stays up before closing itself.
 *
 * Much longer than the few seconds a notification is usually given. This one
 * asks a question, so the time it takes to read the time, work out whether it
 * is right, and reach a button is the time it has to stay - and it closes on
 * its own only into the AM/PM buttons it is about, which are still one tap
 * away afterwards. Both answers are also given as buttons here, so nobody has
 * to wait it out to be rid of it.
 */
const VISIBLE_MS = 12000;

/** Well under the project's 300ms ceiling, and skipped entirely if motion is off. */
const FADE_MS = 200;

type Props = {
  /** The time as it now reads, e.g. "7:30 PM". */
  time: string;
  /** "No" - puts the clock back on the morning. */
  onUseMorning: () => void;
  /** "Yes", and what the timer does when it runs out. */
  onKeep: () => void;
};

/**
 * The warning raised when a time that should be a morning is set to PM.
 *
 * AM and PM are two buttons a few millimetres apart that look alike and read
 * alike, and getting the wrong one turns a 7 AM waking into a 7 PM one - a
 * mistake the number on screen doesn't look wrong enough to catch. So the
 * notice says the time back in words, and answers it in full sentences rather
 * than leaving the fix to be found back on the toggle.
 *
 * It sits over the clock face, which nothing here depends on, so the reading
 * and the OK button underneath stay visible and the card never changes size.
 */
function PmNotice({ time, onUseMorning, onKeep }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  // Read through a ref so the timer is set once, on the way in, rather than
  // restarted by every re-render the dial causes underneath it.
  const keep = useRef(onKeep);
  keep.current = onKeep;

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduced => {
        if (live) {
          Animated.timing(opacity, {
            toValue: 1,
            duration: reduced ? 0 : FADE_MS,
            useNativeDriver: true,
          }).start();
        }
      })
      // Nothing here is worth a blank notice if the query isn't answered.
      .catch(() => opacity.setValue(1));

    const timer = setTimeout(() => keep.current(), VISIBLE_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.notice, { opacity }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.accent} />

      <Text style={styles.title}>You chose PM. Is that right?</Text>
      <Text style={styles.message}>
        {`PM means afternoon or evening, so this now reads as ${time}. Choose AM if you woke up in the morning.`}
      </Text>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.fix,
          pressed && styles.fixPressed,
        ]}
        onPress={onUseMorning}
        accessibilityRole="button"
        accessibilityLabel="No, I woke up in the morning. Change to A M"
      >
        <Text style={styles.fixText}>No, change to AM</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.keep,
          pressed && styles.keepPressed,
        ]}
        onPress={onKeep}
        accessibilityRole="button"
        accessibilityLabel={`Yes, keep P M. The time stays ${time}`}
      >
        <Text style={styles.keepText}>Yes, keep PM</Text>
      </Pressable>
    </Animated.View>
  );
}

export default PmNotice;
