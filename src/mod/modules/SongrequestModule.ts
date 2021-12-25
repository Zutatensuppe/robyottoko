import Db from '../../Db'
import fn, { findIdxFuzzy, logger } from '../../fn'
import WebServer from '../../WebServer'
import WebSocketServer, { Socket } from '../../net/WebSocketServer'
import Youtube, { YoutubeVideosResponseDataEntry } from '../../services/Youtube'
import Variables from '../../services/Variables'
import { User } from '../../services/Users'
import { ChatMessageContext, PlaylistItem, RawCommand, TwitchChatClient, TwitchChatContext, CommandRestrict, RewardRedemptionContext } from '../../types'
import ModuleStorage from '../ModuleStorage'
import Cache from '../../services/Cache'
import TwitchClientManager from '../../net/TwitchClientManager'
import { newCommandTrigger } from '../../util'

const log = logger('SongrequestModule.ts')

const MOD_OR_ABOVE: CommandRestrict[] = ["mod", "broadcaster"]

const ADD_TYPE = {
  NOT_ADDED: 0,
  ADDED: 1,
  REQUEUED: 2,
  EXISTED: 3,
}


interface SongrequestModuleCustomCssPreset {
  name: string
  css: string
  showProgressBar: boolean
  showThumbnails: boolean
  maxItemsShown: number
}

export interface SongrequestModuleSettings {
  volume: number
  hideVideoImage: {
    file: string
    filename: string
  }
  customCss: string
  customCssPresets: SongrequestModuleCustomCssPreset[]
  initAutoplay: boolean
  showProgressBar: boolean
  showThumbnails: boolean
  maxItemsShown: number
}

interface SongrequestModuleData {
  filter: {
    tag: string
  }
  settings: SongrequestModuleSettings
  playlist: PlaylistItem[]
  stacks: Record<string, string[]>
}

export interface SongrequestModuleWsEventData {
  filter: {
    tag: string
  },
  playlist: PlaylistItem[],
  settings: SongrequestModuleSettings,
}

interface WsData {
  event: string
  data: SongrequestModuleWsEventData
}

const default_custom_css_preset = (obj: any = null) => ({
  name: obj?.name || '',
  css: obj?.css || '',
  showProgressBar: typeof obj?.showProgressBar === 'undefined' ? false : obj.showProgressBar,
  showThumbnails: typeof obj?.showThumbnails === 'undefined' ? true : obj.showThumbnails,
  maxItemsShown: typeof obj?.maxItemsShown === 'undefined' ? -1 : obj.maxItemsShown,
})

const default_settings = (obj: any = null) => ({
  volume: obj?.volume || 100,
  hideVideoImage: {
    file: obj?.hideVideoImage?.file || '',
    filename: obj?.hideVideoImage?.filename || '',
  },
  customCss: obj?.customCss || '',
  customCssPresets: typeof obj?.customCssPresets === 'undefined' ? [] : obj.customCssPresets.map(default_custom_css_preset),
  showProgressBar: typeof obj?.showProgressBar === 'undefined' ? false : obj.showProgressBar,
  initAutoplay: typeof obj?.initAutoplay === 'undefined' ? true : obj.initAutoplay,
  showThumbnails: typeof obj?.showThumbnails === 'undefined' ? true : obj.showThumbnails,
  maxItemsShown: typeof obj?.maxItemsShown === 'undefined' ? -1 : obj.maxItemsShown,
})

const default_playlist_item = (item: any = null): PlaylistItem => {
  return {
    id: item?.id || 0,
    tags: item?.tags || [],
    yt: item?.yt || '',
    title: item?.title || '',
    timestamp: item?.timestamp || 0,
    hidevideo: !!(item?.hidevideo),
    last_play: item?.last_play || 0,
    plays: item?.plays || 0,
    goods: item?.goods || 0,
    bads: item?.bads || 0,
    user: item?.user || '',
  }
}

const default_playlist = (list: any = null): PlaylistItem[] => {
  if (Array.isArray(list)) {
    return list.map(item => default_playlist_item(item))
  }
  return []
}

class SongrequestModule {
  public name = 'sr'
  public variables: Variables

