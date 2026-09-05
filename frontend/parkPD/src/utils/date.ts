/**
 * Calendar arithmetic and the wording that goes with it.
 *
 * Everything here works in the device's local timezone, deliberately: a day
 * being logged is a day in the user's own life, so "today" has to mean the day
 * they are living, not the UTC one. That is also why days are keyed by
 * `YYYY-MM-DD` built from the local parts rather than by `toISOString()`,
 * which would shift the key by a day either side of midnight.
 *
 * Month and weekday names are spelled out rather than taken from `Intl`, which
 * is not guaranteed to be on every JS engine this app runs on - and the app is
 * English-only for now, so there is nothing to localise yet.
 */

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

const MONTHS_SHORT = MONTHS.map(month => month.slice(0, 3));

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const WEEKDAYS_SHORT = WEEKDAYS.map(day => day.slice(0, 3));

/** The two-letter column headings over the day grid. */
export const WEEKDAY_INITIALS = WEEKDAYS.map(day => day.slice(0, 2));

/** Strips the time, so two dates compare on the day alone. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Today, with the time stripped. */
export function today(): Date {
  return startOfDay(new Date());
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/**
 * The first of the month `months` away. Anchoring to day 1 is what keeps the
 * step honest: adding a month to the 31st would otherwise land in the month
 * after next, so pressing "next" twice from January would skip February.
 */
export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Day 0 of the next month is the last day of this one. */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** `YYYY-MM-DD` in local time - how a day is keyed in a status map. */
export function dayKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** "August 2026" - the calendar's title. */
export function formatMonthYear(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** "Mon, Aug 24" - short enough for the selection card. */
export function formatDayLabel(date: Date): string {
  return `${WEEKDAYS_SHORT[date.getDay()]}, ${
    MONTHS_SHORT[date.getMonth()]
  } ${date.getDate()}`;
}

/**
 * "Monday, August 24, 2026". Nothing shortened: this is what a screen reader
 * announces for a day cell, where "Mon, Aug 24" would be read out as fragments.
 */
export function formatFullDate(date: Date): string {
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/** How the home screen opens, by the clock on the device. */
export function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) {
    return 'Good Morning ☀️';
  }
  if (hour < 17) {
    return 'Good Afternoon 🌤️';
  }
  return 'Good Evening 🌙';
}

/**
 * A reading on the clock with no date attached, kept in 24-hour local time.
 *
 * Stored as 24-hour rather than as an hour plus AM/PM because that is the one
 * form with a single representation per minute of the day: 12 AM and 0 are the
 * same instant, and only one of the two can be compared or sent.
 */
export type TimeOfDay = {
  /** 0-23. */
  hour: number;
  /** 0-59. */
  minute: number;
};

/**
 * What the minute controls move by. Five is what a person answering "when did
 * you wake up?" can actually tell you - a one-minute step would be eleven more
 * taps for an answer nobody knows to that precision.
 */
export const MINUTE_STEP = 5;

/** "7:30 AM" - how a time is shown. */
export function formatTime12(time: TimeOfDay): string {
  // 0 and 12 both read as 12: midnight is 12 AM, noon is 12 PM.
  const hour = time.hour % 12 === 0 ? 12 : time.hour % 12;
  const minute = `${time.minute}`.padStart(2, '0');
  return `${hour}:${minute} ${time.hour < 12 ? 'AM' : 'PM'}`;
}

/** "07:30" - how a time is stored and sent. */
export function formatTime24(time: TimeOfDay): string {
  return `${`${time.hour}`.padStart(2, '0')}:${`${time.minute}`.padStart(
    2,
    '0',
  )}`;
}

/**
 * The day a `dayKey()` names, back as a Date.
 *
 * Split by hand rather than handed to `new Date(key)`, which reads a bare
 * `YYYY-MM-DD` as UTC midnight - west of Greenwich that is the day before.
 */
export function parseDayKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** "07:00" back to the clock reading it names. */
export function parseTime24(value: string): TimeOfDay {
  const [hour, minute] = value.split(':').map(Number);
  return { hour, minute };
}

/**
 * The time `minutes` later, wrapping at midnight.
 *
 * A day's doses can run past midnight - a late one taken at 11pm wears off the
 * following morning - so this rolls round rather than overflowing the hour.
 */
export function addMinutes(time: TimeOfDay, minutes: number): TimeOfDay {
  const total = (((time.hour * 60 + time.minute + minutes) % 1440) + 1440) % 1440;
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

/**
 * A span of minutes said the way a person says it: "45 mins", "1 hr 15 mins",
 * "2 hrs". Never "75 mins", which is a number the reader has to convert.
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourPart = `${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
  const minutePart = `${rest} ${rest === 1 ? 'min' : 'mins'}`;

  if (hours === 0) {
    return minutePart;
  }
  return rest === 0 ? hourPart : `${hourPart} ${minutePart}`;
}


/** "1st", "2nd", "3rd", "4th" - how a dose is named in a question. */
export function ordinal(value: number): string {
  const tens = value % 100;
  if (tens >= 11 && tens <= 13) {
    return `${value}th`;
  }
  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}
