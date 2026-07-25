/**
 * A soft three-note bell, synthesised at runtime — no audio files to ship.
 *
 * Deliberately gentle: sine partials, slow attack, long decay, and a low master gain.
 * A reminder should feel like a nudge, not an alarm clock.
 */

const MASTER_GAIN = 0.09 // quiet on purpose; raise cautiously
const NOTES = [880, 1108.73, 1318.51] // A5, C#6, E6 — a major triad, arpeggiated

let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as any).webkitAudioContext
  if (!Ctor) return null
  ctx ??= new Ctor()
  return ctx
}

/**
 * Browsers block audio until the user has interacted with the page. Call this from a real
 * click so the context is unlocked well before a reminder needs to sound.
 */
export function primeAudio(): void {
  const c = getContext()
  if (c && c.state === 'suspended') void c.resume()
}

function bell(c: AudioContext, freq: number, startAt: number): void {
  // Fundamental plus a quiet octave partial gives it a bell-like shimmer.
  const partials: Array<[number, number]> = [
    [freq, 1],
    [freq * 2, 0.22],
  ]

  for (const [f, level] of partials) {
    const osc = c.createOscillator()
    const gain = c.createGain()

    osc.type = 'sine'
    osc.frequency.value = f

    const peak = MASTER_GAIN * level
    gain.gain.setValueAtTime(0, startAt)
    gain.gain.linearRampToValueAtTime(peak, startAt + 0.02) // soft attack, no click
    gain.gain.exponentialRampToValueAtTime(peak * 0.28, startAt + 0.28)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 1.5)

    osc.connect(gain).connect(c.destination)
    osc.start(startAt)
    osc.stop(startAt + 1.6)
  }
}

/** Play the reminder chime. Safe to call when audio is unavailable — it just does nothing. */
export function playChime(): void {
  const c = getContext()
  if (!c) return
  if (c.state === 'suspended') void c.resume()

  const now = c.currentTime
  NOTES.forEach((freq, i) => bell(c, freq, now + i * 0.16))
}
