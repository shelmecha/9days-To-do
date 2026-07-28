import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * A Win95 tooltip for a task's notes.
 *
 * Fixed-position and portaled to <body> on purpose. `.tasklist` is `overflow-y: auto` and
 * `.win__body` is `overflow-x: hidden`, so an in-flow popover would be clipped the moment it
 * reached a list edge — and in a 300×500 frame it reaches one immediately. Fixed positioning
 * escapes every overflow ancestor; the portal removes any chance of a transformed ancestor
 * quietly becoming the containing block.
 */

/** Breathing room between the tooltip and both its anchor and the window edge. Even, per --lh. */
const GAP = 4

interface Props {
  text: string
  /** Live rect of the element the tooltip belongs to, measured when the tooltip opened. */
  anchor: DOMRect
}

export function NoteTip({ text, anchor }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  // Rendered off-screen for one frame, then measured and placed — a tooltip that paints in the
  // wrong spot and jumps is worse than one that appears a frame late.
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const { width, height } = node.getBoundingClientRect()

    const left = Math.max(GAP, Math.min(anchor.left, window.innerWidth - width - GAP))
    const below = anchor.bottom + GAP
    // Flip above the anchor rather than run off the bottom of the frame.
    const top = below + height > window.innerHeight - GAP ? anchor.top - height - GAP : below

    setPos({ left, top: Math.max(GAP, top) })
  }, [text, anchor])

  return createPortal(
    <div
      ref={ref}
      className="notetip"
      role="tooltip"
      style={
        pos
          ? { left: pos.left, top: pos.top }
          : // Measurable but invisible for the first frame.
            { left: 0, top: 0, visibility: 'hidden' }
      }
    >
      {text}
    </div>,
    document.body,
  )
}
