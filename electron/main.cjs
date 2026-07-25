// Electron shell for the 9days To-do web app.
// CommonJS (.cjs) on purpose: package.json sets "type": "module", which Electron's main
// process does not support.
const { app, BrowserWindow, Tray, Menu, ipcMain, shell, nativeImage } = require('electron')
const path = require('node:path')

const isDev = !app.isPackaged

/** Fixed vertical frame — must match --app-w / --app-h in src/styles/tokens.css. */
const WIDTH = 300
const HEIGHT = 500

let win = null
let tray = null
let quitting = false
let announcedTray = false

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
    createTray()

    ipcMain.on('win:minimize', () => win?.minimize())
    ipcMain.on('win:close', () => hideWindow())

    app.on('activate', showWindow)
  })

  // No window-all-closed quit: hiding to the tray is the intended "close".
  app.on('before-quit', () => {
    quitting = true
  })
}
