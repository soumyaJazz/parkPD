import { useMemo, useState } from 'react';
import { ScrollView, StatusBar, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ConfirmDialog from '../../components/ConfirmDialog';
import MonthCalendar from '../../components/MonthCalendar';
import { showToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { colors, feedback, minInset, spacing } from '../../theme';
import type { DayStatusMap } from '../../types/dailyLog';
import { addDays, dayKey, greetingFor, startOfDay } from '../../utils/date';
import type { HomeStat, MenuItem } from './parts';
import {
  HomeHero,
  LogFooter,
  MenuDrawer,
  ProfileSheet,
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
 * TODO(api): which days already carry a log comes from the server once the
 * daily-log endpoints exist. Written relative to today so the demo doesn't go
 * stale, and so "in progress" has a day to point at.
 */
function demoStatuses(from: Date): DayStatusMap {
  return {
    [dayKey(addDays(from, -1))]: 'logged',
    [dayKey(addDays(from, -2))]: 'logged',
    [dayKey(addDays(from, -3))]: 'in-progress',
    [dayKey(addDays(from, -4))]: 'logged',
  };
}

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
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const now = useMemo(() => new Date(), []);
  const today = useMemo(() => startOfDay(now), [now]);
  const statuses = useMemo(() => demoStatuses(today), [today]);

  // The month on screen, which isn't the selection: the user can look back
  // through the year without picking anything.
  const [month, setMonth] = useState(today);
  // Nothing is chosen at first. Preselecting today would put a primary action
  // on screen before the user has said which day they mean.
  const [selected, setSelected] = useState<Date | null>(null);

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
      setIsProfileOpen(true);
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

      {isProfileOpen && (
        <ProfileSheet
          user={user}
          onClose={() => setIsProfileOpen(false)}
          bottomInset={bottomInset}
        />
      )}

      {/* Said plainly, and it names the consequence rather than asking "are you
          sure?" - getting back in means waiting on a new code by email. */}
      <ConfirmDialog
        visible={isConfirming}
        title="Sign out of parkPD?"
        message="You will need a new code sent to your email the next time you sign in."
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
