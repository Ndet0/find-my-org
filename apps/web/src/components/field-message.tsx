function stringifyError(error: unknown): string | undefined {
  if (error === undefined || error === null) {
    return undefined
  }

  if (typeof error === 'string') {
    return error
  }

  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }

  return undefined
}

export function FieldMessage({ errors, server }: { errors: unknown[]; server?: string }) {
  const message = server ?? stringifyError(errors[0])

  if (!message) {
    return null
  }

  return <p className="text-sm text-destructive">{message}</p>
}
