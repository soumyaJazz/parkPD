import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  YEAR_ROWS_PER_PAGE,
  YEARS_PER_PAGE,
  YEARS_PER_ROW,
  YEAR_ROW_HEIGHT,
  styles,
} from './DatePicker.styles';

type Props = {
  visible: boolean;
  /** The date the grid opens on; today's month when there isn't one yet. */
  value: Date | null;
  /** Selectable range, inclusive. Days outside it are shown but not tappable. */
  minDate: Date;
  maxDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
};

/**
 * Which grid is on screen. A date of birth is decades back, so stepping a month
 * at a time would be unusable - the header drills out to months, then years.
 */
type Mode = 'day' | 'month' | 'year';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Strips the time, so two dates compare on the day alone. */
function atMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Day 0 of the next month is the last day of this one. */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * A calendar in plain React Native views. Deliberately not a native picker:
 * this app also builds for web, and one implementation keeps the two identical.
 */
function DatePicker({
  visible,
  value,
  minDate,
  maxDate,
  onSelect,
  onClose,
}: Props) {
  const floor = useMemo(() => atMidnight(minDate), [minDate]);
  const ceiling = useMemo(() => atMidnight(maxDate), [maxDate]);

  // Where the grid is pointed, which is not the selection - the user can browse
  // away from the chosen date without picking anything.
  const [cursor, setCursor] = useState(() => value ?? ceiling);
  const [mode, setMode] = useState<Mode>('day');

  // Reopening starts from the current selection rather than wherever the last
  // visit was left, and always on the day grid.
  useEffect(() => {
    if (visible) {
      setCursor(value ?? ceiling);
      setMode('day');
    }
  }, [visible, value, ceiling]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const isOutOfRange = (date: Date) => date < floor || date > ceiling;

  // A step is pointless when every day it would land on is out of range.
  const canStepBack = !isOutOfRange(new Date(year, month, daysInMonth(year, month - 1)));
  const canStepForward = !isOutOfRange(new Date(year, month + 1, 1));

  const cells = useMemo(() => {
    // Blanks pad the row so the 1st sits under its weekday.
    const leading: Array<number | null> = Array(
      new Date(year, month, 1).getDay(),
    ).fill(null);
    const days = Array.from(
      { length: daysInMonth(year, month) },
      (_, index) => index + 1,
    );
    return [...leading, ...days];
  }, [year, month]);

  // Ascending, the way a date picker is normally ordered: '<' then means
  // "further back" in the year list exactly as it does in the day and month
  // grids, rather than reversing meaning between modes.
  const years = useMemo(() => {
    const oldest = floor.getFullYear();
    const newest = ceiling.getFullYear();
    return Array.from({ length: newest - oldest + 1 }, (_, i) => oldest + i);
  }, [ceiling, floor]);

  const [yearPage, setYearPage] = useState(0);
  const yearRows = Math.ceil(years.length / YEARS_PER_ROW);
  const yearPageCount = Math.max(1, Math.ceil(yearRows / YEAR_ROWS_PER_PAGE));

  /**
   * The row the window starts at. The last page is usually a partial one, and
   * scrolling to it would stop short at the end of the list - so it is clamped
   * to the final whole window, which keeps the label naming exactly the years
   * on screen instead of the dozen the page nominally covers.
   */
  const pageRow = Math.min(
    yearPage * YEAR_ROWS_PER_PAGE,
    Math.max(0, yearRows - YEAR_ROWS_PER_PAGE),
  );
  const pageYears = years.slice(
    pageRow * YEARS_PER_ROW,
    pageRow * YEARS_PER_ROW + YEARS_PER_PAGE,
  );

  const yearScroll = useRef<ComponentRef<typeof ScrollView>>(null);

  // Open on the page holding the year already in hand, so a birth year decades
  // back isn't a scroll away from where the list happens to start.
  useEffect(() => {
    if (mode !== 'year') {
      return;
    }
    const index = years.indexOf(year);
    setYearPage(index < 0 ? 0 : Math.floor(index / YEARS_PER_PAGE));
  }, [mode, year, years]);

  // Keeps the list in step with the page, however the page was reached. Rows
  // are a fixed height, so the offset is arithmetic - nothing to measure.
  useEffect(() => {
    if (mode !== 'year') {
      return;
    }
    yearScroll.current?.scrollTo({
      y: pageRow * YEAR_ROW_HEIGHT,
      animated: false,
    });
  }, [mode, pageRow]);

  const handlePickDay = (day: number) => {
    const picked = new Date(year, month, day);
    if (isOutOfRange(picked)) {
      return;
    }
    onSelect(picked);
    onClose();
  };

  const handlePickMonth = (index: number) => {
    // Clamped: the 31st doesn't exist in every month, and February 29th only
    // exists in some years.
    setCursor(
      new Date(
        year,
        index,
        Math.min(cursor.getDate(), daysInMonth(year, index)),
      ),
    );
    setMode('day');
  };

  const handlePickYear = (picked: number) => {
    setCursor(
      new Date(picked, month, Math.min(cursor.getDate(), daysInMonth(picked, month))),
    );
    setMode('month');
  };

  const stepYear = (delta: number) => setCursor(new Date(year + delta, month, 1));

  // In year mode the arrows page the list, so the label names the range they
  // are moving through rather than a fixed "Select year".
  const headerLabel =
    mode === 'day'
      ? `${MONTHS[month]} ${year}`
      : mode === 'month'
        ? `${year}`
        : `${pageYears[0]} - ${pageYears[pageYears.length - 1]}`;

  // '<' is always "further back": a month, a year, or a page of years.
  const canGoBack =
    mode === 'year' ? yearPage > 0 : mode === 'day' ? canStepBack : true;
  const canGoForward =
    mode === 'year'
      ? yearPage < yearPageCount - 1
      : mode === 'day'
        ? canStepForward
        : true;

  const goBack = () => {
    if (mode === 'year') {
      setYearPage(page => Math.max(0, page - 1));
    } else if (mode === 'day') {
      setCursor(new Date(year, month - 1, 1));
    } else {
      stepYear(-1);
    }
  };

  const goForward = () => {
    if (mode === 'year') {
      setYearPage(page => Math.min(yearPageCount - 1, page + 1));
    } else if (mode === 'day') {
      setCursor(new Date(year, month + 1, 1));
    } else {
      stepYear(1);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        {/*
          Tapping the dimmed area closes, the way a native sheet does - but as a
          sibling behind the card, not a parent wrapped around it. Wrapped, it
          took the touch responder on every drag that began inside the card and
          the year list could never be scrolled. Cancel below does the same job
          for anyone who doesn't know the gesture.
        */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />

        <View style={styles.card}>
          <View style={styles.header}>
            <Pressable
              style={styles.arrow}
              onPress={goBack}
              disabled={!canGoBack}
              accessibilityRole="button"
              accessibilityLabel="Show earlier dates"
            >
              <View
                style={[
                  styles.chevron,
                  styles.chevronLeft,
                  !canGoBack && styles.chevronDisabled,
                ]}
              />
            </Pressable>

            <Pressable
              onPress={() => setMode(mode === 'day' ? 'month' : 'year')}
              disabled={mode === 'year'}
              accessibilityRole="button"
              accessibilityLabel={`${headerLabel}, change`}
            >
              <Text style={styles.headerLabel}>{headerLabel}</Text>
            </Pressable>

            <Pressable
              style={styles.arrow}
              onPress={goForward}
              disabled={!canGoForward}
              accessibilityRole="button"
              accessibilityLabel="Show later dates"
            >
              <View
                style={[
                  styles.chevron,
                  styles.chevronRight,
                  !canGoForward && styles.chevronDisabled,
                ]}
              />
            </Pressable>
          </View>

          {mode === 'day' && (
            <>
              <View style={styles.weekRow}>
                {WEEKDAYS.map((weekday, index) => (
                  <Text key={index} style={styles.weekday}>
                    {weekday}
                  </Text>
                ))}
              </View>

              <View style={styles.grid}>
                {cells.map((day, index) => {
                  if (day === null) {
                    return <View key={`blank-${index}`} style={styles.dayCell} />;
                  }

                  const date = new Date(year, month, day);
                  const disabled = isOutOfRange(date);
                  const selected =
                    value !== null &&
                    value.getFullYear() === year &&
                    value.getMonth() === month &&
                    value.getDate() === day;

                  return (
                    <Pressable
                      key={day}
                      style={styles.dayCell}
                      onPress={() => handlePickDay(day)}
                      disabled={disabled}
                      accessibilityRole="button"
                      accessibilityState={{ selected, disabled }}
                    >
                      <View style={[styles.dayPill, selected && styles.dayPillSelected]}>
                        <Text
                          style={[
                            styles.dayText,
                            selected && styles.dayTextSelected,
                            disabled && styles.dayTextDisabled,
                          ]}
                        >
                          {day}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {mode === 'month' && (
            <View style={styles.grid}>
              {MONTHS.map((name, index) => {
                // Out only when no day of that month is reachable.
                const disabled =
                  isOutOfRange(new Date(year, index, 1)) &&
                  isOutOfRange(new Date(year, index, daysInMonth(year, index)));
                return (
                  <Pressable
                    key={name}
                    style={styles.monthCell}
                    onPress={() => handlePickMonth(index)}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityState={{ selected: index === month, disabled }}
                  >
                    <View
                      style={[styles.chip, index === month && styles.chipSelected]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          index === month && styles.chipTextSelected,
                          disabled && styles.dayTextDisabled,
                        ]}
                      >
                        {name.slice(0, 3)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {mode === 'year' && (
            <ScrollView
              ref={yearScroll}
              style={styles.yearScroll}
              contentContainerStyle={styles.grid}
            >
              {/* Every year is still here, so the list scrolls for anyone who
                  reaches for it - but the arrows above page through the whole
                  range, so the gesture is never the only way to reach a year. */}
              {years.map(option => (
                <Pressable
                  key={option}
                  style={styles.monthCell}
                  onPress={() => handlePickYear(option)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: option === year }}
                >
                  <View style={[styles.chip, option === year && styles.chipSelected]}>
                    <Text
                      style={[
                        styles.chipText,
                        option === year && styles.chipTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <Pressable
            style={styles.cancel}
            onPress={onClose}
            accessibilityRole="button"
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default DatePicker;
