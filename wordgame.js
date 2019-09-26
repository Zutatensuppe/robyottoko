const fn = require('./fn.js')

const r = {
  word: null,
  solutions: [],
  lvl: 4,
  users: {
  },
  infos: [
    {search: '#jlpt-n1', pages: 173},
    {search: '#jlpt-n2', pages: 91},
    {search: '#jlpt-n3', pages: 89},
    {search: '#jlpt-n4', pages: 29},
    {search: '#jlpt-n5', pages: 33},
  ],
  nextWord: async () => {
    const info = r.infos[r.lvl - 1] // getRandom(r.infos[lvl])
    const page = fn.getRandomInt(1, info.pages)
    const data = await fn.lookupWord(info.search, page)
    const e = fn.getRandom(data)
    r.word = e.slug
    r.solutions = [].concat(...e.senses.map(x => x.english_definitions)).map(s => s.toLowerCase())
    console.log(r.solutions)
  },
  solve: (msg, displayName) => {
    let lc = msg.toLowerCase()
    for (let i = 0; i < r.solutions.length; i++) {
      console.log(r.solutions[i])
      console.log(lc)
      if (r.solutions[i].indexOf(lc) !== -1) {
        let s = r.solutions
        let w = r.word
        r.word = null
        r.solutions = []
        r.users[displayName] = r.users[displayName] || 0
        r.users[displayName]+= 1
        return `Nice! ${w}: (${s.join(', ')})`
      }
    }
    return ''
  },
  lb: () => {
    const u = []
    Object.keys(r.users).forEach(k => {
      u.push({name: k, pts: r.users[k]})
    })

    return u.sort((e1, e2) => {
      return e1.pts > e2.pts ? 1 : -1
    }).map(e => `${e.name} (${e.pts}pts)`).join(', ')
  },
  onMsg: async function (client, target, context, msg) {
    let solved =r.solve(msg, context['display-name'])
    if (solved !== '') {
      client.say(target, solved).catch(y => {})

      await r.nextWord()
      await timer(5)
      client.say(target, 'Ok, the next word is: ' + r.word).catch(y => {})
      return true
    }
    return false
  },
  cmds: {
    '!start': async () => {
      if (r.word === null) {
        await r.nextWord()
        return 'ok, the next word is: ' + r.word
      } else {
        return 'you still have to solve: ' + r.word + ' (or use !skip to skip it)'
      }
    },
    '!stop': () => {
      r.word = null
      r.solutions = []
      return 'stopped the word game biblethump'
    },
    '!score': () => {
      return r.lb()
    },
    '!skip': async () => {
      if (r.word === null) {
        return ''
      }

      w = r.word
      if (w) {
        r.word = null
        await r.nextword()
        return 'ok, i skipped "' + w + '" feelsbadman  the next word is: ' + r.word
      }
    },

    '!lvl': (params) => {
      if (r.word === null) {
        return ''
      }

      if (params.length === 0) {
        return `lvl: up to jlpt${r.lvl} (chose a different level with !lvl [1-5])`
      } else {
        const newlvl = parseInt(params[0], 10)
        if (newlvl >= 1 && newlvl <= 5) {
          r.lvl = newlvl
          return `righty right! new lvl: up to jlpt${r.lvl}`
        }
        return `no no no! still jlpt${r.lvl}`
      }
    },
  },
}

module.exports = r
