import { useRef } from 'react'

/**
 * Where focus goes when a dialog closes. Radix returns it to the dialog's
 * own `Trigger`; every dialog in this app is opened by ordinary buttons
 * and controlled with `open`, so there is no trigger and Radix would let
 * focus fall to the body — a keyboard user loses their place after every
 * confirmation. The opener is recorded in `onOpenAutoFocus`, which Radix
 * fires with focus still on it, and handed back in `onCloseAutoFocus`.
 */
export function useReturnFocus(): {
  onOpenAutoFocus: (event: Event) => void
  onCloseAutoFocus: (event: Event) => void
} {
  const opener = useRef<Element | null>(null)

  return {
    onOpenAutoFocus: () => {
      opener.current = document.activeElement
    },
    onCloseAutoFocus: (event) => {
      const target = opener.current
      if (target instanceof HTMLElement && target.isConnected) {
        event.preventDefault()
        target.focus()
      }
    },
  }
}
