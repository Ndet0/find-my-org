import { describe, expect, test } from 'bun:test'
import { NOTIFICATION_TYPES, notificationListQuerySchema } from '../src/notification'

describe('notificationListQuerySchema', () => {
  test('unread is false unless the string "true" is sent', () => {
    expect(notificationListQuerySchema.parse({}).unread).toBe(false)
    expect(notificationListQuerySchema.parse({ unread: 'true' }).unread).toBe(true)
    expect(notificationListQuerySchema.safeParse({ unread: 'false' }).success).toBe(false)
  })

  test('the five notification types are the ones the badge knows', () => {
    expect(NOTIFICATION_TYPES).toEqual(['task', 'project', 'user', 'system', 'message'])
  })
})
