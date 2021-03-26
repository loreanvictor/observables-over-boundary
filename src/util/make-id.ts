/**
 *
 * @returns A random string that is most probably unique.
 *
 */
export function makeId() {
  return Math.random().toString(36).substring(2)
}
