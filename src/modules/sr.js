const fn = require('./../fn.js')
const config = require('./../config.js')
const fetch = require('node-fetch')
const ws = require('ws')

let _wss = null;
const _data = fn.load('sr', {
  youtubeData: {},
  playlist: [],
})

const save = () => fn.save('sr', {
  youtubeData: _data.youtubeData || {},
  playlist: _data.playlist.map(item => ({
    id: item.id,
    yt: item.yt,
    title: item.title || '',
    time: item.time || new Date().getTime(),
    user: item.user || '',
    plays: item.plays || 0,
    skips: item.skips || 0, // hard skips
    goods: item.goods || 0,
    bads: item.bads || 0,
  })),
})

const incStat = (stat) => {
  if (_data.playlist.length > 0) {
    _data.playlist[0][stat]++
  }
}

const sr = {
  resetStats: () => {
    _data.playlist = _data.playlist.map(item => {
      item.plays = 0
      item.skips = 0
      item.goods = 0
      item.bads = 0
      return item
    })
    save()
    updateClients('resetStats')
  },
  like: () => {
    incStat('goods')
    save()
    updateClients('like')
  },
  dislike: () => {
    incStat('bads')
    save()
    updateClients('dislike')
  },
  skip: () => {
    if (_data.playlist.length === 0) {
      return
    }

    incStat('skips')

    _data.playlist.push(_data.playlist.shift())

    save()
    updateClients('skip')
  },
  clear: () => {
    _data.playlist = []
    save()
    updateClients('clear')
  },
  shuffle: () => {
    if (_data.playlist.length < 3) {
      return
    }

    _data.playlist = [_data.playlist[0], ...fn.shuffle(_data.playlist.slice(1))]

    save()
    updateClients('shuffle')
  },
  remove: () => {
    if (_data.playlist.length === 0) {
      return
    }
    _data.playlist.shift()
    save()
    updateClients('remove')
  }
}

const fetchYoutubeData = async (youtubeId) => {
  console.log('fetchYoutubeData', youtubeId)
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${youtubeId}&fields=items(id%2Csnippet)&key=${config.modules.sr.google.api_key}`
  const res = await fetch(url)
  const resJson = await res.json()
  return resJson.items[0] || null
}

const extractYoutubeId = async (youtubeUrl) => {
  const patterns = [
    /youtu\.be\/(.*?)(?:\?|"|$)/i,
    /\.youtube\.com\/(?:watch\?v=|v\/|embed\/)([^&"'#]*)/i,
  ]
  for (const pattern of patterns) {
    let m = youtubeUrl.match(pattern)
    if (m) {
      return m[1]
    }
  }
  // https://stackoverflow.com/questions/6180138/whats-the-maximum-length-of-a-youtube-video-id
  if (youtubeUrl.match(/^[a-z0-9_-]{11}$/i)) {
    return youtubeUrl
  }
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(youtubeUrl)}&type=video&key=${config.modules.sr.google.api_key}`
  const res = await fetch(url)
  const resJson = await res.json()
  return resJson.items[0]['id']['videoId'] || null
}

const songrequestCmd = async (command, client, target, context, msg) => {
  if (command.args.length === 0) {
    return `Usage: !sr YOUTUBE-URL`
  }
  if (command.args.length === 1) {
    switch (command.args[0]) {
      case 'current':
        // todo: error handling, title output etc..
        return `Currently playing: ${_data.playlist[0].yt}`
      case 'good':
        sr.like()
        return
      case 'bad':
        sr.dislike()
        return
      case 'skip':
        if (fn.isMod(context)) {
          sr.skip()
          return
        }
        break
      case 'resetStats':
        if (fn.isMod(context)) {
          sr.resetStats()
          return
        }
        break
      case 'clear':
        if (fn.isMod(context)) {
          sr.clear()
          return
        }
        break
      case 'rm':
        if (fn.isMod(context)) {
          sr.remove()
          return
        }
        break
      case 'shuffle':
        if (fn.isMod(context)) {
          sr.shuffle()
          return
        }
        break
    }
  }

  const youtubeUrl = command.args.join(' ').trim()
  const youtubeId = await extractYoutubeId(youtubeUrl)
  if (!youtubeId) {
    return `Could not process that song request`
  }
  const item = await addToPlaylist(youtubeId, context['display-name'])
  return `Added "${item.title}" (${item.yt}) to the playlist!`
}

