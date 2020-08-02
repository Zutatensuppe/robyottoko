const fn = require('./../fn.js')
const config = require('./../config.js')
const fetch = require('node-fetch')
const web = require('./../web.js')

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
  constructor(user, client, storage) {
    this.user = user
    this.storage = storage
    this.data = storage.load({
      youtubeData: {},
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

  getRoutes () {
    return {
      '/sr/player/': async (req, res) => {
        return {
          code: 200,
          type: 'text/html',
          body: await fn.render('sr.twig', {
            title: 'Song Request',
            mode: 'player',
            user: req.user,
            ws: config.ws,
          }),
        }
      },
      '/sr/': async (req, res) => {
        return {
          code: 200,
          type: 'text/html',
          body: await fn.render('sr.twig', {
            title: 'Song Request',
            mode: 'full',
            user: req.user,
            ws: config.ws,
          }),
        }
      },
    }
  }

  save () {
    this.storage.save({
      youtubeData: this.data.youtubeData || {},
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
        playlist: this.data.playlist,
      }
    };
  }

  updateClient (eventName, ws) {
    web.notifyOne([this.user], this.wsdata(eventName), ws)
  }

  updateClients (eventName) {
    web.notifyAll([this.user], this.wsdata(eventName))
  }

  getWsEvents () {
    return {
      'conn': (ws) => {
        this.updateClient('init', ws)
      },
      'play': (ws, {id}) => {
        const idx = this.data.playlist.findIndex(item => item.id === ws.id)
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
      'ctrl': (ws, {ctrl}) => {
        switch (ctrl) {
          case 'good': this.like(); break;
          case 'bad': this.dislike(); break;
          case 'skip': this.skip(); break;
          case 'resetStats': this.resetStats(); break;
          case 'clear': this.clear(); break;
          case 'rm': this.remove(); break;
          case 'shuffle': this.shuffle(); break;
        }
      },
    }
  }

  incStat (stat) {
    if (this.data.playlist.length > 0) {
      this.data.playlist[0][stat]++
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
  like () {
    this.incStat('goods')
    this.save()
    this.updateClients('like')
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

    const youtubeUrl = command.args.join(' ').trim()
    const youtubeId = await extractYoutubeId(youtubeUrl)
    if (!youtubeId) {
      return `Could not process that song request`
    }
    const item = await this.addToPlaylist(youtubeId, context['display-name'])
    return `Added "${item.title}" (${item.yt}) to the playlist!`
  }

  async loadYoutubeData (youtubeId) {
    if (typeof this.data.youtubeData[youtubeId] !== 'undefined') {
      return this.data.youtubeData[youtubeId]
    }
    this.data.youtubeData[youtubeId] = await fetchYoutubeData(youtubeId)
    this.save()
    return this.data.youtubeData[youtubeId]
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

module.exports = {
  name: 'sr',
  create: (user, client, storage) => {
    return new Songrequest(user, client, storage)
  },
}
