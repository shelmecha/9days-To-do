/** Window controls exposed by electron/preload.cjs. Absent in a plain browser. */
interface Win95Bridge {
  minimize: () => void
  close: () => void
}

declare global {
  interface Window {
    win95?: Win95Bridge
  }
}

export function desktopControls(): Win95Bridge | null {
  return typeof window !== 'undefined' && window.win95 ? window.win95 : null
}

export const isDesktop = (): boolean => desktopControls() !== null
