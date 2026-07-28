// Electron shell for the 9days To-do web app.
// CommonJS (.cjs) on purpose: package.json sets "type": "module", which Electron's main
// process does not support.
const { app, BrowserWindow, Tray, Menu, ipcMain, screen, shell, nativeImage } = require('electron')
const path = require('node:path')
const { loadCapturePosition, saveCapturePosition } = require('./capturePosition.cjs')

const isDev = !app.isPackaged

/**
 * Turn off subpixel (ClearType) antialiasing.
 *
 * The UI is set in a pixel-traced MS Sans Serif recreation, and ClearType renders its edges with
 * red/purple colour fringing — the single most conspicuously un-1995 artifact on the screen, since
 * Win95 had no font smoothing at all. Measured: this takes ~1400 subpixel-coloured pixels to 0 over
 * a sample of the task list, converting them to neutral grey.
 *
 * Must be set before app.whenReady(). Note that the CSS properties usually recommended for this
 * (-webkit-font-smoothing, text-rendering) are no-ops on Windows Chromium — this switch is the only
 * thing that actually changes the raster.
 */
app.commandLine.appendSwitch('disable-lcd-text')

/** Fixed vertical frame — must match --app-w / --app-h in src/styles/tokens.css. */
const WIDTH = 300
const HEIGHT = 500

/**
 * Quick Capture widget geometry. These are the OUTER window sizes, and they must equal the
 * .capture box model in src/styles/global.css exactly — see the comment on that block:
 *   idle  = 3 + [26 strip centred in 34]                  + 3 = 40
 *   input = 3 + 26 (.field) + 4 (--gap) + 26 (strip)      + 3 = 62
 * Too small and the strip clips silently (the widget is overflow:hidden); too large and you get
 * a dead grey band.
 *
 * The idle height is 40 rather than the 28 the content needs because Windows enforces a minimum
 * of 39px (SM_CYMINTRACK) on any RESIZABLE window, and applyCaptureBounds has to flip resizable
 * on to resize at all. Measured: a requested 28 comes back as 39, and setMinimumSize(1, 1) does
 * not lift it. Width has no such floor.
 */
const CAPTURE_SIZES = {
  idle: { width: 112, height: 40 },
  input: { width: 200, height: 62 },
}
const CAPTURE_MARGIN = 12

let win = null
let tray = null
let quitting = false
let announcedTray = false
let captureActive = false
let preCaptureBounds = null
let moveDebounce = null
/**
 * The widget's anchor while in capture mode: its left edge and its BOTTOM edge.
 *
 * Every resize is computed from these stored values rather than from `win.getBounds()`. That is
 * deliberate: if a resize is ever clamped or partially applied, reading the result back and
 * building the next position on top of it lets the error compound, which is exactly how the
 * window used to walk down the screen on every open/cancel cycle.
 */
let captureX = null
let captureBottom = null
/** Our own setBounds fires 'moved'; without this the anchor would overwrite itself. */
let suppressMoved = false

function asset(file) {
  // Packaged: resources are next to the app dir. Dev: build/ at the repo root.
  return path.join(__dirname, '..', 'build', file)
}

function createWindow() {
  win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    useContentSize: true, // the numbers above are the viewport, not the outer frame
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    frame: false, // the app draws its own Win95 title bar
    backgroundColor: '#008080',
    icon: asset('icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (isDev) {
    // Vite hops to 5174, 5175, … when the default port is taken, so allow an override
    // instead of failing to a blank window: VITE_DEV_URL=http://localhost:5175/app.html
    //
    // Note /app.html, not the root: the dev server's root is the landing page for the demo
    // site. Loading / here gives you a working window showing the wrong thing, which is a
    // slower thing to notice than a blank one.
    win.loadURL(process.env.VITE_DEV_URL || 'http://localhost:5173/app.html')
  } else {
    // app.html, NOT index.html — index.html is the landing page. See vite.config.ts.
    win.loadFile(path.join(__dirname, '..', 'dist', 'app.html'))
  }

  // Closing hides to the tray instead of quitting — a closed app cannot fire reminders.
  win.on('close', (e) => {
    if (!quitting) {
      e.preventDefault()
      hideWindow()
    }
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

/**
 * Move the capture widget to `height`, keeping its bottom-left corner pinned.
 *
 * Two things here are load-bearing:
 *
 * 1. `setResizable`. The window is created `resizable: false`, and on Windows Electron enforces
 *    that by pinning the min/max size — so `setSize`/`setBounds` are silently CLAMPED. The old
 *    code paired a blocked resize with a position change that still applied, which is why the
 *    widget kept its expanded height on Cancel *and* slid 50px down the screen each time.
 * 2. A single atomic `setBounds`, not `setSize` + `setPosition` — no intermediate frame where the
 *    window is the new size at the old position.
 */
function applyCaptureBounds(size) {
  if (!win || captureX === null || captureBottom === null) return
  const { width, height } = size

  const display = screen.getDisplayNearestPoint({ x: captureX, y: captureBottom - height })
  const wa = display.workArea
  const x = Math.max(wa.x, Math.min(captureX, wa.x + wa.width - width))
  // Never let the bottom edge fall past the work area — that is what puts it under the taskbar.
  const bottom = Math.max(wa.y + height, Math.min(captureBottom, wa.y + wa.height))

  // The clamp result is deliberately NOT written back to captureX/captureBottom. Both clamp
  // bounds depend on the current size, so storing them would let the wide 'input' state drag the
  // anchor leftwards every time it opened near the right edge of the screen, and never give it
  // back — the same compounding drift as the setSize bug above, arriving by a different route.
  // captureX/captureBottom are the USER's anchor: they move on a real drag, or on capture:enter.

  suppressMoved = true
  win.setResizable(true)
  win.setBounds({ x, y: bottom - height, width, height })
  win.setResizable(false)
  suppressMoved = false
}

function setupCaptureTracking() {
  win.on('moved', () => {
    // Only a genuine user drag should move the anchor.
    if (!captureActive || suppressMoved) return
    const { x, y, height } = win.getBounds()
    captureX = x
    captureBottom = y + height
    if (moveDebounce) clearTimeout(moveDebounce)
    moveDebounce = setTimeout(() => {
      saveCapturePosition({ x: captureX, bottom: captureBottom })
    }, 400)
  })
}

function showWindow() {
  if (!win || win.isDestroyed()) return createWindow()
  // A hidden window may also be minimised; show() alone leaves it on the taskbar edge.
  if (win.isMinimized()) win.restore()
  win.show()
  win.setSkipTaskbar(false)
  win.focus()
  win.moveTop()
}

/**
 * Tell the user where the app went, the first time it vanishes into the tray.
 *
 * This is not decoration. With the portable build, double-clicking the exe while the app is
 * hidden takes 15–20 seconds to show the window (measured): the self-extracting stub unpacks
 * ~72 MB to a temp dir before Electron starts and `second-instance` can fire. Long enough
 * that a user assumes it's broken. The tray icon restores instantly, so point at it.
 */
function announceTray() {
  if (announcedTray || !tray) return
  announcedTray = true
  try {
    tray.displayBalloon({
      icon: nativeImage.createFromPath(asset('icon.png')),
      title: 'Still running down here',
      content: 'Reminders keep working. Click the tray icon to reopen, or Quit from its menu.',
    })
  } catch {
    // Balloons are Windows-only and can fail on locked-down shells. Not worth crashing over.
  }
}

function hideWindow() {
  win?.hide()
  announceTray()
}

function createTray() {
  const image = nativeImage.createFromPath(asset('tray.png'))
  tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image)
  tray.setToolTip('9days To-do — reminders active')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open 9days To-do', click: showWindow },
      { type: 'separator' },
      {
        label: 'Quit (stops reminders)',
        click: () => {
          quitting = true
          app.quit()
        },
      },
    ]),
  )
  tray.on('click', showWindow)
}

