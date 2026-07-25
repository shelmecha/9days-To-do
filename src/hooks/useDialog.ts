import { useEffect, useRef, type RefObject } from 'react'

/**
 * The plumbing every dismissible dialog needs: trap Tab inside it, close on Escape, and —
 * the part whose absence caused a real bug — put keyboard focus BACK where it came from
 * when the dialog unmounts.
 *
 * Without the restore, closing a dialog left focus on `document.body`. Everything the user
 * typed next went nowhere, which looked exactly like a broken quick-add box. The reminder
 * dialog made it worse because it opens on a timer rather than a click, so the user never
 * touched the input themselves and had no reason to suspect focus.
 *
 * Not used by the Reckoning: that overlay is deliberately inescapable, and the list it
 * reveals focuses its own input on mount.
 */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/** Where focus goes if whatever opened the dialog is gone by the time it closes. */
const FALLBACK_ID = 'qa'

export function useDialog(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  const returnTo = useRef<HTMLElement | null>(null)

  useEffect(() => {
    returnTo.current = document.activeElement as HTMLElement | null
    return () => {
      const prev = returnTo.current
      // The trigger may have been removed while the dialog was open — completing a task
      // from the reminder dialog unmounts its row, for instance.
      const target =
        prev && prev.isConnected && prev !== document.body
          ? prev
          : document.getElementById(FALLBACK_ID)
      target?.focus()
    }
  }, [])

  // `onClose` lives in a ref so a caller passing an inline arrow doesn't rebind the
  // listener on every render.
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close.current()
        return
      }
      if (e.key !== 'Tab') return

      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetWidth > 0 || el.offsetHeight > 0,
      )
      if (items.length === 0) return

      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement

      if (e.shiftKey && (active === first || !node.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    node.addEventListener('keydown', onKeyDown)
    return () => node.removeEventListener('keydown', onKeyDown)
  }, [ref])
}
