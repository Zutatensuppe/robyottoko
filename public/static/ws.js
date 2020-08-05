export default class Ws {
  constructor(addr, protocols) {
    this.addr = addr
    this.protocols = protocols
    this.handle = null
    this.timeout = null
    this.queue = []
    this.onopen = () => {}
    this.onclose = () => {}
    this.onmessage = () => {}
    this._connect()
  }

  send (txt) {
    if (this.handle) {
      this.handle.send(txt)
    } else {
      this.queue.add(txt)
    }
  }

  _connect() {
    let ws = new WebSocket(this.addr, this.protocols)
    ws.onopen = (e) => {
      console.log('websocket onopen')
      if (this.timeout) {
        clearTimeout(this.timeout)
      }
      this.handle = ws
      // should have a queue worker
      while (this.queue.length > 0) {
        this.handle.send(this.queue.shift())
      }
      this.onopen(e)
    }
    ws.onmessage = (e) => {
      console.log('websocket onmessage')
      this.onmessage(e)
    }
    ws.onclose = (e) => {
      console.log('websocket onclose')
      this.handle = null
      this.timeout = setTimeout(() => { this._connect() }, 1000)
      this.onclose(e)
    }
  }
}
