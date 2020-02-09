const SECOND = 1000
const MINUTE = 60 * SECOND

const timerConf = [
  {
    channel: '#robyottoko',
    interval: 30 * MINUTE,
    minLines: 1,
    message: 'Wer hat an der Uhr gedreht?...',
  }
]

const timers = timerConf.map(c => Object.assign({}, c, {
  lines: 0,
  timer: null
}))

module.exports = {
  init: (client) => {
    timers.forEach(t => {
      t.timer = setInterval(() => {
        if (t.lines >= t.minLines) {
          client.say(t.channel, t.message)
          t.lines = 0
        }
      }, t.interval)
    })
  },
  onMsg: (client, target, context, msg) => {
    timers.forEach(t => {
      if (t.channel === target) {
        t.lines++
      }
    })
  },
}

