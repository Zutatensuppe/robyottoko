const Db = require('../../Db.js')
const fn = require('../../fn.js')
const WebServer = require('../../net/WebServer.js')
const WebSocketServer = require('../../net/WebSocketServer.js')
const TwitchHelixClient = require('../../services/TwitchHelixClient.js')
const Youtube = require('../../services/Youtube.js')

const extractYoutubeId = async (/** @type string */ youtubeUrl) => {
  return Youtube.extractYoutubeId(youtubeUrl)
    || await Youtube.getYoutubeIdBySearch(youtubeUrl)
    || null
}

const ADD_TYPE = {
  NOT_ADDED: 0,
  ADDED: 1,
  REQUEUED: 2,
  EXISTED: 3,
}

class SongrequestModule {
  constructor(
    /** @type Db */ db,
    user,
    chatClient,
    /** @type TwitchHelixClient */ helixClient,
    storage,
    cache,
    /** @type WebServer */ ws,
    /** @type WebSocketServer */ wss
  ) {
    this.db = db
    this.user = user
    this.cache = cache
    this.storage = storage
    this.ws = ws
    this.wss = wss
    this.name = 'sr'
    this.data = this.storage.load(this.name, {
      volume: 100,
      playlist: [],
      stacks: {},
    })
  }

  onChatMsg (client, target, context, msg) {
  }

  getCommands () {
    return {
      '!sr': [{
        fn: this.songrequestCmd.bind(this),
      }],
    }
  }

  widgets () {
    return {
      'sr': async (req, res, next) => {
        res.send(await fn.render('widget.twig', {
          title: 'Song Request Widget',
          page: 'sr',
          page_data: {
            wsBase: this.wss.connectstring(),
            widgetToken: req.params.widget_token,
          },
        }))
      },
    }
  }

  getRoutes () {
    return {
      '/sr/': async (req, res, next) => {
        res.send(await fn.render('base.twig', {
          title: 'Song Request',
          page: 'sr',
          page_data: {
            wsBase: this.wss.connectstring(),
            widgetToken: req.userWidgetToken,
            user: req.user,
            token: req.cookies['x-token'],
          },
        }))
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
      stacks: this.data.stacks,
    })
  }

  wsdata (eventName) {
    return {
      event: eventName,
      data: {
        // ommitting youtube cache data and stacks
        volume: this.data.volume,
        playlist: this.data.playlist,
      }
    };
  }

  updateClient (/** @type string */ eventName, /** @type WebSocket */ ws) {
    this.wss.notifyOne([this.user.id], this.name, this.wsdata(eventName), ws)
  }

  updateClients (/** @type string */ eventName) {
    this.wss.notifyAll([this.user.id], this.name, this.wsdata(eventName))
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
          case 'move': this.move(...args); break;
        }
      },
    }
  }

  async add(/** @type string */ str, user) {
    const youtubeUrl = str.trim()
    const youtubeId = await extractYoutubeId(youtubeUrl)
    if (!youtubeId) {
      return { item: null, addType: ADD_TYPE.NOT_ADDED }
    }

    const { item, addType } = await this.addToPlaylist(youtubeId, user)
    if (addType === ADD_TYPE.ADDED) {
      this.data.stacks[user] = this.data.stacks[user] || []
      this.data.stacks[user].push(youtubeId)
    }
    return { item, addType }
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
    if (idx === 0) {
      this.updateClients('remove')
    } else {
      this.updateClients('init')
    }
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

  move (oldIndex, newIndex) {
    if (oldIndex >= this.data.playlist.length) {
      return
    }
    if (newIndex >= this.data.playlist.length) {
      return
    }

    var tmp = this.data.playlist[oldIndex]
    this.data.playlist[oldIndex] = this.data.playlist[newIndex]
    this.data.playlist[newIndex] = tmp

    this.save()
    this.updateClients('move')
  }

  remove () {
    if (this.data.playlist.length === 0) {
      return
    }
    this.data.playlist.shift()
    this.save()
    this.updateClients('remove')
  }

  undo (username) {
    if (this.data.playlist.length === 0) {
      return false
    }
    if ((this.data.stacks[username] || []).length === 0) {
      return false
    }
    const youtubeId = this.data.stacks[username].pop()
    const idx = this.data.playlist
      .findIndex(item => item.yt === youtubeId && item.user === username)
    if (idx === -1) {
      return false
    }
    const item = this.data.playlist[idx]
    this.rmIdx(idx)
    return item
  }

  async songrequestCmd (command, client, target, context, msg) {
    const say = fn.sayFn(client, target)
    if (command.args.length === 0) {
      say(`Usage: !sr YOUTUBE-URL`)
      return
    }
    if (command.args.length === 1) {
      switch (command.args[0]) {
        case 'current':
          if (this.data.playlist.length === 0) {
            say(`Playlist is empty`)
            return
          }
          const cur = this.data.playlist[0]
          // todo: error handling, title output etc..
          say(`Currently playing: ${cur.title} (${Youtube.getUrlById(cur.yt)})`)
          return
        case 'good':
          this.like()
          return
        case 'bad':
          this.dislike()
          return
        case 'next':
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
        case 'undo':
          const undid = this.undo(context['display-name'])
          if (!undid) {
            say(`Could not undo anything`)
          } else {
            say(`Removed "${undid.title}" from the playlist!`)
          }
          return
      }
    }

    const str = command.args.join(' ')
    const { item, addType } = await this.add(str, context['display-name'])
    if (addType === ADD_TYPE.ADDED) {
      say(`Added "${item.title}" (${Youtube.getUrlById(item.yt)}) to the playlist!`)
    } else if (addType === ADD_TYPE.REQUEUED) {
      say(`"${item.title}" (${Youtube.getUrlById(item.yt)}) was already in the playlist and only moved up.`)
    } else if (addType === ADD_TYPE.EXISTED) {
      say(`"${item.title}" (${Youtube.getUrlById(item.yt)}) was already in the playlist.`)
    } else {
      say(`Could not process that song request`)
    }
  }

  async loadYoutubeData (youtubeId) {
    let key = `youtubeData_${youtubeId}`
    let d = this.cache.get(key)
    if (!d) {
      d = await Youtube.fetchDataByYoutubeId(youtubeId)
      this.cache.set(key, d)
    }
    return d
  }

  findInsertIndex () {
    let found = -1
    for (let i = 0; i < this.data.playlist.length; i++) {
      if (this.data.playlist[i].plays === 0) {
        found = i
      } else if (found >= 0) {
        break
      }
    }
    return (found === -1 ? 0 : found) + 1
  }

  async addToPlaylist (youtubeId, userName) {
    const idx = this.data.playlist.findIndex(other => other.yt === youtubeId)
    if (idx >= 0) {
      const item =  this.data.playlist[idx]
      const insertIndex = this.findInsertIndex()
      if (insertIndex < idx) {
        this.data.playlist.splice(idx, 1)
        this.data.playlist.splice(insertIndex, 0, item)
        this.save()
        this.updateClients('add')
        return { item, addType: ADD_TYPE.REQUEUED }
      } else {
        // nothing to do
        return { item, addType: ADD_TYPE.EXISTED }
      }
    }

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

    const insertIndex = this.findInsertIndex()
    this.data.playlist.splice(insertIndex, 0, item)

    this.save()
    this.updateClients('add')
    return { item, addType: ADD_TYPE.ADDED }
  }

}

module.exports = SongrequestModule
