import conf from './conf'
import user from './user'
import WsClient from './WsClient'

const wsClient = (path: string) => {
  const cfg = conf.getConf()
  const me = user.getMe()
  return new WsClient(`${cfg.wsBase}/${path}`, me ? me.token : '')
}

/**
 * Returns the first file from the drop event.
 * If there is none, returns null
 */
export const getFileFromDropEvent = (e: any): File | null => {
  if (e.dataTransfer.items) {
    // Use DataTransferItemList interface to access the file(s)
    for (let i = 0; i < e.dataTransfer.items.length; i++) {
      // If dropped items aren't files, reject them
      if (e.dataTransfer.items[i].kind === 'file') {
        return e.dataTransfer.items[i].getAsFile()
      }
    }
    return null
  }

  // Use DataTransfer interface to access the file(s)
  for (let i = 0; i < e.dataTransfer.files.length; i++) {
    return e.dataTransfer.files[i]
  }
  return null
}

const commonFonts = [
  'Arial', 'Arial Black', 'Arial Narrow',
  'Calibri', 'Cambria', 'Candara', 'Charter',
  'Comic Sans MS', 'Consolas', 'Constantia', 'Corbel',
  'Courier', 'Courier New', 'DejaVu Sans', 'DejaVu Serif', 'DejaVu Sans Mono',
  'FreeSans', 'FreeSerif',
  'Geneva', 'Georgia',
  'Helvetica', 'Helvetica Neue', 'Impact',
  'Lucida Console', 'Lucida Sans Unicode', 'Lucida Grande',
  'Menlo', 'Monaco', 'Nimbus Sans', 'Nimbus Roman',
  'Optima', 'Palatino',
  'San Francisco', 'Segoe UI',
  'Tahoma', 'Times', 'Times New Roman', 'Trebuchet MS',
  'Ubuntu', 'Ubuntu Mono',
  'Verdana',
]

const detectAvailableFonts = (fontList: string[]) => {
  const testString = 'mmmmmmmmmmlli' // string with wide and narrow characters
  const testSize = '72px'

  const baseFonts = ['monospace', 'sans-serif', 'serif']
  const defaultWidths: Record<string, number> = {}

  const body = document.body
  const span = document.createElement('span')
  span.style.fontSize = testSize
  span.style.position = 'absolute'
  span.style.left = '-9999px'
  span.textContent = testString
  body.appendChild(span)

  // Get default widths
  for (const baseFont of baseFonts) {
    span.style.fontFamily = baseFont
    defaultWidths[baseFont] = span.offsetWidth
  }

  const availableFonts = []

  for (const font of fontList) {
    for (const baseFont of baseFonts) {
      span.style.fontFamily = `${font},${baseFont}`
      const width = span.offsetWidth

      if (width !== defaultWidths[baseFont]) {
        availableFonts.push(font)
        break
      }
    }
  }

  body.removeChild(span)
  return availableFonts
}

let availableFonts: string[] | null = null
export const getAvailableFonts = (): string[] => {
  if (availableFonts === null) {
    availableFonts = detectAvailableFonts(commonFonts)
  }
  return availableFonts
}

export default {
  getAvailableFonts,
  wsClient,
  getFileFromDropEvent,
  getParam: (name: string) => (new URLSearchParams(window.location.search)).get(name) || '',
}
