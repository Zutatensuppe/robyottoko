const fn = require('../../fn.js')
const config = require('../../config.js')
const fetch = require('node-fetch')

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

class Songrequest {
  constructor(user, client, storage, cache, ws, wss) {
    this.user = user
    this.cache = cache
    this.storage = storage
    this.ws = ws
    this.wss = wss
    this.name = 'sr'
    this.data = this.storage.load(this.name, {
      volume: 100,
      playlist: [],
    })
  }

  onMsg (client, target, context, msg) {
  }

  getCommands () {
    return {
      '!sr': {
        fn: this.songrequestCmd.bind(this),
      },
    }
  }

  widgets () {
    return {
      'sr': async (req, res) => {
        return {
          code: 200,
          type: 'text/html',
          body: await fn.render('widget.twig', {
            title: 'Song Request',
            widget_token: req.params.widget_token,
            page: 'sr',
            user: req.user,
            token: req.cookies['x-token'],
            ws: config.ws,
          }),
        }
      }
    }
  }

  getRoutes () {
    return {
      '/sr/': async (req, res) => {
        return {
          code: 200,
          type: 'text/html',
          body: await fn.render('base.twig', {
            title: 'Song Request',
            page: 'sr',
            user: req.user,
            token: req.cookies['x-token'],
            ws: config.ws,
          }),
        }
      },
    }
  }

  save () {
    this.storage.save(this.name, {
      volume: this.data.volume,
      playlist: this.data.playlist.map(item => ({
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
  }

  wsdata (eventName) {
    return {
      event: eventName,
      data: {
        // ommitting youtube cache data
        volume: this.data.volume,
        playlist: this.data.playlist,
      }
    };
  }

  updateClient (eventName, ws) {
    this.wss.notifyOne([this.user.id], this.wsdata(eventName), ws)
  }

  updateClients (eventName) {
    this.wss.notifyAll([this.user.id], this.wsdata(eventName))
  }

  getWsEvents () {
    return {
      'conn': (ws) => {
        this.updateClient('init', ws)
      },
      'play': (ws, {id}) => {
        const idx = this.data.playlist.findIndex(item => item.id === id)
        if (idx < 0) {
          return
        }
        this.data.playlist = [].concat(
          this.data.playlist.slice(idx),
          this.data.playlist.slice(0, idx)
        )
        this.incStat('plays')
        this.save()
        this.updateClients('onPlay')
      },
      'ended': (ws) => {
        this.data.playlist.push(this.data.playlist.shift())
        this.save()
        this.updateClients('onEnded')
      },
      'ctrl': (ws, {ctrl, args}) => {
        switch (ctrl) {
          case 'volume': this.volume(...args); break;
          case 'good': this.like(); break;
          case 'bad': this.dislike(); break;
          case 'skip': this.skip(); break;
          case 'resetStats': this.resetStats(); break;
          case 'clear': this.clear(); break;
          case 'rm': this.remove(); break;
          case 'shuffle': this.shuffle(); break;
          case 'playIdx': this.playIdx(...args); break;
          case 'rmIdx': this.rmIdx(...args); break;
          case 'goodIdx': this.goodIdx(...args); break;
          case 'badIdx': this.badIdx(...args); break;
          case 'sr': this.request(...args); break;
        }
      },
    }
  }

  async add(str, user) {
    const youtubeUrl = str.trim()
    const youtubeId = await extractYoutubeId(youtubeUrl)
    if (!youtubeId) {
      return null
    }
    return await this.addToPlaylist(youtubeId, user)
  }

  incStat (stat, idx = 0) {
    if (this.data.playlist.length > idx) {
      this.data.playlist[idx][stat]++
    }
  }

  resetStats () {
    this.data.playlist = this.data.playlist.map(item => {
      item.plays = 0
      item.skips = 0
      item.goods = 0
      item.bads = 0
      return item
    })
    this.save()
    this.updateClients('resetStats')
  }

  playIdx(idx) {
    if (this.data.playlist.length === 0) {
      return
    }
    while (idx-- > 0)
      this.data.playlist.push(this.data.playlist.shift())

    this.save()
    this.updateClients('skip')
  }

  rmIdx(idx) {
    if (this.data.playlist.length === 0) {
      return
    }
    this.data.playlist.splice(idx, 1)
    this.save()
    this.updateClients('init')
  }

  goodIdx(idx) {
    this.incStat('goods', idx)
    this.save()
    this.updateClients('like')
  }

  badIdx(idx) {
    this.incStat('bads', idx)
    this.save()
    this.updateClients('dislike')
  }

  async request (str) {
    await this.add(str, this.user.name)
  }

  like () {
    this.incStat('goods')
    this.save()
    this.updateClients('like')
  }

  volume (vol) {
    if (vol < 0) {
      vol = 0
    }
    if (vol > 100) {
      vol = 100
    }
    this.data.volume = vol
    this.save()
    this.updateClients('volume')
  }

  dislike () {
    this.incStat('bads')
    this.save()
    this.updateClients('dislike')
  }

  skip () {
    if (this.data.playlist.length === 0) {
      return
    }

    this.incStat('skips')

    this.data.playlist.push(this.data.playlist.shift())

    this.save()
    this.updateClients('skip')
  }

  clear () {
    this.data.playlist = []
    this.save()
    this.updateClients('clear')
  }

  shuffle () {
    if (this.data.playlist.length < 3) {
      return
    }

    this.data.playlist = [this.data.playlist[0], ...fn.shuffle(this.data.playlist.slice(1))]

    this.save()
    this.updateClients('shuffle')
  }

  remove () {
    if (this.data.playlist.length === 0) {
      return
    }
    this.data.playlist.shift()
    this.save()
    this.updateClients('remove')
  }

  async songrequestCmd (command, client, target, context, msg) {
    if (command.args.length === 0) {
      return `Usage: !sr YOUTUBE-URL`
    }
    if (command.args.length === 1) {
      switch (command.args[0]) {
        case 'current':
          // todo: error handling, title output etc..
          return `Currently playing: ${this.data.playlist[0].yt}`
        case 'good':
          this.like()
          return
        case 'bad':
          this.dislike()
          return
        case 'skip':
          if (fn.isMod(context)) {
            this.skip()
            return
          }
          break
        case 'resetStats':
          if (fn.isMod(context)) {
            this.resetStats()
            return
          }
          break
        case 'clear':
          if (fn.isMod(context)) {
            this.clear()
            return
          }
          break
        case 'rm':
          if (fn.isMod(context)) {
            this.remove()
            return
          }
          break
        case 'shuffle':
          if (fn.isMod(context)) {
            this.shuffle()
            return
          }
          break
      }
    }

    const str = command.args.join(' ')
    const item = await this.add(str, context['display-name'])
    if (!item) {
      return `Could not process that song request`
    }
    return `Added "${item.title}" (${item.yt}) to the playlist!`
  }

  async loadYoutubeData (youtubeId) {
    let key = `youtubeData_${youtubeId}`
    let d = this.cache.get(key)
    if (!d) {
      d = await fetchYoutubeData(youtubeId)
      this.cache.set(key, d)
    }
    return d
  }

  async addToPlaylist (youtubeId, userName) {
    const yt = await this.loadYoutubeData(youtubeId)

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
    for (let i = 0; i < this.data.playlist.length; i++) {
      let other = this.data.playlist[i]
      if (other.plays === item.plays) {
        found = i
      } else if (found >= 0) {
        break
      }
    }
    if (found === -1) {
      found = 0
    }

    this.data.playlist.splice(found + 1, 0, item)

    this.save()
    this.updateClients('add')
    return item
  }

}

module.exports = Songrequest