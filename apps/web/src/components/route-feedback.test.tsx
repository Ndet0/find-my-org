import { afterEach, describe, expect, mock, test } from 'bun:test'
// The DOM must exist before anything renders; see test/setup.ts.
import '../../test/setup'
import { ApiRequestError } from '@/lib/api'
import { mockApi } from '../../test/api-mock'
import {
  cleanup,
  fireEvent,
  render,
  renderWithProviders,
  screen,
  testQueryClient,
} from '../../test/render'

// The component is imported after the static imports have run, so the DOM
// from test/setup.ts exists before its dependencies are linked: libraries
// decide at load time whether a document exists (layout effects, portals),
// and `bun test` from the repository root has no preload to settle that.
const {
  DetailPending,
  describe: describeError,
  ListPending,
  RouteError,
  RouteNotFound,
  RoutePending,
} = await import('./route-feedback')
const { MessageRow, RefreshFailed } = await import('./table-message')

/**
 * The feedback states the router and the list pages show instead of a page:
 * still loading, failed, nothing here. See test/render.tsx for the rules.
 */

let api: ReturnType<typeof mockApi> | undefined

afterEach(() => api?.restore())
afterEach(cleanup)

describe('describe()', () => {
  test('explains a 404 as scoping, not deletion, and does not offer a retry', () => {
    expect(describeError(new Error('x'), 404)).toEqual({
      title: 'Not found',
      description: 'This record does not exist or is not part of your work.',
      retryable: false,
    })
  })

  test('explains a 403 as the role, and does not offer a retry', () => {
    expect(describeError(new Error('x'), 403)).toEqual({
      title: 'No access',
      description: 'Your role does not have permission to view this page.',
      retryable: false,
    })
  })

  test('anything else is retryable and carries the message, or a fallback', () => {
    expect(describeError(new Error('Database is away'), 500)).toEqual({
      title: 'Something went wrong',
      description: 'Database is away',
      retryable: true,
    })
    expect(describeError(new Error(''), undefined).description).toBe(
      'The page could not be loaded.',
    )
  })
})

describe('the pending states', () => {
  test.each([
    ['RoutePending', RoutePending],
    ['ListPending', ListPending],
    ['DetailPending', DetailPending],
  ])('%s is a busy output region', (_name, Pending) => {
    const { container } = render(<Pending />)
    expect(container.querySelector('output[aria-busy="true"]')).not.toBeNull()
  })
})

describe('RefreshFailed', () => {
  test('says the list is stale, explains why, and offers a retry', () => {
    const onRetry = mock(() => undefined)
    render(<RefreshFailed error={new ApiRequestError('FORBIDDEN', 'No', 403)} onRetry={onRetry} />)

    const alert = screen.getByRole('alert')
    expect(alert.textContent).toBe(
      'Could not refresh this list. Your role does not have permission to view this page.Try again',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})

describe('MessageRow', () => {
  test('spans the table and carries its message', () => {
    render(
      <table>
        <tbody>
          <MessageRow colSpan={6}>No tasks match these filters.</MessageRow>
        </tbody>
      </table>,
    )

    const cell = screen.getByRole('cell')
    expect(cell.textContent).toBe('No tasks match these filters.')
    expect(cell.getAttribute('colspan')).toBe('6')
  })
})

describe('RouteError', () => {
  test('a 403 explains the refusal without a retry', async () => {
    api = mockApi({})
    await renderWithProviders(
      <RouteError error={new ApiRequestError('FORBIDDEN', 'No', 403)} reset={() => undefined} />,
    )

    await screen.findByText('No access')
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Go to dashboard' })).toBeTruthy()
  })

  test('a 500 carries the message and offers a retry', async () => {
    api = mockApi({})
    await renderWithProviders(
      <RouteError
        error={new ApiRequestError('INTERNAL', 'Database is away', 500)}
        reset={() => undefined}
      />,
    )

    await screen.findByText('Something went wrong')
    expect(screen.getByText('Database is away')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  })

  test('a 401 drops the cached profile and heads for the login page', async () => {
    api = mockApi({})
    const queryClient = testQueryClient()
    queryClient.setQueryData(['current-user'], { id: 'u1' })
    const { router } = await renderWithProviders(
      <RouteError error={new ApiRequestError('UNAUTHORIZED', 'No', 401)} reset={() => undefined} />,
      { queryClient },
    )

    // "Signed out" shows only until the redirect lands, which is within the
    // settled render; what remains is the destination and the emptied cache.
    await screen.findByText('stub route')
    expect(router.state.location.pathname).toBe('/login')
    expect(queryClient.getQueryData(['current-user'])).toBeUndefined()
  })
})

describe('RouteNotFound', () => {
  test('names the problem and offers the dashboard', async () => {
    api = mockApi({})
    await renderWithProviders(<RouteNotFound />)

    await screen.findByText('Page not found')
    expect(screen.getByRole('link', { name: 'Go to dashboard' })).toBeTruthy()
  })
})
