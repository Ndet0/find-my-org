import { describe, expect, test } from 'bun:test'
import { ApiRequestError, describeError, fieldErrorsFrom } from './errors'

describe('describeError', () => {
  test('explains a 404 as scoping and a 403 as the role', () => {
    expect(describeError(new ApiRequestError('NOT_FOUND', 'Task not found', 404))).toBe(
      'This record does not exist or is not part of your work.',
    )
    expect(describeError(new ApiRequestError('FORBIDDEN', 'No', 403))).toBe(
      'Your role does not have permission to view this.',
    )
  })

  test('otherwise repeats what the API or the runtime said', () => {
    expect(describeError(new ApiRequestError('PROJECT_CLOSED', 'The project is closed', 409))).toBe(
      'The project is closed',
    )
    expect(describeError(new Error('Network request failed'))).toBe('Network request failed')
  })

  test('has one line for anything that is not an error', () => {
    expect(describeError('boom')).toBe('Something went wrong.')
    expect(describeError(undefined)).toBe('Something went wrong.')
  })
})

describe('fieldErrorsFrom', () => {
  test('keeps only the string arrays from an envelope', () => {
    const error = new ApiRequestError('VALIDATION_ERROR', 'Check the form', 422, {
      title: ['Enter a title'],
      mixed: ['a', 1],
      count: 'not an array',
    })

    expect(fieldErrorsFrom(error)).toEqual({ title: ['Enter a title'] })
  })

  test.each([undefined, null, 'string', ['a']])('details of %p map to nothing', (details) => {
    expect(fieldErrorsFrom(new ApiRequestError('X', 'x', 400, details))).toEqual({})
  })

  test('anything that is not a validation failure maps to nothing', () => {
    expect(fieldErrorsFrom(new Error('boom'))).toEqual({})
    expect(fieldErrorsFrom(undefined)).toEqual({})
  })
})
