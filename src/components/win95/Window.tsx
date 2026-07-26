import type { ReactNode } from 'react'
import { desktopControls } from '../../lib/desktop'

interface Props {
  title: string
  children: ReactNode
  /** Rendered under the title bar, above the body. */
  toolbar?: ReactNode
  /**
   * Show the title-bar buttons. In the Electron shell the window is frameless, so on the
   * main window these are the real minimise/close controls; in a browser they're decorative.
   */
  chrome?: boolean
  /**
   * Called when a "Quick capture" button is clicked. Only rendered if provided.
   * Never shown in the reckoning overlay or note editor (chrome={false} paths).
   */
  onEnterCapture?: () => void
}

export function Window({ title, children, toolbar, chrome = true, onEnterCapture }: Props) {
  const controls = desktopControls()

  return (
    <div className="win">
      <div className="titlebar">
        <span>{title}</span>
        {chrome &&
          (controls ? (
            <span className="titlebar__buttons">
              {onEnterCapture && (
                <button
                  className="titlebar__btn"
                  onClick={onEnterCapture}
                  aria-label="Quick capture"
                  title="Quick capture"
                >
                  ▪
                </button>
              )}
              <button
                className="titlebar__btn"
                onClick={controls.minimize}
                aria-label="Minimise"
                title="Minimise"
              >
                _
              </button>
              <button
                className="titlebar__btn"
                onClick={controls.close}
                aria-label="Close to tray"
                title="Close to tray — reminders keep running"
              >
                ✕
              </button>
            </span>
          ) : (
            <span className="titlebar__buttons" aria-hidden="true">
              <span className="titlebar__btn">_</span>
              <span className="titlebar__btn">□</span>
              <span className="titlebar__btn">✕</span>
            </span>
          ))}
      </div>
      {toolbar}
      <div className="win__body">{children}</div>
    </div>
  )
}
