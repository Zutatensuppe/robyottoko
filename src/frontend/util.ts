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

export default {
  wsClient,
  getFileFromDropEvent,
  getParam: (name: string) => (new URLSearchParams(window.location.search)).get(name) || '',
}
