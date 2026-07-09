/** Normalizes to 10-digit Indian mobile (no country code). */
export function normalizeIndianMobile(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits;
}

/** Valid Indian mobile: 10 digits starting with 6–9. */
export function isValidIndianMobile(phone: string): boolean {
  const digits = normalizeIndianMobile(phone);
  return /^[6-9]\d{9}$/.test(digits);
}

export const INDIAN_MOBILE_ERROR =
  "Enter a valid 10-digit Indian mobile number (starting with 6–9).";
