/**
 * 16×16 pixel icons for the Quick Capture strip.
 *
 * Drawn as integer-coordinate <rect> fills only — no strokes, because a 1px stroke straddles the
 * coordinate it is drawn on and needs half-pixel offsets to stay sharp, whereas a fill never
 * does. `shape-rendering="crispEdges"` is a second guard for fractional-DPI displays.
 *
 * Colours come from tokens.css so they track the palette. The tick uses --check, which is the
 * same #007000 as COLORS.check in scripts/make-icons.mjs (the tray and exe artwork).
 *
 * Two related components in one file, the way Badge.tsx pairs ShameBadge and TagBadge.
 */

const svgProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  shapeRendering: 'crispEdges' as const,
  'aria-hidden': true,
  focusable: false,
}

/** A lined page in Win95 tooltip yellow. */
export function NoteIcon() {
  return (
    <svg {...svgProps}>
      {/* 10 wide at x=3 and 14 tall at y=1 — centred on the grid both ways. */}
      <rect x="3" y="1" width="10" height="14" fill="var(--dk-shadow)" />
      <rect x="4" y="2" width="8" height="12" fill="var(--note)" />
      {/* Four rules 2px apart. The last is short, so it reads as text rather than a grid. */}
      <rect x="5" y="4" width="6" height="1" fill="var(--shadow)" />
      <rect x="5" y="6" width="6" height="1" fill="var(--shadow)" />
      <rect x="5" y="8" width="6" height="1" fill="var(--shadow)" />
      <rect x="5" y="10" width="4" height="1" fill="var(--shadow)" />
    </svg>
  )
}

/** A sunken Win95 checkbox with a green tick. */
export function TodoIcon() {
  return (
    <svg {...svgProps}>
      {/* 12×12 box at (2,2), with --bevel-in spelled out as rects: outer shadow/hilite pair,
          inner dk-shadow/face-light pair. Interior white runs x 4–11, y 4–11. */}
      <rect x="2" y="2" width="12" height="12" fill="var(--field)" />
      <rect x="2" y="2" width="12" height="1" fill="var(--shadow)" />
      <rect x="2" y="2" width="1" height="12" fill="var(--shadow)" />
      <rect x="3" y="3" width="10" height="1" fill="var(--dk-shadow)" />
      <rect x="3" y="3" width="1" height="10" fill="var(--dk-shadow)" />
      <rect x="2" y="13" width="12" height="1" fill="var(--hilite)" />
      <rect x="13" y="2" width="1" height="12" fill="var(--hilite)" />
      <rect x="3" y="12" width="10" height="1" fill="var(--face-light)" />
      <rect x="12" y="3" width="1" height="10" fill="var(--face-light)" />
      {/* Tick: seven 1×3 columns stepping down then up, short left arm and long right arm.
          Spans x 5–11, y 5–11, so it sits entirely inside the white interior. */}
      <rect x="5" y="7" width="1" height="3" fill="var(--check)" />
      <rect x="6" y="8" width="1" height="3" fill="var(--check)" />
      <rect x="7" y="9" width="1" height="3" fill="var(--check)" />
      <rect x="8" y="8" width="1" height="3" fill="var(--check)" />
      <rect x="9" y="7" width="1" height="3" fill="var(--check)" />
      <rect x="10" y="6" width="1" height="3" fill="var(--check)" />
      <rect x="11" y="5" width="1" height="3" fill="var(--check)" />
    </svg>
  )
}
