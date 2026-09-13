import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test'
import { TASK_STATUSES, type TaskDetail, type TaskStatus } from '@opsflow/types/task'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { fail, mockApi, ok } from '../../test/api-mock'
import { renderWithProviders } from '../../test/render'
import { TaskStatusDialog } from './task-status-dialog'

/**
 * The confirmation behind every status change on a task. The status
 * controls only offer reachable moves (`nextTaskStatuses`, tested in
 * @opsflow/types); this is what happens once one is chosen. See
 * test/render.tsx for the rules.
 */

const task = {
  id: 't1',
  title: 'Write the report',
  status: 'pending',
  priority: 'medium',
  dueDate: null,
  project: { id: 'p1', name: 'Rollout' },
  assignee: null,
  description: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  completedAt: null,
  creator: null,
} satisfies TaskDetail

const LABELS: Record<TaskStatus, string> = {
  pending: 'Move to pending',
  in_progress: 'Start work',
  blocked: 'Mark blocked',
  completed: 'Mark completed',
}

let api: ReturnType<typeof mockApi> | undefined
let success: ReturnType<typeof spyOn<typeof toast, 'success'>> | undefined
let failure: ReturnType<typeof spyOn<typeof toast, 'error'>> | undefined

afterEach(() => {
  api?.restore()
  success?.mockRestore()
  failure?.mockRestore()
})
afterEach(cleanup)

function renderDialog(nextStatus: TaskStatus | null, currentStatus: TaskStatus = 'pending') {
  const onClose = mock(() => undefined)
  const rendered = renderWithProviders(
    <TaskStatusDialog
      taskId={task.id}
      title={task.title}
      currentStatus={currentStatus}
      nextStatus={nextStatus}
      onClose={onClose}
    />,
  )
  return { ...rendered, onClose }
}

describe('TaskStatusDialog', () => {
  test('is closed with no move chosen, or a move to the current status', async () => {
    api = mockApi({})
    renderDialog(null)
    await screen.findByText('stub route', { exact: false }).catch(() => undefined)
    expect(screen.queryByRole('alertdialog')).toBeNull()

    renderDialog('pending', 'pending')
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  test.each([...TASK_STATUSES])('offers the move to %s in its own words', async (status) => {
    api = mockApi({})
    renderDialog(status, status === 'pending' ? 'in_progress' : 'pending')

    const dialog = await screen.findByRole('alertdialog')
    expect(dialog.textContent).toContain(`${LABELS[status]} ${task.title}?`)
    expect(screen.getByRole('button', { name: LABELS[status] })).toBeTruthy()
  })

  test('confirming sends the move, announces the result and closes', async () => {
    api = mockApi({
      'PATCH /api/tasks/t1/status': ok({ ...task, status: 'in_progress' }),
    })
    success = spyOn(toast, 'success')
    const { onClose } = renderDialog('in_progress')

    await screen.findByRole('alertdialog')
    fireEvent.click(screen.getByRole('button', { name: 'Start work' }))

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(api.calls).toEqual([
      { method: 'PATCH', path: '/api/tasks/t1/status', body: { status: 'in_progress' } },
    ])
    expect(success).toHaveBeenCalledWith('Write the report is now in progress')
  })

  test('a refused move is announced and the dialog stays open', async () => {
    api = mockApi({
      'PATCH /api/tasks/t1/status': fail(
        'INVALID_TASK_TRANSITION',
        'A pending task cannot be completed',
        409,
      ),
    })
    failure = spyOn(toast, 'error')
    const { onClose } = renderDialog('completed')

    await screen.findByRole('alertdialog')
    fireEvent.click(screen.getByRole('button', { name: 'Mark completed' }))

    await waitFor(() => expect(failure).toHaveBeenCalledWith('A pending task cannot be completed'))
    expect(screen.getByRole('alertdialog')).toBeTruthy()
    expect(onClose).not.toHaveBeenCalled()
  })

  test('cancelling closes without a request', async () => {
    api = mockApi({})
    const { onClose } = renderDialog('blocked')

    await screen.findByRole('alertdialog')
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(api.calls).toEqual([])
  })
})
