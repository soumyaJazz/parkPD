/**
 * Calendar arithmetic and the wording that goes with it.
 *
 * Two clocks run through here, and the split is deliberate.
 *
 * *Days* are local. A day being logged is a day in the user's own life, so
 * "today" has to mean the day they are living, not the UTC one - which is why
 * days are keyed by `YYYY-MM-DD` built from the local parts rather than by
 * `toISOString()`, which would shift the key by a day either side of midnight.
 *
 * *Times* are UTC. A reading on a clock is ambiguous the moment it leaves the
 * device that read it - "07:30" is not a moment until you know where it was
 * read - and a dose log is only worth keeping if the gap between a dose and
 * its effect survives a flight, a DST changeover and a database. So a time is
 * shown to the user as the local reading they gave (`formatTime12`), and sent
 * as the instant that reading names (`dayClock`), with `toLocalTime` turning
 * one back into the other.
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

/**
 * The first and last day of the month `date` falls in, as `dayKey()`s.
 *
 * Both ends included, which is what the log endpoint's range means: these are
 * the first and last cells the calendar draws, not a half-open span.
 */
export function monthRange(date: Date): { from: string; to: string } {
  const year = date.getFullYear();
  const month = date.getMonth();
  return {
    from: dayKey(new Date(year, month, 1)),
    to: dayKey(new Date(year, month, daysInMonth(year, month))),
  };
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

/** The local clock reading a UTC instant shows on this device. */
export function toLocalTime(iso: string): TimeOfDay {
  const at = new Date(iso);
  return { hour: at.getHours(), minute: at.getMinutes() };
}

/**
 * How many days past the day `key` names an instant falls, in local time.
 *
 * 0 on the day itself, 1 for a reading that crossed midnight. Rounded rather
 * than divided exactly, because a DST changeover makes one day of the year 23
 * hours long and another 25.
 */
export function daysAfterDay(key: string, iso: string): number {
  const from = parseDayKey(key).getTime();
  const to = startOfDay(new Date(iso)).getTime();
  return Math.round((to - from) / 86400000);
}

/**
 * Minutes east of UTC at the given moment.
 *
 * `getTimezoneOffset` counts the other way - the minutes to add to local time
 * to reach UTC - so the sign is flipped to the one people write down: India is
 * +330, not -330. Taken for a moment rather than for the zone, since half the
 * world's offset changes twice a year.
 */
export function utcOffsetMinutes(date: Date): number {
  return -date.getTimezoneOffset();
}

/**
 * The IANA zone the device is in - "Asia/Kolkata" - or null when the engine
 * cannot name one.
 *
 * `Intl` is not guaranteed on every JS engine this app runs on, so a missing
 * one is a null rather than a crash: the offset alongside it still pins every
 * instant in the log, and only the zone's future DST rules are lost.
 */
export function timeZoneName(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

/**
 * Stamps a clock reading with the day it belongs to, as a UTC instant.
 *
 * A day's readings are handed to one clock in the order they happened, and it
 * carries the date along for them. It has to, because a day's log runs past
 * midnight - a dose taken at 11pm wears off the next morning - and by then the
 * reading alone no longer says which day it is on.
 *
 * The rule is that readings only go forwards: one that lands earlier than the
 * one before it has crossed midnight, and takes the date with it. That is the
 * only signal there is, and it is the same one a person reading the log down
 * the page would use.
 */
export interface DayClock {
  (time: TimeOfDay): string;
  (time: TimeOfDay | null): string | null;
}

/**
 * A `DayClock` for the day `key` names.
 *
 * `resumeAt` continues a day already part-stamped - the doses pick up from the
 * wake-up time the morning check recorded - so that a dose before that hour is
 * read as the small hours of the next day rather than as the same morning.
 */
export function dayClock(key: string, resumeAt?: string | null): DayClock {
  const first = parseDayKey(key);
  let dayOffset = 0;
  /** The last reading stamped, as minutes since its own midnight. */
  let previous = -1;

  if (resumeAt !== undefined && resumeAt !== null) {
    const at = new Date(resumeAt);
    dayOffset = daysAfterDay(key, resumeAt);
    previous = minutesOfDay({ hour: at.getHours(), minute: at.getMinutes() });
  }

  function stamp(time: TimeOfDay): string;
  function stamp(time: TimeOfDay | null): string | null;
  function stamp(time: TimeOfDay | null): string | null {
    if (time === null) {
      return null;
    }
    const minutes = minutesOfDay(time);
    if (minutes < previous) {
      dayOffset += 1;
    }
    previous = minutes;

    const day = addDays(first, dayOffset);
    return new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      time.hour,
      time.minute,
    ).toISOString();
  }

  return stamp;
}

/**
 * The time `minutes` later, wrapping at midnight.
 *
 * A day's doses can run past midnight - a late one taken at 11pm wears off the
 * following morning - so this rolls round rather than overflowing the hour.
 */
export function addMinutes(time: TimeOfDay, minutes: number): TimeOfDay {
  const total =
    (((minutesOfDay(time) + minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) %
    MINUTES_PER_DAY;
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

/**
 * Ordering a day's readings, when the readings have no dates on them.
 *
 * A log is a chain - woke up, took a dose, felt better, peaked, wore off, took
 * the next one - and every link has to come after the one before it. The
 * trouble is that a `TimeOfDay` is a reading on a clock and nothing more, so
 * "2:00 AM after an 11:00 PM dose" and "2:00 AM instead of an 11:00 PM dose"
 * are the same two numbers. One is an ordinary late night; the other is the
 * mistake this is here to catch.
 *
 * They are told apart by how far the reading has to be carried forward. A day
 * that ran past midnight carries a few hours; a misread AM/PM or a typo lands
 * the best part of a day out. So a reading is measured from the one before it
 * on a timeline that starts at midnight of the day being logged, and accepted
 * when it either comes later on the same clock face or is close enough behind
 * to read as the small hours that followed.
 */

/** Minutes in a day - what a clock reading wraps at. */
export const MINUTES_PER_DAY = 1440;

/** A reading as minutes since its own midnight. */
export function minutesOfDay(time: TimeOfDay): number {
  return time.hour * 60 + time.minute;
}

/**
 * How far past the reading before it a reading may be carried and still read
 * as the same night rather than as a mistake.
 *
 * Twelve hours, which is well clear of both sides. The longest thing a log
 * legitimately carries over midnight is a bedtime dose wearing off the next
 * morning - the longest wear-off this app even suggests is seven hours. A
 * reading given the wrong way round, meanwhile, always lands close to a full
 * day out: an 8 AM dose entered against a 9 AM waking is twenty-three hours
 * later, not one hour earlier.
 */
export const CROSS_MIDNIGHT_LIMIT = 12 * 60;

/** Which day of the log a timeline minute falls on. 0 is the day logged. */
export function dayOffsetOf(minutes: number): number {
  return Math.floor(minutes / MINUTES_PER_DAY);
}

/**
 * Where a reading lands on the timeline: the first time it comes round at or
 * after `floor`, which is itself a timeline minute.
 *
 * Equal counts as after. A dose taken the moment someone woke up, or an
 * improvement felt the moment it was taken, is an answer people give.
 */
export function resolveAfter(time: TimeOfDay, floor: number): number {
  const sameDay = dayOffsetOf(floor) * MINUTES_PER_DAY + minutesOfDay(time);
  return sameDay >= floor ? sameDay : sameDay + MINUTES_PER_DAY;
}

/**
 * Whether a reading can honestly be read as coming after `floor`.
 *
 * Two ways it can. It is later on the same clock face, in which case the gap
 * does not matter - a dose fifteen hours after waking is a long day, not a
 * wrong one. Or it is earlier on the face but near enough behind to be the
 * small hours after it, which is what `CROSS_MIDNIGHT_LIMIT` draws the line at.
 */
export function isInOrder(time: TimeOfDay, floor: number): boolean {
  const sameDay = dayOffsetOf(floor) * MINUTES_PER_DAY + minutesOfDay(time);
  return (
    sameDay >= floor ||
    sameDay + MINUTES_PER_DAY - floor <= CROSS_MIDNIGHT_LIMIT
  );
}

/**
 * A point on the day's chain: a reading, where it landed, and the words for it.
 *
 * The two phrasings are both needed and neither reads as the other. `was`
 * finishes a sentence saying what the reading already is - "but you woke up at
 * 7:00 AM" - and `after` finishes one measuring from it - "30 mins after you
 * woke up".
 */
export type TimeFloor = {
  /** Minutes from midnight of the day logged; past 1440 once it crossed. */
  minutes: number;
  time: TimeOfDay;
  /** Completes "You chose 6:30 AM, but {was} at 7:00 AM". */
  was: string;
  /** Completes "30 mins {after}". */
  after: string;
};

/**
 * Why a reading was refused, in the words the user gave the day.
 *
 * Says the reading back, says what it clashes with, and says what to do - the
 * three things an error has to carry when the person reading it is being told
 * their answer was wrong.
 */
export function describeTooEarly(time: TimeOfDay, floor: TimeFloor): string {
  return `You chose ${formatTime12(time)}, but ${floor.was} at ${formatTime12(
    floor.time,
  )}. Please choose ${formatTime12(floor.time)} or later.`;
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
