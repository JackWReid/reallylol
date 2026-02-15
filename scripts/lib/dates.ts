/** Date helper utilities. */

/** YYYY-MM-DD */
export function todayDate(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

/** YYYY-MM-DDTHH:MM:SS */
export function nowDatetime(): string {
  const d = new Date();
  return d.toISOString().slice(0, 19);
}
