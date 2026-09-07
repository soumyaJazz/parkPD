import { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StatusBar, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchDayStatuses } from '../../api';
import ConfirmDialog from '../../components/ConfirmDialog';
import MonthCalendar from '../../components/MonthCalendar';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { colors, feedback, minInset, spacing } from '../../theme';
import type { DayStatusMap } from '../../types/dailyLog';
import { dayKey, greetingFor, monthRange, startOfDay } from '../../utils/date';
import type { HomeStat, MenuItem } from './parts';
import {
  CalendarNotice,
  HomeHero,
  LogFooter,
  MenuDrawer,
  StatRow,
} from './parts';
import { styles } from './HomeScreen.styles';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

/**
 * TODO(api): the three figures are hardcoded until the daily-log summary
 * endpoint exists. They are the shape the screen expects, not real numbers.
 *
 * "5 days" and "Days logged" are spelled out where the design said "5d" and
 * "Log %": abbreviations are the first thing to go for readers this screen is
 * built for, and there is room for the words.
 */
const STATS: readonly HomeStat[] = [
  { icon: 'capsule', value: '3', label: 'Doses', color: colors.primary },
  { icon: 'fire', value: '5 days', label: 'Streak', color: colors.accent },
  {
    icon: 'barChart',
    value: '92%',
    label: 'Days logged',
    color: feedback.success.fg,
  },
];

/**
 * Where a signed-in day starts: how things stand, and which day to log.
 *
 * One clock reading serves the whole screen - the greeting, which days are
 * past, and which cell is today all come off the same `today`, so they cannot
 * disagree with each other if the screen happens to be open across midnight.
 */
function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const now = useMemo(() => new Date(), []);
  const today = useMemo(() => startOfDay(now), [now]);

  // The month on screen, which isn't the selection: the user can look back
  // through the year without picking anything.
  const [month, setMonth] = useState(today);
  // Nothing is chosen at first. Preselecting today would put a primary action
  // on screen before the user has said which day they mean.
  const [selected, setSelected] = useState<Date | null>(null);

  const [statuses, setStatuses] = useState<DayStatusMap>({});
  // Starts true, so the first paint says the days are on their way. A month
  // with no marks yet looks exactly like a month nobody has logged.
  const [isLoadingDays, setLoadingDays] = useState(true);
  const [daysError, setDaysError] = useState<string | null>(null);

  /** Which request is the current one - see the check inside `loadStatuses`. */
  const requestId = useRef(0);
  const { from, to } = useMemo(() => monthRange(month), [month]);

  /**
   * The marks for the month on screen.
   *
   * Only the month drawn, not the whole account: the calendar shows thirty
   * cells, and a year of days to fill them in is work the phone would throw
   * away - more of it every month the app is used.
   */
  const loadStatuses = useCallback(async () => {
    const id = requestId.current + 1;
    requestId.current = id;

    setLoadingDays(true);
    setDaysError(null);

    try {
      const { data } = await fetchDayStatuses(from, to);
      // A slow answer for a month the user has already stepped past would
      // otherwise replace the month they are actually looking at.
      if (requestId.current !== id) {
        return;
      }
      setStatuses(data?.statuses ?? {});
    } catch (error) {
      if (requestId.current !== id) {
        return;
      }
      setDaysError(
        error instanceof Error
          ? error.message
          : 'Could not load your logged days.',
      );
    } finally {
      if (requestId.current === id) {
        setLoadingDays(false);
      }
    }
  }, [from, to]);

  /**
   * On focus rather than on mount, and re-run whenever the month changes.
   *
   * Focus is what catches the day that was just logged: the review screen pops
   * back to here, and without this the calendar would still be showing what it
   * knew before the log was saved.
   */
  useFocusEffect(
    useCallback(() => {
      loadStatuses();
    }, [loadStatuses]),
  );

  const topInset = Math.max(minInset.top, insets.top);
  const bottomInset = Math.max(minInset.bottom, insets.bottom);

  const handleConfirmSignOut = async () => {
    setIsSigningOut(true);
    // signOut clears the session either way, so the screen never has to handle
    // a failure here - the navigator unmounts it regardless. Awaited so the
    // dialog keeps saying what it is doing until that happens.
    await signOut();
  };

  const handleMenuSelect = (item: MenuItem) => {
    setIsMenuOpen(false);
    if (item.key === 'profile') {
      navigation.navigate('Profile');
      return;
    }
    if (item.key === 'signOut') {
      setIsConfirming(true);
      return;
    }
    // Home is where the menu was opened from, so closing it is the whole move.
    if (item.key === 'home') {
      return;
    }
    // TODO(sections): Medications, Insights and Reminders are listed because
    // they are where this is going; until they exist the press still answers.
    showToast(
      `${item.label} is not ready yet`,
      'This part of parkPD is still being built.',
      'info',
    );
  };

  const handleLogDay = () => {
    if (selected === null) {
      return;
    }
    // The day travels as its key rather than as a Date: route params are
    // serialised, and a Date that has been through that comes back a string
    // anyway - so it goes as the one the calendar already keys days by.
    navigation.navigate('MorningCheck', { date: dayKey(selected) });
  };

  return (
    <View style={styles.screen}>
      {/* The hero runs behind the status bar, and dark icons on indigo are
          barely there. Reverts on its own when the screen unmounts. */}
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <HomeHero
          greeting={greetingFor(now)}
          // "Patient" is the fallback: an account can reach this screen before
          // a name has been saved, and a blank line reads as a bug.
          name={user?.full_name?.trim() || 'Patient'}
          topInset={topInset}
          onOpenMenu={() => setIsMenuOpen(true)}
        />

        <StatRow stats={STATS} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your log</Text>
          <CalendarNotice
            loading={isLoadingDays}
            error={daysError}
            onRetry={loadStatuses}
          />
          <MonthCalendar
            month={month}
            onMonthChange={setMonth}
            selected={selected}
            onSelect={setSelected}
            today={today}
            statuses={statuses}
            // The screen's gutter on both sides, plus the card's own padding:
            // what is left is what the seven columns are divided out of.
            insetX={(spacing.lg + spacing.md) * 2}
          />
        </View>
      </ScrollView>

      {/* Outside the scroll: the calendar is tall enough that a button under it
          would sit off the bottom of a phone. */}
      <LogFooter
        date={selected}
        status={selected ? statuses[dayKey(selected)] : undefined}
        bottomInset={bottomInset}
        onLogDay={handleLogDay}
      />

      {isMenuOpen && (
        <MenuDrawer
          activeKey="home"
          onSelect={handleMenuSelect}
          onClose={() => setIsMenuOpen(false)}
          topInset={topInset}
          bottomInset={bottomInset}
        />
      )}

      {/* Said plainly, and it names the consequence rather than asking "are you
          sure?" - getting back in means waiting on a new code. Named the way
          this account actually receives one, since half of them are texted. */}
      <ConfirmDialog
        visible={isConfirming}
        title="Sign out of parkPD?"
        message={`You will need a new code sent to your ${
          user?.verified_with === 'phone' ? 'mobile number' : 'email'
        } the next time you sign in.`}
        confirmLabel={isSigningOut ? 'Signing out...' : 'Sign out'}
        cancelLabel="Stay signed in"
        destructive
        busy={isSigningOut}
        onConfirm={handleConfirmSignOut}
        onCancel={() => setIsConfirming(false)}
      />
    </View>
  );
}

export default HomeScreen;
