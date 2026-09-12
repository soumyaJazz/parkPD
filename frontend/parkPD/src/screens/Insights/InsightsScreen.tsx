import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchDayInsights, fetchDayStatuses } from '../../api';
import Icon from '../../components/Icon';
import MonthCalendar from '../../components/MonthCalendar';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { colors, minInset, spacing } from '../../theme';
import type { DayStatusMap } from '../../types/dailyLog';
import type { DayInsights } from '../../types/insights';
import {
  dayKey,
  formatFullDate,
  monthRange,
  parseDayKey,
  startOfDay,
} from '../../utils/date';
import { dobToAge } from '../../utils/dob';
import { useAppWidth } from '../../utils/useAppWidth';
import {
  buildChart,
  buildPeriods,
  chartAccessibilityLabel,
  describeChart,
  describeTotals,
} from './chart';
import { ActivityChart, Notice, PatternKey, Periods, Totals } from './parts';
import { styles } from './InsightsScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Insights'>;

/**
 * The screen's own gutter plus the card's, doubled - what is left is what the
 * chart is drawn inside. Measured rather than given as a percentage for the
 * reason `useAppWidth` exists: the web build is capped at a phone's width
 * however wide the browser is.
 */
const CHART_INSET = (spacing.lg + spacing.lg) * 2;

/**
 * The same arithmetic the log screen does for its calendar: the screen's own
 * gutter plus the calendar card's padding, on both sides. What is left is what
 * the seven columns are divided out of.
 */
const CALENDAR_INSET = (spacing.lg + spacing.md) * 2;

/**
 * One day's medicine, read as a line.
 *
 * The last day logged, for now. Which day that is, only the server knows - the
 * phone would have to ask which days carry logs and then ask again - so it asks
 * for "the latest" in one request and is told which day it got.
 *
 * Nothing clinical is decided here or anywhere else on the phone. Which stretch
 * of the day was on, transition or off comes from three database views (see
 * `db/005_activity_state_views.sql`), so this screen, the totals under it and
 * anything built on the same numbers later cannot disagree with each other.
 *
 * The chart is never the only way to read this. Every stretch it draws is also
 * written out underneath in words, with its exact times - which the axis has no
 * room for anyway, and which is the only form of this a screen reader can
 * follow.
 */
function InsightsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const width = useAppWidth();

  /**
   * Which day is being asked for, or null for "whichever was logged last".
   *
   * Null is where the screen starts, because only the server knows which day
   * that is. Picking a day from the calendar fills it in, and from then on the
   * screen asks for that day by name.
   */
  const [date, setDate] = useState<string | null>(null);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [month, setMonth] = useState(() => startOfDay(new Date()));
  const [statuses, setStatuses] = useState<DayStatusMap>({});
  const [isLoadingDays, setLoadingDays] = useState(false);
  const [daysError, setDaysError] = useState<string | null>(null);

  const [insights, setInsights] = useState<DayInsights | null>(null);
  /** The server's own sentence about the day - shown rather than re-worded. */
  const [notice, setNotice] = useState<string | null>(null);
  // Starts true: the first paint should say the chart is coming, because a
  // screen with no chart on it looks exactly like a day with nothing in it.
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Which request is the current one - see the check inside `load`. */
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = requestId.current + 1;
    requestId.current = id;

    setLoading(true);
    setError(null);

    try {
      const { message, data } = await fetchDayInsights(date ?? undefined);
      if (requestId.current !== id) {
        return;
      }
      setInsights(data);
      setNotice(message);
      if (data !== null) {
        // The calendar opens on the month of the day on screen, whether that
        // day was picked or handed over by the server.
        setMonth(parseDayKey(data.log_date));
      }
    } catch (failure) {
      if (requestId.current !== id) {
        return;
      }
      setError(
        failure instanceof Error
          ? `${failure.message} Your chart is not shown.`
          : 'Could not load your chart. Your chart is not shown.',
      );
    } finally {
      if (requestId.current === id) {
        setLoading(false);
      }
    }
  }, [date]);

  /**
   * On focus rather than on mount, so a day logged and then looked at here
   * shows what was just saved rather than what the screen knew before.
   */
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const { from, to } = useMemo(() => monthRange(month), [month]);

  /**
   * Which days in the month on screen carry a log.
   *
   * Only while the calendar is open. A reader who never opens it never pays
   * for a month of marks - and the calendar is the only thing on this screen
   * that has any use for them.
   */
  const loadStatuses = useCallback(async () => {
    setLoadingDays(true);
    setDaysError(null);
    try {
      const { data } = await fetchDayStatuses(from, to);
      setStatuses(data?.statuses ?? {});
    } catch (failure) {
      setDaysError(
        failure instanceof Error
          ? failure.message
          : 'Could not load your logged days.',
      );
    } finally {
      setLoadingDays(false);
    }
  }, [from, to]);

  useEffect(() => {
    if (isPickerOpen) {
      loadStatuses();
    }
  }, [isPickerOpen, loadStatuses]);

  /**
   * Picking a day closes the calendar as well as loading it.
   *
   * Left open, the chart it was opened to reach would be a screen further down
   * than it was a moment ago - and the button that opened it is still there,
   * plainly labelled, for anyone who wants another day.
   */
  const handlePickDay = (picked: Date) => {
    setPickerOpen(false);
    setDate(dayKey(picked));
  };

  const chart = useMemo(
    () => (insights ? buildChart(insights, width - CHART_INSET) : null),
    [insights, width],
  );
  const periods = useMemo(
    () => (insights ? buildPeriods(insights) : []),
    [insights],
  );

  const age = user?.dob ? dobToAge(user.dob) : null;
  const today = useMemo(() => startOfDay(new Date()), []);
  const topInset = Math.max(minInset.top, insets.top);
  const bottomInset = Math.max(minInset.bottom, insets.bottom);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topInset, paddingBottom: bottomInset + spacing.xl },
        ]}
      >
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
            onPress={navigation.goBack}
            accessibilityRole="button"
            accessibilityLabel="Go back to your log"
          >
            <Icon name="chevronLeft" size={15} color={colors.primary} />
            <Text style={styles.backText}>Your log</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>Insights</Text>

        {/* Who this is, and which day. Both before anything is drawn: a chart
            of somebody's medicine with no name and no date on it is the kind
            of thing that gets printed out and then cannot be placed. */}
        <View style={styles.card}>
          <Text style={styles.patientName}>
            {user?.full_name?.trim() || 'Patient'}
          </Text>
          <Text style={styles.patientMeta}>
            {age === null ? 'Age not recorded' : `${age} years old`}
          </Text>

          {insights && (
            <>
              {/* Worded as the day's own answer. These are recorded per day,
                  and a heading of "Side effects" alone would read as a
                  standing fact about the person. */}
              <Text style={styles.detailLabel}>
                Side effects you reported on this day
              </Text>
              <Text style={styles.detailValue}>
                {insights.side_effects && insights.side_effects.length > 0
                  ? insights.side_effects.join(', ')
                  : 'None reported'}
              </Text>

              <Text style={styles.detailLabel}>Medicine</Text>
              <Text style={styles.detailValue}>
                {`${insights.medicine_name}, taken ${insights.dose_count} ${
                  insights.dose_count === 1 ? 'time' : 'times'
                }`}
              </Text>
            </>
          )}
        </View>

        {/* Which day, and the way to another one. Above everything it
            describes, because it is what everything below it is about. */}
        <View style={styles.card}>
          <Text style={styles.detailLabel}>Day shown</Text>
          <Text style={styles.dayValue}>
            {insights === null
              ? 'No day yet'
              : formatFullDate(parseDayKey(insights.log_date))}
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.changeDay,
              pressed && styles.changeDayPressed,
            ]}
            onPress={() => setPickerOpen(open => !open)}
            accessibilityRole="button"
            accessibilityLabel={
              isPickerOpen
                ? 'Close the day picker'
                : 'Choose a different day to see'
            }
            accessibilityState={{ expanded: isPickerOpen }}
          >
            <Icon
              name={isPickerOpen ? 'chevronUp' : 'chevronDown'}
              size={14}
              color={colors.primary}
            />
            <Text style={styles.changeDayText}>
              {isPickerOpen ? 'Close' : 'Choose a day'}
            </Text>
          </Pressable>

          {isPickerOpen && (
            <Text style={styles.pickerHint}>
              {daysError !== null
                ? `${daysError} The days you have logged are not marked below.`
                : isLoadingDays
                ? 'Loading your logged days...'
                : 'Only the days with a green mark can be opened. The rest have no log to show.'}
            </Text>
          )}
        </View>

        {isPickerOpen && (
          <MonthCalendar
            month={month}
            onMonthChange={setMonth}
            selected={insights === null ? null : parseDayKey(insights.log_date)}
            onSelect={handlePickDay}
            today={today}
            // Today, not yesterday: a day logged this morning has a chart to
            // show, even though the log screen would not let it be logged yet.
            latest={today}
            statuses={statuses}
            // A day with no log has nothing to draw, so it takes no press at
            // all rather than taking one and answering with an error.
            unavailable={(_day, status) =>
              status === undefined ? 'no log for this day' : null
            }
            insetX={CALENDAR_INSET}
          />
        )}

        <Notice loading={isLoading} error={error} onRetry={load} />

        {/* The server's sentence for a day that cannot be drawn - "you have not
            logged a day yet", "there are not enough times recorded to draw a
            chart". Only when there is no chart: one place decides that copy and
            it is not this one, but beside a chart it would only repeat the date
            already at the top of the screen. */}
        {!isLoading && error === null && chart === null && notice !== null && (
          <View style={styles.card}>
            <Text style={styles.body}>{notice}</Text>
            {insights === null && (
              <Pressable
                style={({ pressed }) => [
                  styles.action,
                  pressed && styles.actionPressed,
                ]}
                onPress={navigation.goBack}
                accessibilityRole="button"
                accessibilityLabel="Go to your log and log a day"
              >
                <Text style={styles.actionText}>Go to your log</Text>
              </Pressable>
            )}
          </View>
        )}

        {insights && chart && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your day</Text>
            <Text style={styles.body}>{describeChart(insights)}</Text>
            <Text style={styles.chartCaption}>
              Down the side: how much of your usual activity you could do, 0 to
              100.
            </Text>

            <ActivityChart
              model={chart}
              label={chartAccessibilityLabel(insights)}
            />

            <Text style={styles.axisCaption}>
              Time of day. The numbered circles are your doses.
            </Text>

            <PatternKey />

            <Text style={styles.body}>{describeTotals(insights)}</Text>
          </View>
        )}

        {insights && insights.totals.recorded_minutes > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>How long in each state</Text>
            <Totals totals={insights.totals} />
          </View>
        )}

        {periods.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Every period, in order</Text>
            <Text style={styles.bodyMuted}>
              The same stretches the chart draws, with their exact times.
            </Text>
            <Periods periods={periods} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default InsightsScreen;
