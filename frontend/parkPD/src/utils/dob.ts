/**
 * Age and date of birth are two readings of one fact. The profile form accepts
 * either, and derives the other here, so no screen has to hold two numbers that
 * could drift apart.
 *
 * The date of birth is the one that travels, as `DD/MM/YYYY` - the single
 * `dob` field the API takes.
 */

/** Bounds the age field and the calendar both read, so the two can't disagree. */
export const MIN_AGE = 13;
export const MAX_AGE = 120;

const DOB_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/** Midnight today, so comparisons turn on the day and not the time of day. */
function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Renders a date as `DD/MM/YYYY`. */
export function formatDob(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

/**
 * Parses `DD/MM/YYYY`, or null. Dates that only look valid are rejected: the
 * Date constructor rolls 31/02 over into March, so the parts are read back off
 * the result and compared with what went in.
 */
export function parseDob(value: string): Date | null {
  const match = DOB_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = Number(match[3]);
  const date = new Date(year, month, day);

  // Also catches two-digit years, which the constructor maps into the 1900s.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/** Full years between a birth date and today. */
export function ageFromDate(date: Date): number {
  const today = startOfToday();
  const years = today.getFullYear() - date.getFullYear();
  const beforeBirthday =
    today.getMonth() < date.getMonth() ||
    (today.getMonth() === date.getMonth() && today.getDate() < date.getDate());
  return beforeBirthday ? years - 1 : years;
}

/** The age a stored `dob` works out to, or null when it doesn't parse. */
export function dobToAge(dob: string): number | null {
  const date = parseDob(dob);
  return date === null ? null : ageFromDate(date);
}

/**
 * The date an age implies. Only the year is knowable from "23", so the day
 * lands on 1 January - and being the first day of the year, reading the age
 * back off it returns the number that was typed, whatever today's date is.
 */
export function ageToDob(age: number): string {
  return formatDob(new Date(startOfToday().getFullYear() - age, 0, 1));
}

/** The most recent birth date we accept: MIN_AGE years ago to the day. */
export function latestBirthDate(): Date {
  const today = startOfToday();
  return new Date(
    today.getFullYear() - MIN_AGE,
    today.getMonth(),
    today.getDate(),
  );
}

/** The earliest birth date we accept: MAX_AGE years ago to the day. */
export function earliestBirthDate(): Date {
  const today = startOfToday();
  return new Date(
    today.getFullYear() - MAX_AGE,
    today.getMonth(),
    today.getDate(),
  );
}

/**
 * Checks the derived date of birth, which is what the request carries. Both
 * inputs feed it, so this is the one rule the pair has to pass - though only
 * the age field can actually reach it, since the calendar won't hand back a
 * day outside the bounds above.
 */
export function validateDob(dob: string): string | null {
  const date = parseDob(dob);

  if (date === null) {
    return 'Enter your age or pick your date of birth';
  }
  if (date > latestBirthDate()) {
    return `You must be at least ${MIN_AGE} years old to use parkPD`;
  }
  if (date < earliestBirthDate()) {
    return 'Enter a valid date of birth';
  }
  return null;
}
