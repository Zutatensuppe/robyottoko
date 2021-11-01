import Db from '../../Db.ts'
import fn from '../../fn.ts'
import WebServer from '../../WebServer.ts'
import WebSocketServer from '../../net/WebSocketServer.ts'
import TwitchHelixClient from '../../services/TwitchHelixClient.ts'
import Youtube from '../../services/Youtube.ts'
import Variables from '../../services/Variables.ts'

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
    /** @type Variables */ variables,
    chatClient,
    /** @type TwitchHelixClient */ helixClient,
    storage,
    cache,
    /** @type WebServer */ ws,
    /** @type WebSocketServer */ wss
  ) {
    this.db = db
    this.user = user
    this.variables = variables
    this.cache = cache
    this.storage = storage
    this.ws = ws
    this.wss = wss
    this.name = 'sr'
    this.data = this.storage.load(this.name, {
      filter: {
        tag: '',
      },
      settings: {
        volume: 100,
        hideVideoImage: {
          file: '',
          filename: '',
        },
        customCss: '',
        showProgressBar: false,
      },
      playlist: [],
      stacks: {},
    })

    // make sure items have correct structure
    // needed by rest of the code
    // TODO: maybe use same code as in save function
    this.data.playlist = this.data.playlist.map(item => {
      item.tags = item.tags || []
      item.hidevideo = typeof item.hidevideo === 'undefined' ? false : item.hidevideo
      return item
    })
    this.data.settings = this.data.settings || {
      volume: 100,
      hideVideoImage: {
        file: '',
        filename: '',
      },
      customCss: '',
      showProgressBar: false,
    }
    if (!this.data.settings.customCss) {
      this.data.settings.customCss = ''
    }
    if (!this.data.settings.showProgressBar) {
      this.data.settings.showProgressBar = false
    }
  }

  onChatMsg(client, target, context, msg) {
  }

  saveCommands(commands) {
    // pass
  }

  getCommands() {
    return {
      '!sr': [{
        fn: this.songrequestCmd.bind(this),
      }],
      '!resr': [{
        fn: this.songrequestCmd.bind(this),
      }],
    }
  }

  widgets() {
    return {
      'sr': async (req, res, next) => {
        res.render('widget.spy', {
          title: 'Song Request Widget',
          page: 'sr',
          wsUrl: `${this.wss.connectstring()}/${this.name}`,
          widgetToken: req.params.widget_token,
        })
      },
    }
  }

  getRoutes() {
    return {
      post: {
        '/sr/import': async (req, res, next) => {
          try {
            this.data.settings = req.body.settings
            this.data.playlist = req.body.playlist
            this.save()
            this.updateClients('init')
            res.send({ error: false })
          } catch (e) {
            res.status(400).send({ error: true })
          }
        },
      },
      get: {
        '/sr/export': async (req, res, next) => {
          res.send({
            settings: this.data.settings,
            playlist: this.data.playlist,
          })
        },
      },
    }
  }

  save() {
    this.storage.save(this.name, {
      filter: this.data.filter,
      playlist: this.data.playlist.map(item => {
        item.title = item.title || ''
        item.time = item.time || new Date().getTime()
        item.last_play = item.last_play || 0
        item.user = item.user || ''
        item.plays = item.plays || 0
        item.goods = item.goods || 0
        item.bads = item.bads || 0
        item.tags = item.tags || []
        return item
      }),
      settings: this.data.settings,
      stacks: this.data.stacks,
    })
  }

  wsdata(eventName) {
    return {
      event: eventName,
      data: {
        // ommitting youtube cache data and stacks
        filter: this.data.filter,
        playlist: this.data.playlist,
        settings: this.data.settings,
      }
    };
  }

  updateClient(/** @type string */ eventName, /** @type WebSocket */ ws) {
    this.wss.notifyOne([this.user.id], this.name, this.wsdata(eventName), ws)
  }

  updateClients(/** @type string */ eventName) {
    this.wss.notifyAll([this.user.id], this.name, this.wsdata(eventName))
  }

  getWsEvents() {
    return {
      'conn': (ws) => {
        this.updateClient('init', ws)
      },
      'play': (ws, { id }) => {
        const idx = this.data.playlist.findIndex(item => item.id === id)
        if (idx < 0) {
          return
        }
        this.data.playlist = [].concat(
          this.data.playlist.slice(idx),
          this.data.playlist.slice(0, idx)
        )
        this.incStat('plays')
        this.data.playlist[idx].last_play = new Date().getTime()

        this.save()
        this.updateClients('playIdx')
      },
      'ended': (ws) => {
        this.data.playlist.push(this.data.playlist.shift())
        this.save()
        this.updateClients('onEnded')
      },
      'ctrl': (ws, { ctrl, args }) => {
        switch (ctrl) {
          case 'volume': this.volume(...args); break;
          case 'pause': this.pause(); break;
          case 'unpause': this.unpause(); break;
          case 'loop': this.loop(); break;
          case 'noloop': this.noloop(); break;
          case 'good': this.like(); break;
          case 'bad': this.dislike(); break;
          case 'prev': this.prev(); break;
          case 'skip': this.next(); break;
          case 'resetStats': this.resetStats(); break;
          case 'clear': this.clear(); break;
          case 'rm': this.remove(); break;
          case 'shuffle': this.shuffle(); break;
          case 'playIdx': this.playIdx(...args); break;
          case 'rmIdx': this.rmIdx(...args); break;
          case 'goodIdx': this.goodIdx(...args); break;
          case 'badIdx': this.badIdx(...args); break;
          case 'sr': this.request(...args); break;
          case 'resr': this.resr(...args); break;
          case 'move': this.move(...args); break;
          case 'rmtag': this.rmTag(...args); break;
          case 'addtag': this.addTag(...args); break;
          case 'updatetag': this.updateTag(...args); break;
          case 'filter': this.filter(...args); break;
          case 'videoVisibility': this.videoVisibility(...args); break;
          case 'settings': this.settings(...args); break;
        }
      },
    }
  }

  async add(/** @type string */ str, user) {
    const youtubeUrl = str.trim()
    let youtubeId = Youtube.extractYoutubeId(youtubeUrl)
    let youtubeData = null
    if (youtubeId) {
      youtubeData = await this.loadYoutubeData(youtubeId)
    }
    if (!youtubeData) {
      youtubeId = await Youtube.getYoutubeIdBySearch(youtubeUrl)
      if (youtubeId) {
        youtubeData = await this.loadYoutubeData(youtubeId)
      }
    }
    if (!youtubeId || !youtubeData) {
      return { addType: ADD_TYPE.NOT_ADDED, idx: -1 }
    }

    const tmpItem = this.createItem(youtubeId, youtubeData, user)
    const { addType, idx } = await this.addToPlaylist(tmpItem)
    if (addType === ADD_TYPE.ADDED) {
      this.data.stacks[user] = this.data.stacks[user] || []
      this.data.stacks[user].push(youtubeId)
    }
    return { addType, idx }
  }

  determinePrevIndex() {
    let index = -1
    for (let i in this.data.playlist) {
      const item = this.data.playlist[i]
      if (this.data.filter.tag === '' || item.tags.includes(this.data.filter.tag)) {
        index = i
      }
    }
    return index
  }

  determineNextIndex() {
    for (let i in this.data.playlist) {
      if (i == 0) { // i can be string ;_;
        continue
      }
      const item = this.data.playlist[i]
      if (this.data.filter.tag === '' || item.tags.includes(this.data.filter.tag)) {
        return i
      }
    }
    return -1
  }

  determineFirstIndex() {
    return this.data.playlist.findIndex(item => this.data.filter.tag === '' || item.tags.includes(this.data.filter.tag))
  }

  incStat(stat, idx = -1) {
    if (idx === -1) {
      idx = this.determineFirstIndex()
    }
    if (idx === -1) {
      return
    }
    if (this.data.playlist.length > idx) {
      this.data.playlist[idx][stat]++
    }
  }

  videoVisibility(visible, idx = -1) {
    if (idx === -1) {
      idx = this.determineFirstIndex()
    }
    if (idx === -1) {
      return
    }
    if (this.data.playlist.length > idx) {
      this.data.playlist[idx].hidevideo = visible ? false : true
    }
    this.save()
    this.updateClients('video')
  }

  async durationUntilIndex(idx) {
    if (idx <= 0) {
      return 0
    }

    let durationTotalMs = 0
    for (const item of this.data.playlist.slice(0, idx)) {
      const d = await this.loadYoutubeData(item.yt)
      durationTotalMs += fn.parseISO8601Duration(d.contentDetails.duration)
    }
    return durationTotalMs
  }

  async stats(userName) {
    const countTotal = this.data.playlist.length
    let durationTotal = 0
    if (countTotal > 0) {
      for (const item of this.data.playlist) {
        const d = await this.loadYoutubeData(item.yt)
        durationTotal += fn.parseISO8601Duration(d.contentDetails.duration)
      }
    }
    return {
      count: {
        byUser: this.data.playlist.filter(item => item.user === userName).length,
        total: countTotal,
      },
      duration: {
        human: fn.humanDuration(durationTotal),
      },
    }
  }

  resetStats() {
    this.data.playlist = this.data.playlist.map(item => {
      item.plays = 0
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

  async request(str) {
    await this.add(str, this.user.name)
  }

  findSongIdxByYoutubeId(youtubeId) {
    return this.data.playlist.findIndex(item => item.yt === youtubeId)
  }

  findSongIdxBySearchInOrder(str) {
    const split = str.split(/\s+/)
    const regexArgs = split.map(arg => arg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    const regex = new RegExp(regexArgs.join('.*'), 'i')
    return this.data.playlist.findIndex(item => item.title.match(regex))
  }

  findSongIdxBySearch(str) {
    const split = str.split(/\s+/)
    const regexArgs = split.map(arg => arg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    const regexes = regexArgs.map(arg => new RegExp(arg, 'i'))
    return this.data.playlist.findIndex(item => {
      for (const regex of regexes) {
        if (!item.title.match(regex)) {
          return false
        }
      }
      return true
    })
  }

  like() {
    this.incStat('goods')
    this.save()
    this.updateClients('like')
  }

  filter(filter) {
    this.data.filter = filter
    this.save()
    this.updateClients('filter')
  }

  addTag(tag, idx = -1) {
    if (idx === -1) {
      idx = this.determineFirstIndex()
    }
    if (idx === -1) {
      return
    }
    if (this.data.playlist.length > idx) {
      if (!this.data.playlist[idx].tags.includes(tag)) {
        this.data.playlist[idx].tags.push(tag)
        this.save()
        this.updateClients('tags')
      }
    }
  }

  updateTag(oldTag, newTag) {
    this.data.playlist = this.data.playlist.map(item => {
      item.tags = [...new Set(item.tags.map(tag => {
        return tag === oldTag ? newTag : tag
      }))]
      return item
    })
    this.save()
    this.updateClients('tags')
  }

  rmTag(tag, idx = -1) {
    if (idx === -1) {
      idx = this.determineFirstIndex()
    }
    if (idx === -1) {
      return
    }
    if (this.data.playlist.length > idx) {
      if (this.data.playlist[idx].tags.includes(tag)) {
        this.data.playlist[idx].tags = this.data.playlist[idx].tags.filter(t => t !== tag)
        this.save()
        this.updateClients('tags')
      }
    }
  }

  volume(vol) {
    if (vol < 0) {
      vol = 0
    }
    if (vol > 100) {
      vol = 100
    }
    this.data.settings.volume = parseInt(`${vol}`, 10)
    this.save()
    this.updateClients('settings')
  }

  pause() {
    this.updateClients('pause')
  }

  unpause() {
    this.updateClients('unpause')
  }

  loop() {
    this.updateClients('loop')
  }

  noloop() {
    this.updateClients('noloop')
  }

  dislike() {
    this.incStat('bads')
    this.save()
    this.updateClients('dislike')
  }

  settings(settings) {
    this.data.settings = settings
    this.save()
    this.updateClients('settings')
  }

  prev() {
    const index = this.determinePrevIndex()
    if (index >= 0) {
      this.playIdx(index)
    }
  }

  next() {
    const index = this.determineNextIndex()
    if (index >= 0) {
      this.playIdx(index)
    }
  }

  jumptonew() {
    if (this.data.playlist.length === 0) {
      return
    }
    const index = this.data.playlist.findIndex(item => item.plays === 0)
    if (index === -1) {
      // no unplayed songs left
      return
    }
    for (let i = 0; i < index; i++) {
      this.data.playlist.push(this.data.playlist.shift())
    }

    this.save()
    this.updateClients('skip')
  }

  clear() {
    this.data.playlist = []
    this.save()
    this.updateClients('clear')
  }

  shuffle() {
    if (this.data.playlist.length < 3) {
      return
    }

    const rest = this.data.playlist.slice(1)
    this.data.playlist = [
      this.data.playlist[0],
      ...fn.shuffle(rest.filter(item => item.plays === 0)),
      ...fn.shuffle(rest.filter(item => item.plays > 0)),
    ]

    this.save()
    this.updateClients('shuffle')
  }

  move(oldIndex, newIndex) {
    if (oldIndex >= this.data.playlist.length) {
      return
    }
    if (newIndex >= this.data.playlist.length) {
      return
    }

    this.data.playlist = fn.arrayMove(
      this.data.playlist,
      oldIndex,
      newIndex
    )

    this.save()
    this.updateClients('move')
  }

  remove() {
    if (this.data.playlist.length === 0) {
      return
    }
    this.data.playlist.shift()
    this.save()
    this.updateClients('remove')
  }

  undo(username) {
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

  async songrequestCmd(command, client, target, context, msg) {
    const modOrUp = () => fn.isMod(context) || fn.isBroadcaster(context)

    const say = fn.sayFn(client, target)
    const answerAddRequest = async (addType, idx) => {
      const item = idx >= 0 ? this.data.playlist[idx] : null
      let info
      if (idx < 0) {
        info = ``
      } else if (idx === 0) {
        info = `[Position ${idx + 1}, playing now]`
      } else {
        const last_play = this.data.playlist[0].last_play || 0
        const diffMs = last_play ? (new Date().getTime() - last_play) : 0
        const diff = Math.round(diffMs / 1000) * 1000
        const durationMs = await this.durationUntilIndex(idx) - diff
        const timePrediction = durationMs <= 0 ? '' : `, will play in ~${fn.humanDuration(durationMs)}`
        info = `[Position ${idx + 1}${timePrediction}]`
      }

      if (addType === ADD_TYPE.ADDED) {
        return `🎵 Added "${item.title}" (${Youtube.getUrlById(item.yt)}) to the playlist! ${info}`
      } else if (addType === ADD_TYPE.REQUEUED) {
        return `🎵 "${item.title}" (${Youtube.getUrlById(item.yt)}) was already in the playlist and only moved up. ${info}`
      } else if (addType === ADD_TYPE.EXISTED) {
        return `🎵 "${item.title}" (${Youtube.getUrlById(item.yt)}) was already in the playlist. ${info}`
      } else {
        return `Could not process that song request`
      }
    }

    if (command.name === '!resr') {
      if (command.args.length === 0) {
        say(`Usage: !resr SEARCH`)
        return
      }
      const searchterm = command.args.join(' ')
      const { addType, idx } = await this.resr(searchterm)
      if (idx >= 0) {
        say(await answerAddRequest(addType, idx))
      } else {
        say(`Song not found in playlist`)
      }
      return
    }

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
          say(`Currently playing: ${cur.title} (${Youtube.getUrlById(cur.yt)}, ${cur.plays}x plays, requested by ${cur.user})`)
          return
        case 'good':
          this.like()
          return
        case 'bad':
          this.dislike()
          return
        case 'prev':
          if (modOrUp()) {
            this.prev()
            return
          }
          break
        case 'hidevideo':
          if (modOrUp()) {
            this.videoVisibility(false)
            say(`Video is now hidden.`)
            return
          }
          break
        case 'showvideo':
          if (modOrUp()) {
            this.videoVisibility(true)
            say(`Video is now shown.`)
            return
          }
          break
        case 'next':
        case 'skip':
          if (modOrUp()) {
            this.next()
            return
          }
          break
        case 'jumptonew':
          if (modOrUp()) {
            this.jumptonew()
            return
          }
          break
        case 'pause':
          if (modOrUp()) {
            this.pause()
            return
          }
          break;
        case 'nopause':
        case 'unpause':
          if (modOrUp()) {
            this.unpause()
            return
          }
          break;
        case 'loop':
          if (modOrUp()) {
            this.loop()
            say('Now looping the current song')
            return
          }
          break;
        case 'noloop':
        case 'unloop':
          if (modOrUp()) {
            this.noloop()
            say('Stopped looping the current song')
            return
          }
          break;
        case 'stat':
        case 'stats':
          const stats = await this.stats(context['display-name'])
          let number = stats.count.byUser
          const verb = stats.count.byUser === 1 ? 'was' : 'were'
          if (stats.count.byUser === 1) {
            number = 'one'
          } else if (stats.count.byUser === 0) {
            number = 'none'
          }
          const countStr = `There are ${stats.count.total} songs in the playlist, `
            + `${number} of which ${verb} requested by ${context['display-name']}.`
          const durationStr = `The total duration of the playlist is ${stats.duration.human}.`
          say([countStr, durationStr].join(' '))
          return
        case 'resetStats':
          if (modOrUp()) {
            this.resetStats()
            return
          }
          break
        case 'clear':
          if (modOrUp()) {
            this.clear()
            return
          }
          break
        case 'rm':
          if (modOrUp()) {
            this.remove()
            return
          }
          break
        case 'shuffle':
          if (modOrUp()) {
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
    if (command.args[0] === 'tag' || command.args[0] === 'addtag') {
      if (modOrUp()) {
        const tag = command.args.slice(1).join(' ')
        this.addTag(tag)
        say(`Added tag "${tag}"`)
      }
      return
    }
    if (command.args[0] === 'rmtag') {
      if (modOrUp()) {
        const tag = command.args.slice(1).join(' ')
        this.rmTag(tag)
        say(`Removed tag "${tag}"`)
      }
      return
    }
    if (command.args[0] === 'filter') {
      if (modOrUp()) {
        const tag = command.args.slice(1).join(' ')
        this.filter({ tag })
        if (tag !== '') {
          say(`Playing only songs tagged with "${tag}"`)
        } else {
          say(`Playing all songs`)
        }
      }
      return
    }

    const str = command.args.join(' ')
    const { addType, idx } = await this.add(str, context['display-name'])
    say(await answerAddRequest(addType, idx))
  }

  async loadYoutubeData(youtubeId) {
    let key = `youtubeData_${youtubeId}_20210717_2`
    let d = this.cache.get(key)
    if (!d) {
      d = await Youtube.fetchDataByYoutubeId(youtubeId)
      this.cache.set(key, d)
    }
    return d
  }

  findInsertIndex() {
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

  createItem(youtubeId, youtubeData, userName) {
    return {
      id: Math.random(),
      yt: youtubeId,
      title: youtubeData.snippet.title,
      timestamp: new Date().getTime(),
      user: userName,
      plays: 0,
      goods: 0,
      bads: 0,
      tags: [],
    }
  }

  async addToPlaylist(tmpItem) {
    const idx = this.findSongIdxByYoutubeId(tmpItem.yt)
    let insertIndex = this.findInsertIndex()

    if (idx < 0) {
      this.data.playlist.splice(insertIndex, 0, tmpItem)
      this.save()
      this.updateClients('add')
      return {
        addType: ADD_TYPE.ADDED,
        idx: insertIndex,
      }
    }

    if (insertIndex > idx) {
      insertIndex = insertIndex - 1
    }

    if (insertIndex === idx) {
      return {
        addType: ADD_TYPE.EXISTED,
        idx: insertIndex,
      }
    }

    this.data.playlist = fn.arrayMove(this.data.playlist, idx, insertIndex)
    this.save()
    this.updateClients('add')
    return {
      addType: ADD_TYPE.REQUEUED,
      idx: insertIndex,
    }
  }

  async resr(str) {
    let idx = this.findSongIdxBySearchInOrder(str)
    if (idx < 0) {
      idx = this.findSongIdxBySearch(str)
    }

    if (idx < 0) {
      return {
        addType: ADD_TYPE.NOT_ADDED,
        insertIndex: -1,
      }
    }

    let insertIndex = this.findInsertIndex()

    if (insertIndex > idx) {
      insertIndex = insertIndex - 1
    }

    if (insertIndex === idx) {
      return {
        addType: ADD_TYPE.EXISTED,
        idx: insertIndex,
      }
    }

    this.data.playlist = fn.arrayMove(this.data.playlist, idx, insertIndex)
    this.save()
    this.updateClients('add')
    return {
      addType: ADD_TYPE.REQUEUED,
      idx: insertIndex,
    }
  }
}

export default SongrequestModule
