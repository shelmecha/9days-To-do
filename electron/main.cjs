// Electron shell for the 9days To-do web app.
// CommonJS (.cjs) on purpose: package.json sets "type": "module", which Electron's main
// process does not support.
const { app, BrowserWindow, Tray, Menu, ipcMain, screen, shell, nativeImage } = require('electron')
const path = require('node:path')
const { loadCapturePosition, saveCapturePosition } = require('./capturePosition.cjs')

const isDev = !app.isPackaged

/** Fixed vertical frame — must match --app-w / --app-h in src/styles/tokens.css. */
const WIDTH = 300
const HEIGHT = 500

const CAPTURE_WIDTH = 150
const CAPTURE_HEIGHTS = { idle: 100, input: 150 }
const CAPTURE_MARGIN = 12

let win = null
let tray = null
let quitting = false
let announcedTray = false
let captureActive = false
let preCaptureBounds = null
let moveDebounce = null

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
    // instead of failing to a blank window: VITE_DEV_URL=http://localhost:5175 electron .
    win.loadURL(process.env.VITE_DEV_URL || 'http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
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

function setupCaptureTracking() {
  win.on('moved', () => {
    if (!captureActive) return
    if (moveDebounce) clearTimeout(moveDebounce)
    moveDebounce = setTimeout(() => {
      const { x, y, width, height } = win.getBounds()
      saveCapturePosition({ x, bottom: y + height })
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
      if (!win) return
      captureActive = true
      preCaptureBounds = win.getBounds()

      let pos = loadCapturePosition()
      if (pos) {
        // Loaded position exists; clamp to current work area
        const display = screen.getDisplayNearestPoint({ x: pos.x, y: 0 })
        const workArea = display.workArea
        const clampedX = Math.max(
          workArea.x,
          Math.min(pos.x, workArea.x + workArea.width - CAPTURE_WIDTH),
        )
        const clampedBottom = Math.max(
          workArea.y + CAPTURE_HEIGHTS.idle,
          Math.min(pos.bottom, workArea.y + workArea.height),
        )
        pos = { x: clampedX, bottom: clampedBottom }
      } else {
        // No saved position; default to bottom-left of primary work area
        const workArea = screen.getPrimaryDisplay().workArea
        pos = {
          x: workArea.x + CAPTURE_MARGIN,
          bottom: workArea.y + workArea.height - CAPTURE_MARGIN,
        }
      }

      const height = CAPTURE_HEIGHTS.idle
      win.setBounds({ x: pos.x, y: pos.bottom - height, width: CAPTURE_WIDTH, height })
      win.setAlwaysOnTop(true)
      win.setSkipTaskbar(true)
    })

    ipcMain.on('capture:resize', (_e, mode) => {
      if (!win || !captureActive) return
      const newHeight = CAPTURE_HEIGHTS[mode]
      const bounds = win.getBounds()
      // Anchor at bottom: y moves up, height changes
      win.setSize(CAPTURE_WIDTH, newHeight, false)
      win.setPosition(bounds.x, bounds.y + (bounds.height - newHeight), false)
    })

    ipcMain.on('capture:exit', () => {
      if (!win) return
      captureActive = false
      if (moveDebounce) clearTimeout(moveDebounce)
      win.setAlwaysOnTop(false)
      win.setSkipTaskbar(false)
      if (preCaptureBounds) {
        win.setBounds(preCaptureBounds)
      } else {
        win.setBounds({ x: 0, y: 0, width: WIDTH, height: HEIGHT })
      }
    })

    app.on('activate', showWindow)
  })

  // No window-all-closed quit: hiding to the tray is the intended "close".
  app.on('before-quit', () => {
    quitting = true
  })
}
