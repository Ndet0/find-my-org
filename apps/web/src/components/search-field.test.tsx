import { afterEach, describe, expect, test } from 'bun:test'
// The DOM must exist before anything renders; see test/setup.ts.
import '../../test/setup'
import { cleanup, fireEvent, render, screen, waitFor } from '../../test/render'

const { SearchField } = await import('./search-field')

afterEach(cleanup)

/**
 * The list routes only update `value` once their loader has fetched the
 * page, so the URL trails the field. These pin down that the trailing URL
 * never overwrites what was typed after it, while a URL that moved on its
 * own — the back button — still does.
 */
describe('SearchField', () => {
  test('a URL catching up with what was typed does not drop later keystrokes', async () => {
    const submitted: string[] = []
    const onChange = (value: string) => {
      submitted.push(value)
    }
    const view = render(<SearchField id="s" placeholder="p" value="" onChange={onChange} />)
    const box = screen.getByLabelText('Search') as HTMLInputElement

    fireEvent.change(box, { target: { value: 'a' } })
    await waitFor(() => expect(submitted).toEqual(['a']))

    fireEvent.change(box, { target: { value: 'ab' } })
    // The loader for "a" resolves now, so the URL reports "a".
    view.rerender(<SearchField id="s" placeholder="p" value="a" onChange={onChange} />)

    expect(box.value).toBe('ab')
    await waitFor(() => expect(submitted).toEqual(['a', 'ab']))
  })

  test('a URL that moved by itself resets the field', async () => {
    const submitted: string[] = []
    const onChange = (value: string) => {
      submitted.push(value)
    }
    const view = render(<SearchField id="s" placeholder="p" value="" onChange={onChange} />)
    const box = screen.getByLabelText('Search') as HTMLInputElement

    fireEvent.change(box, { target: { value: 'ab' } })
    await waitFor(() => expect(submitted).toEqual(['ab']))
    view.rerender(<SearchField id="s" placeholder="p" value="ab" onChange={onChange} />)

    // Back button: the URL no longer carries a search.
    view.rerender(<SearchField id="s" placeholder="p" value="" onChange={onChange} />)

    expect(box.value).toBe('')
    // Adopting the URL is not a submission.
    expect(submitted).toEqual(['ab'])
  })
})