// Two copies would double every reminder chime.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  // Only reached when a second copy actually starts Electron; the portable stub often exits
// before this, which is why the tray balloon exists.
  app.on('second-instance', () => showWindow())

  app.whenReady().then(() => {
    createWindow()
    setupCaptureTracking()
    createTray()

    ipcMain.on('win:minimize', () => win?.minimize())
    ipcMain.on('win:close', () => hideWindow())

    ipcMain.handle('capture:enter', async () => {
      // Re-entry must be a no-op. `enterCapture()` is async, so a double-click on the title-bar
      // icon fires it twice before React unmounts the button — and the second call would store the
      // WIDGET's bounds as preCaptureBounds, losing the full window size for the rest of the
      // session. Exit then "restored" to 112×40 and the window could never be grown again.
      // Reproduced on the portable build, where the slower IPC round-trip widens the race.
      if (!win || captureActive) return
      captureActive = true
      preCaptureBounds = win.getBounds()

      const saved = loadCapturePosition()
      if (saved) {
        captureX = saved.x
        captureBottom = saved.bottom
      } else {
        // Bottom-left of the primary work area — above the taskbar, not behind it.
        const wa = screen.getPrimaryDisplay().workArea
        captureX = wa.x + CAPTURE_MARGIN
        captureBottom = wa.y + wa.height - CAPTURE_MARGIN
      }

      // Sanitise the anchor ONCE, here, against the resting size — so a position saved on a
      // monitor that has since been unplugged or rescaled still lands somewhere reachable.
      // applyCaptureBounds itself must not do this: it runs on every resize, and clamping the
      // stored anchor per-size is what would make the widget walk (see the note there).
      {
        const { width, height } = CAPTURE_SIZES.idle
        const wa = screen.getDisplayNearestPoint({ x: captureX, y: captureBottom - height })
          .workArea
        captureX = Math.max(wa.x, Math.min(captureX, wa.x + wa.width - width))
        captureBottom = Math.max(wa.y + height, Math.min(captureBottom, wa.y + wa.height))
      }

      applyCaptureBounds(CAPTURE_SIZES.idle)
      // 'screen-saver' is the level that floats above the Windows taskbar.
      win.setAlwaysOnTop(true, 'screen-saver')
      win.setSkipTaskbar(true)
    })

    ipcMain.on('capture:resize', (_e, mode) => {
      if (!win || !captureActive) return
      applyCaptureBounds(CAPTURE_SIZES[mode] ?? CAPTURE_SIZES.idle)
    })

    ipcMain.on('capture:exit', () => {
      if (!win) return
      captureActive = false
      captureX = null
      captureBottom = null
      if (moveDebounce) clearTimeout(moveDebounce)
      win.setAlwaysOnTop(false)
      win.setSkipTaskbar(false)
      // Same setResizable dance: the restore is a programmatic resize too, and would otherwise
      // be clamped to the capture widget's dimensions.
      //
      // Only the POSITION comes from preCaptureBounds. The app has exactly one size, so taking
      // the size from the constants means no stale or clobbered bounds can ever bring the window
      // back at widget size — the failure that made the window impossible to grow again.
      suppressMoved = true
      win.setResizable(true)
      win.setBounds({
        x: preCaptureBounds?.x ?? 0,
        y: preCaptureBounds?.y ?? 0,
        width: WIDTH,
        height: HEIGHT,
      })
      win.setResizable(false)
      suppressMoved = false
    })

    app.on('activate', showWindow)
  })

  // No window-all-closed quit: hiding to the tray is the intended "close".
  app.on('before-quit', () => {
    quitting = true
  })
}