  private user: User
  private cache: Cache
  private storage: ModuleStorage
  private wss: WebSocketServer
  private data: SongrequestModuleData
  constructor(
    db: Db,
    user: User,
    variables: Variables,
    clientManager: TwitchClientManager,
    storage: ModuleStorage,
    cache: Cache,
    ws: WebServer,
    wss: WebSocketServer
  ) {
    this.variables = variables
    this.user = user
    this.cache = cache
    this.storage = storage
    this.wss = wss
    const data = this.storage.load(this.name, {
      filter: {
        tag: '',
      },
      settings: default_settings(),
      playlist: default_playlist(),
      stacks: {},
    })

    // make sure items have correct structure
    // needed by rest of the code
    // TODO: maybe use same code as in save function
    data.playlist = default_playlist(data.playlist)
    data.settings = default_settings(data.settings)

    this.data = {
      filter: data.filter,
      playlist: data.playlist,
      settings: data.settings,
      stacks: data.stacks,
    }
  }

  saveCommands() {
    // pass
  }

  widgets() {
    return {
      'sr': (req: any, res: any, next: Function) => {
        return {
          title: 'Song Request Widget',
          page: 'sr',
          wsUrl: `${this.wss.connectstring()}/${this.name}`,
          widgetToken: req.params.widget_token,
        }
      },
    }
  }

