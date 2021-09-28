export function EventHub() {
  const cbs = {}
  return {
    on: (what, cb) => {
      cbs[what] = cbs[what] || []
      cbs[what].push(cb)
    },
    trigger: (what, data) => {
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
