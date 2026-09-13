/**
 * The error shapes the API client throws and the screens describe. Kept
 * apart from `api.ts`, which imports react-native for `Platform`, so this can
 * be tested under Bun; `api.ts` and `components/message.tsx` re-export it.
 */

/** Flattened field errors from a `VALIDATION_ERROR` envelope. */
export type FieldErrorMap = Record<string, string[] | undefined>

/** A failure the API reported through the standard error envelope. */
export class ApiRequestError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

/** Maps a 422 envelope back onto form fields. Anything else is empty. */
export function fieldErrorsFrom(error: unknown): FieldErrorMap {
  if (
    !(error instanceof ApiRequestError) ||
    error.details === undefined ||
    error.details === null
  ) {
    return {}
  }

  if (typeof error.details !== 'object' || Array.isArray(error.details)) {
    return {}
  }

  const mapped: FieldErrorMap = {}

  for (const [key, value] of Object.entries(error.details)) {
    if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
      mapped[key] = value
    }
  }

  return mapped
}

/** One line for a failed screen: the refusal explained, or the message itself. */
export function describeError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 404) {
      return 'This record does not exist or is not part of your work.'
    }

    if (error.status === 403) {
      return 'Your role does not have permission to view this.'
    }

    return error.message
  }

  return error instanceof Error ? error.message : 'Something went wrong.'
}
