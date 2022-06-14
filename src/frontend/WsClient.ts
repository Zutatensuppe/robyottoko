import { logger } from '../common/fn'
import WsWrapper from './WsWrapper'

const log = logger('WsClient.ts')

type CallbackFn = (...args: any[]) => void

export default class WsClient extends WsWrapper {
  private _on: Record<string, Record<string, CallbackFn[]>> = {}

  constructor(
    addr: string,
    protocols: string,
  ) {
    super(addr, protocols)
    this.onopen = (e) => {
      this._dispatch('socket', 'open', e)
    }
    this.onmessage = (e) => {
      this._dispatch('socket', 'message', e)
      if (this._on['message']) {
        const d = this._parseMessageData(e.data)
        if (d.event) {
          this._dispatch('message', `${d.event}`, d.data, d)
        }
      }
    }
    this.onclose = (e) => {
      this._dispatch('socket', 'close', e)
    }
  }

  onSocket(tag: string | string[], callback: CallbackFn) {
    this.addEventListener('socket', tag, callback)
  }

  onMessage(tag: string | string[], callback: CallbackFn) {
    this.addEventListener('message', tag, callback)
  }

  addEventListener(type: string, tag: string | string[], callback: CallbackFn) {
    const tags = Array.isArray(tag) ? tag : [tag]
    this._on[type] = this._on[type] || {}
    for (const t of tags) {
      this._on[type][t] = this._on[type][t] || []
      this._on[type][t].push(callback)
    }
  }

  _parseMessageData(data: string) {
    try {
      const d = JSON.parse(data)
      if (d.event) {
        d.data = d.data || null
        return d
      }
    } catch (e) {
      log.info(e)
    }
    return { event: null, data: null }
  }

  _dispatch(type: string, tag: string, ...args: any[]) {
    const t = this._on[type] || {}
    const callbacks = (t[tag] || [])
    if (callbacks.length === 0) {
      return
    }

    log.info(`ws dispatch ${type} ${tag}`)
    for (const callback of callbacks) {
      callback(...args)
    }
  }
}