const loadYoutubeData = async (youtubeId) => {
  if (typeof _data.youtubeData[youtubeId] !== 'undefined') {
    return _data.youtubeData[youtubeId]
  }
  _data.youtubeData[youtubeId] = await fetchYoutubeData(youtubeId)
  save()
  return _data.youtubeData[youtubeId]
}

const addToPlaylist = async (youtubeId, userName) => {
  const yt = await loadYoutubeData(youtubeId)

  const item = {
    id: Math.random(),
    yt: youtubeId,
    title: yt.snippet.title,
    timestamp: new Date().getTime(),
    user: userName,
    plays: 0,
    skips: 0,
    goods: 0,
    bads: 0,
  }

  let found = -1
  for (let i = 0; i < _data.playlist.length; i++) {
    let other = _data.playlist[i]
    if (other.plays === item.plays) {
      found = i
    } else if (found >= 0) {
      break
    }
  }
  if (found === -1) {
    found = 0
  }

  _data.playlist.splice(found + 1, 0, item)

  save()
  updateClients('add')
  return item
}

const songrequestHandler = async (req, res) => {
  return {
    code: 200,
    type: 'text/html',
    body: await fn.render('sr.twig', {
      ws: config.modules.sr.ws,
    }),
  }
}

const onMsg = function (data) {
  console.log(data)
  const d = JSON.parse(data)
  if (d.event && d.event === 'play') {
    onPlay(d.id)
  } else if (d.event && d.event === 'ended') {
    onEnded()
  } else if (d.event && d.event === 'ctrl') {
    onCtrl(d.ctrl)
  }
}

const init = (client) => {
  _wss = new ws.Server(config.modules.sr.ws)
  _wss.on('connection', ws => {
    ws.isAlive = true
    ws.on('pong', function () { this.isAlive = true; })
    ws.on('message', onMsg)
    updateClient('init', ws)
  })
  const interval = setInterval(function ping() {
    _wss.clients.forEach(function each(ws) {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping(() => {});
    });
  }, 30000)
  _wss.on('close', function close() {
    clearInterval(interval);
  });
}

const onPlay = (id) => {
  const idx = _data.playlist.findIndex(item => item.id === id)
  if (idx < 0) {
    return
  }
  _data.playlist = [].concat(
    _data.playlist.slice(idx),
    _data.playlist.slice(0, idx)
  )
  incStat('plays')
  save()
  updateClients('onPlay')
}

const onEnded = () => {
  _data.playlist.push(_data.playlist.shift())
  save()
  updateClients('onEnded')
}

const onCtrl = (ctrl) => {
  switch (ctrl) {
    case 'good': sr.like(); break;
    case 'bad': sr.dislike(); break;
    case 'skip': sr.skip(); break;
    case 'resetStats': sr.resetStats(); break;
    case 'clear': sr.clear(); break;
    case 'rm': sr.remove(); break;
    case 'shuffle': sr.shuffle(); break;
  }
}

const updateClient = (eventName, ws) => {
  if (ws.isAlive) {
    ws.send(JSON.stringify({event: eventName, data: {
      // ommitting youtube cache data
      playlist: _data.playlist,
    }}))
  }
}

const updateClients = (eventName) => {
  _wss.clients.forEach(function each(ws) {
    updateClient(eventName, ws)
  })
}

module.exports = {
  init,
  cmds: {
    '!sr': {fn: songrequestCmd},
  },
  routes: {
    '/sr/player/': songrequestHandler,
  },
}
