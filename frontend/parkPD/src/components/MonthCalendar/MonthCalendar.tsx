import { useMemo } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Icon from '../Icon';
import { colors } from '../../theme';
import { DAY_STATUS_LABEL } from '../../types/dailyLog';
import type { DayStatusMap } from '../../types/dailyLog';
import {
  WEEKDAY_INITIALS,
  addMonths,
  dayKey,
  daysInMonth,
  formatFullDate,
  formatMonthYear,
  isSameDay,
} from '../../utils/date';
import { gridMetrics, legendMarks, styles } from './MonthCalendar.styles';

type Props = {
  /** Any date inside the month on screen; only its year and month are read. */
  month: Date;
  onMonthChange: (month: Date) => void;
  /** The day the user picked, or null when they haven't yet. */
  selected: Date | null;
  onSelect: (date: Date) => void;
  /**
   * Today, passed in rather than read here. The screen already holds one
   * "today" - the greeting and the logged days are both measured from it - and
   * a second reading of the clock could disagree with it across midnight.
   */
  today: Date;
  /** Which days already carry a log, keyed by `dayKey()`. */
  statuses: DayStatusMap;
  /**
   * Points between the window's edges and this card's grid - the screen's
   * gutter on both sides plus this card's own padding. The day cells are sized
   * from it rather than from percentages, so it has to be told the truth.
   */
  insetX: number;
};

/**
 * A month of days, each showing where its log stands.
 *
 * The state of a day is a mark under it rather than a wash behind it: at this
 * size a tinted fill either fights the number for contrast or is too faint to
 * see, and the mark leaves the date itself at full strength.
 *
 * Days ahead of today are drawn but inert - there is nothing to record about a
 * day that hasn't happened, and a tapped-but-refused date would be a worse
 * answer than one that plainly reads as unavailable.
 */
function MonthCalendar({
  month,
  onMonthChange,
  selected,
  onSelect,
  today,
  statuses,
  insetX,
}: Props) {
  const { width } = useWindowDimensions();
  const { cellWidth, circle, cellHeight } = gridMetrics(width, insetX);

  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  const cells = useMemo(() => {
    // Blanks pad the first row so the 1st sits under its weekday.
    const leading: Array<number | null> = Array(
      new Date(year, monthIndex, 1).getDay(),
    ).fill(null);
    const days = Array.from(
      { length: daysInMonth(year, monthIndex) },
      (_, index) => index + 1,
    );
    return [...leading, ...days];
  }, [year, monthIndex]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {/* Stepping past January or December rolls the year over, because
            `new Date(year, -1, 1)` is December of the year before. */}
        <Pressable
          style={({ pressed }) => [styles.arrow, pressed && styles.arrowPressed]}
          onPress={() => onMonthChange(addMonths(month, -1))}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
        >
          <Icon name="chevronLeft" size={13} color={colors.primary} />
        </Pressable>

        <Text style={styles.title}>{formatMonthYear(month)}</Text>

        <Pressable
          style={({ pressed }) => [styles.arrow, pressed && styles.arrowPressed]}
          onPress={() => onMonthChange(addMonths(month, 1))}
          accessibilityRole="button"
          accessibilityLabel="Next month"
        >
          <Icon name="chevronRight" size={13} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAY_INITIALS.map((initials, index) => (
          <Text key={index} style={[styles.weekday, { width: cellWidth }]}>
            {initials}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, index) => {
          if (day === null) {
            return (
              <View
                key={`blank-${index}`}
                style={[styles.cell, { width: cellWidth, height: cellHeight }]}
              />
            );
          }

          const date = new Date(year, monthIndex, day);
          const status = statuses[dayKey(date)];
          const isToday = isSameDay(date, today);
          const isSelected = selected !== null && isSameDay(date, selected);
          const isFuture = date > today;

          // Read out in full - "Mon, Aug 24" is announced as fragments - and
          // carrying the state in words, since the mark alone doesn't say it.
          const spoken = [formatFullDate(date)];
          if (isToday) {
            spoken.push('today');
          }
          if (status) {
            spoken.push(DAY_STATUS_LABEL[status].toLowerCase());
          }
          if (isFuture) {
            spoken.push('not yet available');
          }

          return (
            <Pressable
              key={dayKey(date)}
              style={[styles.cell, { width: cellWidth, height: cellHeight }]}
              // A future day takes no press at all, rather than taking one and
              // refusing it.
              onPress={isFuture ? undefined : () => onSelect(date)}
              disabled={isFuture}
              accessibilityRole="button"
              accessibilityLabel={spoken.join(', ')}
              accessibilityState={{ selected: isSelected, disabled: isFuture }}
            >
              {/* Last style wins, which is the order the states are ranked in:
                  a selected day is filled even when it is also today. */}
              <View
                style={[
                  styles.day,
                  { width: circle, height: circle, borderRadius: circle / 2 },
                  isToday && styles.dayToday,
                  isSelected && styles.daySelected,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    isToday && styles.dayTextToday,
                    isSelected && styles.dayTextSelected,
                    isFuture && styles.dayTextFuture,
                  ]}
                >
                  {day}
                </Text>
              </View>

              {/* Under the day rather than behind it, so it survives whatever
                  the cell is filled with - a logged day that is also today, or
                  the selected one, still says it has a log. */}
              <View
                style={[
                  styles.mark,
                  status === 'logged' && styles.markLogged,
                  status === 'in-progress' && styles.markInProgress,
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legend}>
        {legendMarks.map(item => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendMark, item.style]} />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default MonthCalendar;
