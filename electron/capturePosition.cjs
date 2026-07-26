// Persists the quick-capture widget's position across restarts.
const fs = require('node:fs')
const path = require('node:path')
const { app } = require('electron')

function filePath() {
  return path.join(app.getPath('userData'), 'capture-position.json')
}

function loadCapturePosition() {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath(), 'utf8'))
    // Stored as { x, bottom } (bottom = y + height) so restoring works regardless of height mode
    if (typeof parsed.x === 'number' && typeof parsed.bottom === 'number') return parsed
    return null
  } catch {
    return null
  }
}

function saveCapturePosition(pos) {
  try {
    fs.writeFileSync(filePath(), JSON.stringify(pos))
  } catch {
    // Best effort — failed write just means widget reopens at default spot
  }
}

module.exports = { loadCapturePosition, saveCapturePosition }
