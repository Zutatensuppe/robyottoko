import fn from '../../fn.ts'
import JishoOrg from '../../services/JishoOrg.ts'

const log = fn.logger(__filename)

const _data = fn.load('wordgame', {
  word: null,
  solutions: [],
  lvl: 4,
  users: {
  },
})

const infos = [
  { search: '#jlpt-n1', pages: 173 },
  { search: '#jlpt-n2', pages: 91 },
  { search: '#jlpt-n3', pages: 89 },
  { search: '#jlpt-n4', pages: 29 },
  { search: '#jlpt-n5', pages: 33 },
]

const save = () => fn.save('wordgame', _data)

const solve = (msg, displayName) => {
  let lc = msg.toLowerCase()
  for (let i = 0; i < _data.solutions.length; i++) {
    log.info(_data.solutions[i])
    log.info(lc)
    if (_data.solutions[i].indexOf(lc) !== -1) {
      const w = _data.word
      const s = _data.solutions.join(', ')

      _data.word = null
      _data.solutions = []
      _data.users[displayName] = _data.users[displayName] || 0
      _data.users[displayName] += 1
      save()
      return `Nice! ${w}: (${s})`
    }
  }
  return ''
}

const nextWord = async () => {
  const info = infos[_data.lvl - 1]
  const page = fn.getRandomInt(1, info.pages)
  const data = await JishoOrg.searchWord(info.search, page)
  const e = fn.getRandom(data)
  _data.word = e.slug
  _data.solutions = [].concat(...e.senses.map(x => x.english_definitions)).map(s => s.toLowerCase())
  log.info(_data.solutions)
  save()
}

const scoreboard = () => {
  const u = []
  Object.keys(_data.users).forEach(k => {
    u.push({ name: k, pts: _data.users[k] })
  })

  return u.sort((e1, e2) => {
    return e1.pts > e2.pts ? 1 : -1
  }).map(e => `${e.name} (${e.pts}pts)`).join(', ')
}

const wordgameCmd = async (command, client, target, context, msg) => {
  if (command.args.length === 0) {
    return `Usage: !wg start|stop|score|skip|lvl`
  }
  switch (command.args[0]) {
    case 'start': {
      if (_data.word === null) {
        await nextWord()
        return 'ok, the next word is: ' + _data.word
      }
      return 'you still have to solve: ' + _data.word + ' (or use !skip to skip it)'
    }
    case 'stop': {
      _data.word = null
      _data.solutions = []
      save()
      return 'stopped the word game BibleThump'
    }
    case 'score': {
      return scoreboard()
    }
    case 'skip': {
      if (_data.word === null) {
        return ''
      }
      const w = _data.word
      if (!w) {
        return ''
      }
      const s = _data.solutions.join(', ')
      _data.word = null
      await nextWord()
      save()
      return `Ok, I skipped "${w}" (${s}) NotLikeThis the next word is: ${_data.word}`
    }
    case 'lvl': {
      if (_data.word === null) {
        return ''
      }

      if (command.args.length === 1) {
        return `lvl: up to jlpt${_data.lvl} (chose a different level with !lvl [1-5])`
      }
      const newlvl = parseInt(command.args[1], 10)
      if (newlvl >= 1 && newlvl <= 5) {
        _data.lvl = newlvl
        save()
        return `righty right! new lvl: up to jlpt${_data.lvl}`
      }
      return `no no no! still jlpt${_data.lvl}`
    }
  }
}

const wordgameOnMsg = async function (client, target, context, msg) {
  let solved = solve(msg, context['display-name'])
  if (solved === '') {
    return false
  }

  const say = fn.sayFn(client, target)
  say(solved)

  await nextWord()
  await fn.sleep(5 * fn.SECOND)
  say(`Ok, the next word is: ${_data.word}`)
  return true
}

export default {
  name: 'wordgame',
  onMsg: wordgameOnMsg,
  cmds: {
    '!wg': { fn: wordgameCmd },
  },
}
