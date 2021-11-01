class EventHub {
  private cbs: Record<string, Function[]> = {}

  on(what: string, cb: Function): void {
    this.cbs[what] = this.cbs[what] || []
    this.cbs[what].push(cb)
  }

  trigger(what: string, data: any): void {
    if (!this.cbs[what]) {
      return
    }
    for (const cb of this.cbs[what]) {
      cb(data)
    }
  }
}

export default EventHub
