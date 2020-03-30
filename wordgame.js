const fn = require('./fn.js')

const word = r => r.data.word
const solution = r => r.data.solutions.join(', ')

const save = (r) => fn.save('wordgame', r.data)

const r = {
  data: fn.load('wordgame', {
    word: null,
    solutions: [],
    lvl: 4,
    users: {
    },
  }),
  infos: [
    { search: '#jlpt-n1', pages: 173 },
    { search: '#jlpt-n2', pages: 91 },
    { search: '#jlpt-n3', pages: 89 },
    { search: '#jlpt-n4', pages: 29 },
    { search: '#jlpt-n5', pages: 33 },
  ],
  nextWord: async () => {
    const info = r.infos[r.data.lvl - 1] // getRandom(r.infos[lvl])
    const page = fn.getRandomInt(1, info.pages)
    const data = await fn.lookupWord(info.search, page)
    const e = fn.getRandom(data)
    r.data.word = e.slug
    r.data.solutions = [].concat(...e.senses.map(x => x.english_definitions)).map(s => s.toLowerCase())
    console.log(r.data.solutions)
    save(r)
  },
  solve: (msg, displayName) => {
    let lc = msg.toLowerCase()
    for (let i = 0; i < r.data.solutions.length; i++) {
      console.log(r.data.solutions[i])
      console.log(lc)
      if (r.data.solutions[i].indexOf(lc) !== -1) {
        r.data.word = null
        r.data.solutions = []
        r.data.users[displayName] = r.data.users[displayName] || 0
        r.data.users[displayName] += 1
        save(r)
        return `Nice! ${word(r)}: (${solution(r)})`
      }
    }
    return ''
  },
  lb: () => {
    const u = []
    Object.keys(r.data.users).forEach(k => {
      u.push({ name: k, pts: r.data.users[k] })
    })

    return u.sort((e1, e2) => {
      return e1.pts > e2.pts ? 1 : -1
    }).map(e => `${e.name} (${e.pts}pts)`).join(', ')
  },
  onMsg: async function (client, target, context, msg) {
    let solved = r.solve(msg, context['display-name'])
    if (solved !== '') {
      client.say(target, solved).catch(y => { })

      await r.nextWord()
      await fn.timer(5)
      client.say(target, 'Ok, the next word is: ' + r.data.word).catch(y => { })
      return true
    }
    return false
  },
  cmds: {
    '!start': async () => {
      if (r.data.word === null) {
        await r.nextWord()
        return 'ok, the next word is: ' + r.data.word
      } else {
        return 'you still have to solve: ' + r.data.word + ' (or use !skip to skip it)'
      }
    },
    '!stop': () => {
      r.data.word = null
      r.data.solutions = []
      save(r)
      return 'stopped the word game BibleThump'
    },
    '!score': () => {
      return r.lb()
    },
    '!skip': async () => {
      if (r.data.word === null) {
        return ''
      }

      w = word(r)
      if (w) {
        const s = solution(r)
        r.data.word = null
        await r.nextWord()
        save(r)
        return `Ok, I skipped "${w}" (${s}) NotLikeThis the next word is: ${word(r)}`
      }
    },

    '!lvl': (context, params) => {
      if (r.data.word === null) {
        return ''
      }

      if (params.length === 0) {
        return `lvl: up to jlpt${r.data.lvl} (chose a different level with !lvl [1-5])`
      } else {
        const newlvl = parseInt(params[0], 10)
        if (newlvl >= 1 && newlvl <= 5) {
          r.data.lvl = newlvl
          save(r)
          return `righty right! new lvl: up to jlpt${r.data.lvl}`
        }
        return `no no no! still jlpt${r.data.lvl}`
      }
    },
  },
}

module.exports = r
