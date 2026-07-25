/**
 * Date logic for the Reckoning. Pure functions, no React, no globals.
 *
 * Everything here works in the user's LOCAL calendar date. Using UTC would fire the
 * reckoning at a strange local hour and would misclassify late-evening tasks as
 * belonging to tomorrow.
 */

/** The local calendar date as YYYY-MM-DD. Not UTC — see module note. */
export function localDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Should the reckoning fire?
 *
 * True only when today is strictly LATER than the last reckoning. A date in the future
 * (clock moved backwards, travel across timezones, skewed system clock) must not fire —
 * otherwise a user could be forced through a reckoning repeatedly.
 *
 * A null lastDate means "never reckoned": don't fire. A brand-new user has no leftovers
 * by definition, and greeting a first-time visitor with a blocking modal is hostile.
 */
export function isNewDay(lastDate: string | null, now: Date): boolean {
  if (lastDate === null) return false
  return localDateString(now) > lastDate
}

/** Shift a YYYY-MM-DD date string by whole days. Used by the "Simulate tomorrow" control. */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  // Construct at local noon so a DST shift can never roll the date over.
  const dt = new Date(y, m - 1, d, 12, 0, 0)
  dt.setDate(dt.getDate() + days)
  return localDateString(dt)
}

/** Whole days between two YYYY-MM-DD strings (b - a). */
export function daysBetween(a: string, b: string): number {
  const parse = (s: string) => {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d, 12, 0, 0).getTime()
  }
  return Math.round((parse(b) - parse(a)) / 86_400_000)
}
