import { Pressable, ScrollView, Text, View } from 'react-native';
import Icon from '../../components/Icon';
import type { IconName } from '../../components/Icon';
import { colors } from '../../theme';
import type { DayStatus } from '../../types/dailyLog';
import { formatDayLabel, formatFullDate } from '../../utils/date';
import { useAppWidth } from '../../utils/useAppWidth';
import { styles } from './HomeScreen.styles';

/** One of the three figures on the card over the hero. */
export type HomeStat = {
  icon: IconName;
  value: string;
  label: string;
  /** Colour for the figure only - the label beside it always says what it is. */
  color: string;
};

/**
 * The coloured header: who this is, and the way out of the screen.
 *
 * `topInset` is passed in rather than read here so the gradient runs behind the
 * status bar while the copy still clears it.
 */
export function HomeHero({
  greeting,
  name,
  topInset,
  onOpenMenu,
}: {
  greeting: string;
  name: string;
  topInset: number;
  onOpenMenu: () => void;
}) {
  return (
    <View style={[styles.hero, { paddingTop: topInset + 16 }]}>
      <View style={styles.heroTop}>
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <Icon name="clock" size={15} color={colors.white} />
          </View>
          <Text style={styles.brandText}>parkPD</Text>
        </View>

        {/* Labelled, not a bare hamburger: three lines on their own are a
            symbol this audience shouldn't have to have learned. */}
        <Pressable
          style={({ pressed }) => [
            styles.menuButton,
            pressed && styles.menuButtonPressed,
          ]}
          onPress={onOpenMenu}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
        >
          <Icon name="list" size={15} color={colors.primary} />
          <Text style={styles.menuButtonText}>Menu</Text>
        </Pressable>
      </View>

      <Text style={styles.greeting}>{greeting}</Text>
      <Text style={styles.name}>{name}</Text>
    </View>
  );
}

