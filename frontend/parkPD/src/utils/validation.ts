/** E.164 allows at most 15 digits; 10 is the shortest number we accept. */
const MIN_PHONE_DIGITS = 10;
const MAX_PHONE_DIGITS = 15;

/** Max characters to accept in the input: 15 digits plus a leading '+'. */
export const PHONE_INPUT_MAX_LENGTH = MAX_PHONE_DIGITS + 1;

/** Drops everything except digits, preserving a leading '+' for country codes. */
export function sanitizePhoneNumber(input: string): string {
  const hasCountryCodePrefix = input.trimStart().startsWith('+');
  const digits = input.replace(/\D/g, '');
  return hasCountryCodePrefix ? `+${digits}` : digits;
}

/** Pragmatic check: a local part, an @, and a domain carrying a dot. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Returns an error message, or null when the email is usable. */
export function validateEmail(input: string): string | null {
  const trimmed = input.trim();

  if (!trimmed) {
    return 'Email address is required';
  }
  if (!EMAIL_PATTERN.test(trimmed)) {
    return 'Enter a valid email address';
  }
  return null;
}

/**
 * Renders a number for display, e.g. "+91 98765 43210".
 * The last 10 digits are treated as the national number, anything before it as
 * the country code.
 */
export function formatPhoneNumber(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length <= MIN_PHONE_DIGITS) {
    return digits.length === MIN_PHONE_DIGITS
      ? `${digits.slice(0, 5)} ${digits.slice(5)}`
      : digits;
  }

  const countryCode = digits.slice(0, -MIN_PHONE_DIGITS);
  const national = digits.slice(-MIN_PHONE_DIGITS);
  return `+${countryCode} ${national.slice(0, 5)} ${national.slice(5)}`;
}

/** Returns an error message, or null when the number is usable. */
export function validatePhoneNumber(input: string): string | null {
  const digits = input.replace(/\D/g, '');

  if (!digits) {
    return 'Phone number is required';
  }
  if (digits.length < MIN_PHONE_DIGITS) {
    return `Phone number must be at least ${MIN_PHONE_DIGITS} digits`;
  }
  if (digits.length > MAX_PHONE_DIGITS) {
    return `Phone number cannot be longer than ${MAX_PHONE_DIGITS} digits`;
  }
  return null;
}

/** Long enough for a mononym, short enough to catch a pasted paragraph. */
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 60;

/** Collapses runs of whitespace, so "Ada   Lovelace" is stored as one space. */
export function normalizeFullName(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

/** Returns an error message, or null when the name is usable. */
export function validateFullName(input: string): string | null {
  const name = normalizeFullName(input);

  if (!name) {
    return 'Full name is required';
  }
  if (name.length < MIN_NAME_LENGTH) {
    return 'Enter your full name';
  }
  if (name.length > MAX_NAME_LENGTH) {
    return `Full name cannot be longer than ${MAX_NAME_LENGTH} characters`;
  }
  // Deliberately the only character rule: names carry apostrophes, hyphens and
  // scripts we shouldn't be second-guessing, but a digit is a typo or a value
  // pasted in from another field.
  if (/\d/.test(name)) {
    return 'Full name cannot contain numbers';
  }
  return null;
}