  getRoutes() {
    return {
      post: {
        '/api/sr/import': async (req: any, res: any, next: Function) => {
          try {
            this.data.settings = default_settings(req.body.settings)
            this.data.playlist = default_playlist(req.body.playlist)
            this.save()
            this.updateClients('init')
            res.send({ error: false })
          } catch (e) {
            res.status(400).send({ error: true })
          }
        },
      },
      get: {
        '/api/sr/export': async (req: any, res: any, next: Function) => {
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
        item.timestamp = item.timestamp || new Date().getTime()
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

  wsdata(eventName: string): WsData {
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

  updateClient(eventName: string, ws: Socket) {
    this.wss.notifyOne([this.user.id], this.name, this.wsdata(eventName), ws)
  }

  updateClients(eventName: string) {
    this.wss.notifyAll([this.user.id], this.name, this.wsdata(eventName))
  }

  getWsEvents() {
    return {
      'conn': (ws: Socket) => {
        this.updateClient('init', ws)
      },
      'play': (ws: Socket, { id }: { id: number }) => {
        const idx = this.data.playlist.findIndex(item => item.id === id)
        if (idx < 0) {
          return
        }
        this.data.playlist = ([] as PlaylistItem[]).concat(
          this.data.playlist.slice(idx),
          this.data.playlist.slice(0, idx)
        )
        this.incStat('plays')
        this.data.playlist[idx].last_play = new Date().getTime()

        this.save()
        this.updateClients('playIdx')
      },
      'ended': (ws: Socket) => {
        const item = this.data.playlist.shift()
        if (item) {
          this.data.playlist.push(item)
        }
        this.save()
        this.updateClients('onEnded')
      },
      'ctrl': (ws: Socket, { ctrl, args }: { ctrl: string, args: any[] }) => {
        switch (ctrl) {
          case 'volume': this.volume(...args as [number]); break;
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
          case 'playIdx': this.playIdx(...args as [number]); break;
          case 'rmIdx': this.rmIdx(...args as [number]); break;
          case 'goodIdx': this.goodIdx(...args as [number]); break;
          case 'badIdx': this.badIdx(...args as [number]); break;
          case 'sr': this.request(...args as [string]); break;
          case 'resr': this.resr(...args as [string]); break;
          case 'move': this.move(...args as [number, number]); break;
          case 'rmtag': this.rmTag(...args as [string, number]); break;
          case 'addtag': this.addTag(...args as [string, number]); break;
          case 'updatetag': this.updateTag(...args as [string, string]); break;
          case 'filter': this.filter(...args as [{ tag: string }]); break;
          case 'videoVisibility': this.videoVisibility(...args as [boolean, number]); break;
          case 'settings': this.settings(...args as [SongrequestModuleSettings]); break;
        }
      },
    }
  }

  async add(str: string, userName: string) {
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

    const tmpItem = this.createItem(youtubeId, youtubeData, userName)
    const { addType, idx } = await this.addToPlaylist(tmpItem)
    if (addType === ADD_TYPE.ADDED) {
      this.data.stacks[userName] = this.data.stacks[userName] || []
      this.data.stacks[userName].push(youtubeId)
    }
    return { addType, idx }
  }

  determinePrevIndex() {
    let index = -1
    for (let i = 0; i < this.data.playlist.length; i++) {
      const item = this.data.playlist[i]
      if (this.data.filter.tag === '' || item.tags.includes(this.data.filter.tag)) {
        index = i
      }
    }
    return index
  }

  determineNextIndex() {
    for (let i = 0; i < this.data.playlist.length; i++) {
      if (i === 0) {
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

  incStat(stat: 'goods' | 'bads' | 'plays', idx: number = -1) {
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

  videoVisibility(visible: boolean, idx = -1) {
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

  async durationUntilIndex(idx: number) {
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

  async stats(userName: string) {
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

  playIdx(idx: number) {
    if (this.data.playlist.length === 0) {
      return
    }
    while (idx-- > 0) {
      const item = this.data.playlist.shift()
      if (item) {
        this.data.playlist.push(item)
      }
    }

    this.save()
    this.updateClients('skip')
  }

  rmIdx(idx: number) {
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

  goodIdx(idx: number) {
    this.incStat('goods', idx)
    this.save()
    this.updateClients('like')
  }

  badIdx(idx: number) {
    this.incStat('bads', idx)
    this.save()
    this.updateClients('dislike')
  }

  async request(str: string) {
    await this.add(str, this.user.name)
  }

  findSongIdxByYoutubeId(youtubeId: string) {
    return this.data.playlist.findIndex(item => item.yt === youtubeId)
  }

  like() {
    this.incStat('goods')
    this.save()
    this.updateClients('like')
  }

  filter(filter: { tag: string }) {
    this.data.filter = filter
    this.save()
    this.updateClients('filter')
  }

  addTag(tag: string, idx = -1) {
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

  updateTag(oldTag: string, newTag: string) {
    this.data.playlist = this.data.playlist.map(item => {
      item.tags = [...new Set(item.tags.map(tag => {
        return tag === oldTag ? newTag : tag
      }))]
      return item
    })
    this.save()
    this.updateClients('tags')
  }

  rmTag(tag: string, idx = -1) {
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

  volume(vol: number) {
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

  settings(settings: SongrequestModuleSettings) {
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
      const item = this.data.playlist.shift()
      if (item) {
        this.data.playlist.push(item)
      }
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

  move(oldIndex: number, newIndex: number) {
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

  undo(username: string) {
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

  async answerAddRequest(addType: number, idx: number) {
    const item = idx >= 0 ? this.data.playlist[idx] : null
    if (!item) {
      return `Could not process that song request`
    }
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

  async cmdSrCurrent(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
    msg: string | null,
  ) {
    if (!client || !command || !context) {
      return
    }
    const say = fn.sayFn(client, target)
    if (this.data.playlist.length === 0) {
      say(`Playlist is empty`)
      return
    }
    const cur = this.data.playlist[0]
    // todo: error handling, title output etc..
    say(`Currently playing: ${cur.title} (${Youtube.getUrlById(cur.yt)}, ${cur.plays}x plays, requested by ${cur.user})`)
  }

  async cmdSrUndo(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
    msg: string | null,
  ) {
    if (!client || !command || !context) {
      return
    }
    const say = fn.sayFn(client, target)
    const undid = this.undo(context['display-name'])
    if (!undid) {
      say(`Could not undo anything`)
    } else {
      say(`Removed "${undid.title}" from the playlist!`)
    }
  }

  async cmdResr(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
    msg: string | null,
  ) {
    if (!client || !command || !context) {
      return
    }

    const say = fn.sayFn(client, target)

    if (command.args.length === 0) {
      say(`Usage: !resr SEARCH`)
      return
    }

    const searchterm = command.args.join(' ')
    const { addType, idx } = await this.resr(searchterm)
    if (idx >= 0) {
      say(await this.answerAddRequest(addType, idx))
    } else {
      say(`Song not found in playlist`)
    }
  }

  async cmdSrGood(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
    msg: string | null,
  ) {
    this.like()
  }

  async cmdSrBad(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
    msg: string | null,
  ) {
    this.dislike()
  }

  async cmdSrStats(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
    msg: string | null,
  ) {
    if (!client || !command || !context) {
      return
    }

    const say = fn.sayFn(client, target)

    const stats = await this.stats(context['display-name'])
    let number = `${stats.count.byUser}`
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
  }

  async cmdSrPrev(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
    msg: string | null,
  ) {
    this.prev()
  }

  async cmdSrNext(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
    msg: string | null,
  ) {
    this.next()
  }

  async cmdSrJumpToNew(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
    msg: string | null,
  ) {
    this.jumptonew()
  }

  async cmdSrClear(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
    msg: string | null,
  ) {
    this.clear()
  }

  async cmdSrRm(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
    msg: string | null,
  ) {
    this.remove()
  }

  async cmdSrShuffle(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
    msg: string | null,
  ) {
    this.shuffle()
  }

  async cmdSrResetStats(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
    msg: string | null,
  ) {
    this.resetStats()
  }

  async cmdSrLoop(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
    msg: string | null,
  ) {
    if (!client) {
      return
    }
    const say = fn.sayFn(client, target)
    this.loop()
    say('Now looping the current song')
  }

  async cmdSrNoloop(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
    msg: string | null,
  ) {
    if (!client) {
      return
    }
    const say = fn.sayFn(client, target)
    this.noloop()
    say('Stopped looping the current song')
  }

  async cmdSrAddTag(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
    msg: string | null,
  ) {
    if (!client || !command) {
      return
    }
    if (!command.args.length) {
      return
    }
    const say = fn.sayFn(client, target)
    const tag = command.args.join(' ')
    this.addTag(tag)
    say(`Added tag "${tag}"`)
  }

  async cmdSrRmTag(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
    msg: string | null,
  ) {
    if (!client || !command) {
      return
    }
    if (!command.args.length) {
      return
    }
    const say = fn.sayFn(client, target)
    const tag = command.args.join(' ')
    this.rmTag(tag)
    say(`Removed tag "${tag}"`)
  }

  async cmdSrPause(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
    msg: string | null,
  ) {
    this.pause()
  }

  async cmdSrUnpause(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
    msg: string | null,
  ) {
    this.unpause()
  }

  async cmdSrVolume(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
    msg: string | null,
  ) {
    if (!client || !command) {
      return
    }

    const say = fn.sayFn(client, target)
    if (command.args.length === 0) {
      say(`Current volume: ${this.data.settings.volume}`)
    } else {
      this.volume(parseInt(command.args[0], 10))
      say(`New volume: ${this.data.settings.volume}`)
    }
  }

  async cmdSrHidevideo(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
    msg: string | null,
  ) {
    if (!client) {
      return
    }
    const say = fn.sayFn(client, target)
    this.videoVisibility(false)
    say(`Video is now hidden.`)
  }

  async cmdSrShowvideo(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
    msg: string | null,
  ) {
    if (!client) {
      return
    }
    const say = fn.sayFn(client, target)
    this.videoVisibility(true)
    say(`Video is now shown.`)
  }

  async cmdSrFilter(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
    msg: string | null,
  ) {
    if (!client || !command || !context) {
      return
    }

    const say = fn.sayFn(client, target)
    const tag = command.args.join(' ')
    this.filter({ tag })
    if (tag !== '') {
      say(`Playing only songs tagged with "${tag}"`)
    } else {
      say(`Playing all songs`)
    }
  }

  async cmdSrPreset(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
    msg: string | null,
  ) {
    if (!client || !command || !context) {
      return
    }

    const say = fn.sayFn(client, target)
    const presetName = command.args.join(' ')
    if (presetName === '') {
      if (this.data.settings.customCssPresets.length) {
        say(`Presets: ${this.data.settings.customCssPresets.map(preset => preset.name).join(', ')}`)
      } else {
        say(`No presets configured`)
      }
    } else {
      const preset = this.data.settings.customCssPresets.find(preset => preset.name === presetName)
      if (preset) {
        this.data.settings.customCss = preset.css
        say(`Switched to preset: ${presetName}`)
      } else {
        say(`Preset does not exist: ${presetName}`)
      }
      this.updateClients('settings')
    }
  }

  async cmdSr(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
    msg: string | null,
  ) {
    if (!client || !command || !context) {
      return
    }

    const say = fn.sayFn(client, target)

    if (command.args.length === 0) {
      say(`Usage: !sr YOUTUBE-URL`)
      return
    }

    const str = command.args.join(' ')
    const { addType, idx } = await this.add(str, context['display-name'])
    say(await this.answerAddRequest(addType, idx))
  }

  async loadYoutubeData(youtubeId: string): Promise<YoutubeVideosResponseDataEntry> {
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

  createItem(
    youtubeId: string,
    youtubeData: YoutubeVideosResponseDataEntry,
    userName: string,
  ): PlaylistItem {
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
      last_play: 0,
    }
  }

  async addToPlaylist(tmpItem: PlaylistItem): Promise<{ addType: number, idx: number }> {
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

  async resr(str: string) {
    const idx = findIdxFuzzy(this.data.playlist, str, (item) => item.title)
    if (idx < 0) {
      return {
        addType: ADD_TYPE.NOT_ADDED,
        idx: -1,
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

  getCommands() {
    return [
      { triggers: [newCommandTrigger('!sr current', true)], fn: this.cmdSrCurrent.bind(this) },
      { triggers: [newCommandTrigger('!sr undo', true)], fn: this.cmdSrUndo.bind(this) },
      { triggers: [newCommandTrigger('!sr good', true)], fn: this.cmdSrGood.bind(this) },
      { triggers: [newCommandTrigger('!sr bad', true)], fn: this.cmdSrBad.bind(this) },
      { triggers: [newCommandTrigger('!sr stat', true)], fn: this.cmdSrStats.bind(this) },
      { triggers: [newCommandTrigger('!sr stats', true)], fn: this.cmdSrStats.bind(this) },
      { triggers: [newCommandTrigger('!sr prev', true)], restrict_to: MOD_OR_ABOVE, fn: this.cmdSrPrev.bind(this) },
      { triggers: [newCommandTrigger('!sr next', true)], restrict_to: MOD_OR_ABOVE, fn: this.cmdSrNext.bind(this) },
      { triggers: [newCommandTrigger('!sr skip', true)], restrict_to: MOD_OR_ABOVE, fn: this.cmdSrNext.bind(this) },
      { triggers: [newCommandTrigger('!sr jumptonew', true)], restrict_to: MOD_OR_ABOVE, fn: this.cmdSrJumpToNew.bind(this) },
      { triggers: [newCommandTrigger('!sr clear', true)], restrict_to: MOD_OR_ABOVE, fn: this.cmdSrClear.bind(this) },
      { triggers: [newCommandTrigger('!sr rm', true)], restrict_to: MOD_OR_ABOVE, fn: this.cmdSrRm.bind(this) },
      { triggers: [newCommandTrigger('!sr shuffle', true)], restrict_to: MOD_OR_ABOVE, fn: this.cmdSrShuffle.bind(this) },
      { triggers: [newCommandTrigger('!sr resetStats', true)], restrict_to: MOD_OR_ABOVE, fn: this.cmdSrResetStats.bind(this) },
      { triggers: [newCommandTrigger('!sr loop', true)], restrict_to: MOD_OR_ABOVE, fn: this.cmdSrLoop.bind(this) },
      { triggers: [newCommandTrigger('!sr noloop', true)], restrict_to: MOD_OR_ABOVE, fn: this.cmdSrNoloop.bind(this) },
      { triggers: [newCommandTrigger('!sr unloop', true)], restrict_to: MOD_OR_ABOVE, fn: this.cmdSrNoloop.bind(this) },
      { triggers: [newCommandTrigger('!sr pause', true)], restrict_to: MOD_OR_ABOVE, fn: this.cmdSrPause.bind(this) },
      { triggers: [newCommandTrigger('!sr nopause', true)], restrict_to: MOD_OR_ABOVE, fn: this.cmdSrUnpause.bind(this) },
      { triggers: [newCommandTrigger('!sr unpause', true)], restrict_to: MOD_OR_ABOVE, fn: this.cmdSrUnpause.bind(this) },
      { triggers: [newCommandTrigger('!sr hidevideo', true)], restrict_to: MOD_OR_ABOVE, fn: this.cmdSrHidevideo.bind(this) },
      { triggers: [newCommandTrigger('!sr showvideo', true)], restrict_to: MOD_OR_ABOVE, fn: this.cmdSrShowvideo.bind(this) },
      { triggers: [newCommandTrigger('!sr')], fn: this.cmdSr.bind(this) },
      { triggers: [newCommandTrigger('!resr')], fn: this.cmdResr.bind(this) },
      { triggers: [newCommandTrigger('!sr tag')], restrict_to: MOD_OR_ABOVE, fn: this.cmdSrAddTag.bind(this) },
      { triggers: [newCommandTrigger('!sr addtag')], restrict_to: MOD_OR_ABOVE, fn: this.cmdSrAddTag.bind(this) },
      { triggers: [newCommandTrigger('!sr rmtag')], restrict_to: MOD_OR_ABOVE, fn: this.cmdSrRmTag.bind(this) },
      { triggers: [newCommandTrigger('!sr volume')], restrict_to: MOD_OR_ABOVE, fn: this.cmdSrVolume.bind(this) },
      { triggers: [newCommandTrigger('!sr filter')], restrict_to: MOD_OR_ABOVE, fn: this.cmdSrFilter.bind(this) },
      { triggers: [newCommandTrigger('!sr preset')], restrict_to: MOD_OR_ABOVE, fn: this.cmdSrPreset.bind(this) },
    ]
  }

  async onChatMsg(chatMessageContext: ChatMessageContext) {
  }

  async onRewardRedemption(RewardRedemptionContext: RewardRedemptionContext) {
  }
}

export default SongrequestModule
