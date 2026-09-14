import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * The search box on every list page. Typing writes to the URL, so it is
 * debounced: one history entry and one request per pause, rather than per
 * keystroke.
 *
 * `value` is what the URL says, and the URL only catches up once the route's
 * loader has fetched the page. That lag is why the draft is not simply reset
 * whenever `value` changes: the field would type "ab", submit "a", and then
 * be snapped back to "a" when that fetch landed, dropping the "b" for good.
 * Instead the field remembers what it last submitted and only adopts the URL
 * when the URL moved by itself — the back button, a link — not when it is
 * merely confirming what was typed here.
 */
export function SearchField({
  id,
  value,
  placeholder,
  onChange,
}: {
  id: string
  value: string
  placeholder: string
  onChange: (value: string) => void
}) {
  const [draft, setDraft] = useState(value)
  const submitted = useRef(value)

  useEffect(() => {
    if (value !== submitted.current) {
      submitted.current = value
      setDraft(value)
    }
  }, [value])

  useEffect(() => {
    if (draft === submitted.current) {
      return
    }

    const timer = setTimeout(() => {
      submitted.current = draft
      onChange(draft)
    }, 300)

    return () => clearTimeout(timer)
  }, [draft, onChange])

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Search</Label>
      <Input
        id={id}
        type="search"
        placeholder={placeholder}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
    </div>
  )
}
