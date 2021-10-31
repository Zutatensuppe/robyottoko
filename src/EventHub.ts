export function EventHub() {
  const cbs: Record<string, Function[]> = {}
  return {
    on: (what: string, cb: Function): void => {
      cbs[what] = cbs[what] || []
      cbs[what].push(cb)
    },
    trigger: (what: string, data: any): void => {
      if (!cbs[what]) {
        return
      }
      for (const cb of cbs[what]) {
        cb(data)
      }
    },
  }
}

export default {
  EventHub,
}
