/**
 * The keys of `next` whose value differs from `previous`, for a PATCH.
 *
 * Every update endpoint treats an absent key as "leave it alone" and runs
 * its eligibility guards only on the keys that arrive — moving a task to a
 * project checks that the project is open; naming a client checks that it
 * is active. An edit form that resends every field therefore trips those
 * guards on records whose related rows have since closed or been archived,
 * turning a title fix on a task in a completed project into a 409. Sending
 * only what changed keeps an unrelated edit unrelated, and keeps the audit
 * trail from recording a "role changed" that did not happen.
 *
 * Both values are the wire shape the form would otherwise send, built from
 * the loaded record the same way, so the comparison is between like and
 * like: `null` against `null`, not `null` against `''`.
 */
export function changedFields<T extends Record<string, unknown>>(next: T, previous: T): Partial<T> {
  const changed: Partial<T> = {}

  for (const key of Object.keys(next) as (keyof T)[]) {
    if (!Object.is(next[key], previous[key])) {
      changed[key] = next[key]
    }
  }

  return changed
}

export function hasChanges(changes: Record<string, unknown>): boolean {
  return Object.keys(changes).length > 0
}
