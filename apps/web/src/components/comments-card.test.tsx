import { afterEach, describe, expect, spyOn, test } from 'bun:test'
// The DOM must exist before anything renders; see test/setup.ts.
import '../../test/setup'
import type { Paginated } from '@opsflow/types/api'
import type { CommentListItem } from '@opsflow/types/comment'
import { toast } from 'sonner'
import { fail, mockApi, ok } from '../../test/api-mock'
import { cleanup, fireEvent, renderWithProviders, screen, waitFor } from '../../test/render'
import type { CommentActor } from './comments-card'

// Imported after the static imports so the DOM from test/setup.ts exists
// before its dependencies are linked; see task-status-dialog.test.tsx.
const { CommentsCard } = await import('./comments-card')

/**
 * The thread under a task or project. Who may see it is the parent's rule,
 * decided before this renders; what is checked here is what the card shows,
 * what it sends, and who gets a Delete button.
 */

const ME = 'u-me'
const OTHER = 'u-other'
const target = { kind: 'task', id: 't1' } as const

const mine = {
  id: 'c1',
  body: 'Looks good to me',
  createdAt: '2026-09-01T10:00:00.000Z',
  author: { id: ME, name: 'Emma Employee' },
  target,
} satisfies CommentListItem

const theirs = {
  id: 'c2',
  body: 'Ship it',
  createdAt: '2026-09-01T11:00:00.000Z',
  author: { id: OTHER, name: 'Marco Manager' },
  target,
} satisfies CommentListItem

function page(items: CommentListItem[]): Paginated<CommentListItem> {
  return { items, page: 1, pageSize: 100, total: items.length, totalPages: 1 }
}

const employee: CommentActor = { id: ME, role: 'employee' }
const manager: CommentActor = { id: OTHER, role: 'manager' }

let api: ReturnType<typeof mockApi> | undefined
let success: ReturnType<typeof spyOn<typeof toast, 'success'>> | undefined
let failure: ReturnType<typeof spyOn<typeof toast, 'error'>> | undefined

afterEach(() => {
  api?.restore()
  success?.mockRestore()
  failure?.mockRestore()
})
afterEach(cleanup)

async function renderCard(actor: CommentActor) {
  return renderWithProviders(<CommentsCard target={target} actor={actor} />)
}

describe('CommentsCard', () => {
  test('shows the thread with its authors and count', async () => {
    api = mockApi({ 'GET /api/tasks/t1/comments': ok(page([mine, theirs])) })
    await renderCard(employee)

    expect(await screen.findByText('Looks good to me')).toBeTruthy()
    expect(screen.getByText('Ship it')).toBeTruthy()
    expect(screen.getByText('Emma Employee')).toBeTruthy()
    expect(screen.getByText('Marco Manager')).toBeTruthy()
    expect(screen.getByText('2 comments')).toBeTruthy()
  })

  test('says so when the thread is empty', async () => {
    api = mockApi({ 'GET /api/tasks/t1/comments': ok(page([])) })
    await renderCard(employee)

    expect(await screen.findByText('No comments yet.')).toBeTruthy()
    expect(screen.getByText('0 comments')).toBeTruthy()
  })

  test('an employee may delete only their own comment', async () => {
    api = mockApi({ 'GET /api/tasks/t1/comments': ok(page([mine, theirs])) })
    await renderCard(employee)
    await screen.findByText('Ship it')

    const buttons = screen.getAllByRole('button', { name: /^Delete comment by/ })
    expect(buttons).toHaveLength(1)
    expect(buttons[0]?.getAttribute('aria-label')).toBe('Delete comment by Emma Employee')
  })

  test('a manager may delete any comment', async () => {
    api = mockApi({ 'GET /api/tasks/t1/comments': ok(page([mine, theirs])) })
    await renderCard(manager)
    await screen.findByText('Ship it')

    expect(screen.getAllByRole('button', { name: /^Delete comment by/ })).toHaveLength(2)
  })

  test('Post is disabled until something is typed', async () => {
    api = mockApi({ 'GET /api/tasks/t1/comments': ok(page([])) })
    await renderCard(employee)
    await screen.findByText('No comments yet.')

    const post = screen.getByRole('button', { name: 'Post' }) as HTMLButtonElement
    expect(post.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('Add a comment'), { target: { value: '   ' } })
    expect(post.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('Add a comment'), { target: { value: 'Hi' } })
    expect(post.disabled).toBe(false)
  })

  test('posts the comment, clears the box and says so', async () => {
    api = mockApi({
      'GET /api/tasks/t1/comments': ok(page([])),
      'POST /api/tasks/t1/comments': ok({ ...mine, body: 'Looks good' }, 201),
    })
    success = spyOn(toast, 'success').mockImplementation(() => '')
    await renderCard(employee)
    await screen.findByText('No comments yet.')

    const box = screen.getByLabelText('Add a comment') as HTMLTextAreaElement
    fireEvent.change(box, { target: { value: 'Looks good' } })
    fireEvent.click(screen.getByRole('button', { name: 'Post' }))

    await waitFor(() => expect(success).toHaveBeenCalledWith('Comment posted'))
    expect(api.calls).toContainEqual({
      method: 'POST',
      path: '/api/tasks/t1/comments',
      body: { body: 'Looks good' },
    })
    expect(box.value).toBe('')
  })

  test('keeps the text and reports the message when the API refuses', async () => {
    api = mockApi({
      'GET /api/tasks/t1/comments': ok(page([])),
      'POST /api/tasks/t1/comments': fail('VALIDATION_ERROR', 'Enter a comment', 422),
    })
    failure = spyOn(toast, 'error').mockImplementation(() => '')
    await renderCard(employee)
    await screen.findByText('No comments yet.')

    const box = screen.getByLabelText('Add a comment') as HTMLTextAreaElement
    fireEvent.change(box, { target: { value: 'Something' } })
    fireEvent.click(screen.getByRole('button', { name: 'Post' }))

    await waitFor(() => expect(failure).toHaveBeenCalledWith('Enter a comment'))
    expect(box.value).toBe('Something')
  })

  test('asks before deleting, and only sends once confirmed', async () => {
    api = mockApi({
      'GET /api/tasks/t1/comments': ok(page([mine])),
      'DELETE /api/comments/c1': ok(mine),
    })
    success = spyOn(toast, 'success').mockImplementation(() => '')
    await renderCard(employee)
    await screen.findByText('Looks good to me')

    fireEvent.click(screen.getByRole('button', { name: 'Delete comment by Emma Employee' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog.textContent).toContain('Delete this comment?')

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(api.calls.filter((call) => call.method === 'DELETE')).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: 'Delete comment by Emma Employee' }))
    await screen.findByRole('alertdialog')
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(success).toHaveBeenCalledWith('Comment deleted'))
    expect(api.calls).toContainEqual({
      method: 'DELETE',
      path: '/api/comments/c1',
      body: undefined,
    })
  })
})
