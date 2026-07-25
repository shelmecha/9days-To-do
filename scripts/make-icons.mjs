/**
 * Generates the app icon (build/icon.ico) and tray icon (build/tray.png).
 *
 * Written as code rather than committed binaries so the artwork stays reviewable and
 * regenerable: `npm run icons`. It draws a small Win95 window with a checkmark.
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'build')

const COLORS = {
  desktop: [0, 128, 128, 255],
  face: [192, 192, 192, 255],
  hilite: [255, 255, 255, 255],
  shadow: [128, 128, 128, 255],
  dark: [0, 0, 0, 255],
  title: [0, 0, 128, 255],
  check: [0, 112, 0, 255],
}

/** Distance from point p to segment ab. */
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  const cx = ax + t * dx
  const cy = ay + t * dy
  return Math.hypot(px - cx, py - cy)
}

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4)
  const s = (v) => Math.round((v / 256) * size) // scale from the 256px design grid

  const win = { x0: s(34), y0: s(58), x1: s(222), y1: s(204) }
  const titleH = s(28)
  const check = {
    ax: s(84),
    ay: s(146),
    bx: s(114),
    by: s(176),
    cx: s(176),
    cy: s(104),
    w: Math.max(1.5, s(13) / 2),
  }

  const put = (x, y, [r, g, b, a]) => {
    const i = (y * size + x) * 4
    rgba[i] = r
    rgba[i + 1] = g
    rgba[i + 2] = b
    rgba[i + 3] = a
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let color = COLORS.desktop

      const inWin = x >= win.x0 && x <= win.x1 && y >= win.y0 && y <= win.y1
      if (inWin) {
        const bevel = Math.max(1, s(4))
        const onTopLeft = x < win.x0 + bevel || y < win.y0 + bevel
        const onBottomRight = x > win.x1 - bevel || y > win.y1 - bevel

        if (onTopLeft) color = COLORS.hilite
        else if (onBottomRight) color = COLORS.shadow
        else if (y < win.y0 + bevel + titleH) color = COLORS.title
        else color = COLORS.face

        // Checkmark sits in the window body, below the title bar.
        if (!onTopLeft && !onBottomRight && y >= win.y0 + bevel + titleH) {
          const d = Math.min(
            distToSegment(x, y, check.ax, check.ay, check.bx, check.by),
            distToSegment(x, y, check.bx, check.by, check.cx, check.cy),
          )
          if (d <= check.w) color = COLORS.check
        }
      }

      put(x, y, color)
    }
  }

  return rgba
}

// ---- minimal PNG encoder ----

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(rgba, size) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  // 10-12: compression, filter, interlace — all 0

  // Each scanline is prefixed with filter type 0 (none).
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** ICO containing PNG payloads (supported by Windows for sizes up to 256). */
function encodeIco(entries) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(entries.length, 4)

  const dir = []
  let offset = 6 + entries.length * 16

  for (const { size, png } of entries) {
    const e = Buffer.alloc(16)
    e[0] = size >= 256 ? 0 : size // 0 means 256
    e[1] = size >= 256 ? 0 : size
    e[2] = 0 // palette
    e[3] = 0
    e.writeUInt16LE(1, 4) // color planes
    e.writeUInt16LE(32, 6) // bits per pixel
    e.writeUInt32BE(0, 8)
    e.writeUInt32LE(png.length, 8)
    e.writeUInt32LE(offset, 12)
    dir.push(e)
    offset += png.length
  }

  return Buffer.concat([header, ...dir, ...entries.map((e) => e.png)])
}

mkdirSync(OUT, { recursive: true })

const sizes = [16, 32, 48, 64, 128, 256]
const entries = sizes.map((size) => ({ size, png: encodePng(drawIcon(size), size) }))

writeFileSync(join(OUT, 'icon.ico'), encodeIco(entries))
writeFileSync(join(OUT, 'icon.png'), entries.at(-1).png)
writeFileSync(join(OUT, 'tray.png'), encodePng(drawIcon(32), 32))

console.log(`wrote build/icon.ico (${sizes.join(', ')}px), build/icon.png, build/tray.png`)
