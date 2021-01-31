function EventHub() {
  const cbs = {}
  function on(what, cb) {
    cbs[what] = cbs[what] || []
    cbs[what].push(cb)
  }
  function trigger(what, data) {
    if (!cbs[what]) {
      return
    }
    for (const cb of cbs[what]) {
      cb(data)
    }
  }
  return {
    on,
    trigger,
  }
}

module.exports = {
  EventHub,
}