export function StatRow({ stats }: { stats: readonly HomeStat[] }) {
  return (
    <View style={styles.statsCard}>
      {stats.map((stat, index) => (
        <View
          key={stat.label}
          // Hairlines between the three, rather than three separate cards.
          style={[styles.stat, index > 0 && styles.statDivided]}
          accessible
          accessibilityLabel={`${stat.value}, ${stat.label}`}
        >
          <View style={styles.statIcon}>
            <Icon name={stat.icon} size={20} color={stat.color} />
          </View>
          <Text style={[styles.statValue, { color: stat.color }]}>
            {stat.value}
          </Text>
          <Text style={styles.statLabel}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * What the calendar has to say for itself while its marks are still coming, or
 * when they never came.
 *
 * Both states are said in words rather than shown as a spinner or a red edge.
 * A calendar with no marks on it looks exactly like a calendar for someone who
 * has never logged a day, and the difference between "we are still asking" and
 * "we could not ask" is the whole of what the reader needs here.
 *
 * Nothing is drawn once the days have arrived - the marks are the answer then.
 */
export function CalendarNotice({
  loading,
  error,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (error !== null) {
    return (
      <View style={styles.notice}>
        <Text style={styles.noticeError}>
          {error} Your logged days are not shown below.
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.retryButtonPressed,
          ]}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Try loading your logged days again"
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.notice}>
        <Text style={styles.noticeText}>Loading your logged days...</Text>
      </View>
    );
  }

  return null;
}

/**
 * The strip along the bottom: which day is picked, and the way into logging it.
 *
 * Pinned below the scroll on purpose. It is the one thing this screen is for,
 * and a month of days is tall enough that a button under the calendar can sit
 * off the bottom of a phone entirely.
 *
 * The eyebrow is what separates a fresh day from one already part-filled:
 * "Resume logging" says the answers already given are still there, which a
 * mark on the calendar can only hint at.
 */
export function LogFooter({
  date,
  status,
  bottomInset,
  onLogDay,
}: {
  date: Date | null;
  status?: DayStatus;
  bottomInset: number;
  onLogDay: () => void;
}) {
  return (
    <View style={[styles.footer, { paddingBottom: bottomInset }]}>
      {date === null ? (
        <Text style={styles.hint}>Tap a date above to start logging</Text>
      ) : (
        <View style={styles.footerRow}>
          <View style={styles.footerText}>
            <Text style={styles.eyebrow}>
              {status === 'in-progress' ? 'Resume logging' : 'Selected date'}
            </Text>
            <Text style={styles.selectionDate}>{formatDayLabel(date)}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.logButton,
              pressed && styles.logButtonPressed,
            ]}
            onPress={onLogDay}
            accessibilityRole="button"
            accessibilityLabel={`Log day, ${formatFullDate(date)}`}
          >
            <Text style={styles.logButtonText}>Log Day</Text>
            <Icon name="arrowRight" size={15} color={colors.white} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

/** Everything the drawer can lead to. */
export type MenuKey =
  | 'home'
  | 'medications'
  | 'insights'
  | 'reminders'
  | 'profile'
  | 'signOut';

export type MenuItem = {
  key: MenuKey;
  icon: IconName;
  label: string;
  /** A count pill on the right - TODO(api): reminders aren't built yet. */
  badge?: string;
  destructive?: boolean;
};

const MAIN_MENU: readonly MenuItem[] = [
  { key: 'home', icon: 'house', label: 'Home' },
  { key: 'medications', icon: 'capsule', label: 'Medications' },
  { key: 'insights', icon: 'barChart', label: 'Insights' },
  { key: 'reminders', icon: 'bell', label: 'Reminders', badge: '3' },
];

const ACCOUNT_MENU: readonly MenuItem[] = [
  { key: 'profile', icon: 'person', label: 'Profile' },
  // Not in the design, but this is the only way out of the app, and it has to
  // live somewhere a user can find it.
  { key: 'signOut', icon: 'signOut', label: 'Sign out', destructive: true },
];

function MenuRow({
  item,
  active,
  onPress,
}: {
  item: MenuItem;
  active: boolean;
  onPress: () => void;
}) {
  // The badge is a count, so it is said rather than left as a red shape; the
  // active row says which screen this already is.
  // The icon takes the row's own colour, which is the point of dropping emoji.
  const tint = active
    ? colors.primary
    : item.destructive
    ? colors.error
    : colors.text;

  const spoken = [
    item.key === 'signOut' ? 'Sign out of parkPD' : item.label,
    item.badge ? `${item.badge} due` : null,
    active ? 'current screen' : null,
  ].filter(Boolean);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        active && styles.menuItemActive,
        pressed && !active && styles.menuItemPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={spoken.join(', ')}
      accessibilityState={{ selected: active }}
    >
      <View style={styles.menuIcon}>
        <Icon name={item.icon} size={17} color={tint} />
      </View>
      <Text
        style={[
          styles.menuItemLabel,
          active && styles.menuItemLabelActive,
          item.destructive && styles.menuItemLabelDestructive,
        ]}
      >
        {item.label}
      </Text>
      {item.badge ? <Text style={styles.menuBadge}>{item.badge}</Text> : null}
    </Pressable>
  );
}

/**
 * The menu, as a panel down the left rather than a sheet up from the bottom.
 *
 * It keeps a strip of the screen dimmed beside it: the page underneath stays
 * visible, so it reads as something laid over the app rather than a new place
 * the user has been taken to.
 */
export function MenuDrawer({
  activeKey,
  onSelect,
  onClose,
  topInset,
  bottomInset,
}: {
  activeKey: MenuKey;
  onSelect: (item: MenuItem) => void;
  onClose: () => void;
  topInset: number;
  bottomInset: number;
}) {
  const width = useAppWidth();
  // Never the whole width: the dimmed strip beside it is what says the app is
  // still there, and it is one of the two ways back out.
  const panelWidth = Math.min(320, Math.round(width * 0.84));

  return (
    <View style={styles.drawerRoot}>
      <View
        style={[styles.drawer, { width: panelWidth, paddingTop: topInset + 16 }]}
        accessibilityViewIsModal
      >
        <View style={styles.drawerHeader}>
          <View style={styles.drawerMark}>
            <Icon name="clock" size={18} color={colors.white} />
          </View>
          <Text style={styles.drawerBrand}>parkPD</Text>

          {/* The one icon-only control in the app: a close X is understood
              everywhere, and it is still 44pt and labelled. */}
          <Pressable
            style={({ pressed }) => [
              styles.drawerClose,
              pressed && styles.drawerClosePressed,
            ]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
          >
            <Icon name="close" size={15} color={colors.text} />
          </Pressable>
        </View>

        {/* Scrollable so the account rows can't end up off the bottom of a
            short screen, or of a large font size. */}
        <ScrollView
          style={styles.flex}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomInset + 16 }}
        >
          <Text style={styles.menuSection}>Main menu</Text>
          {MAIN_MENU.map(item => (
            <MenuRow
              key={item.key}
              item={item}
              active={item.key === activeKey}
              onPress={() => onSelect(item)}
            />
          ))}

          <View style={styles.menuDivider} />

          <Text style={styles.menuSection}>Account</Text>
          {ACCOUNT_MENU.map(item => (
            <MenuRow
              key={item.key}
              item={item}
              active={item.key === activeKey}
              onPress={() => onSelect(item)}
            />
          ))}
        </ScrollView>
      </View>

      {/* The strip beside the panel: tapping it closes, the way a drawer does.
          Close above does the same job for anyone who doesn't know that. */}
      <Pressable
        style={styles.flex}
        onPress={onClose}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </View>
  );
}
