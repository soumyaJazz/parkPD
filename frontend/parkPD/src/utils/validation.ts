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
