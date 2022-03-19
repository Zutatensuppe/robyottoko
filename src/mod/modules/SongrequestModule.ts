import fn, { findIdxFuzzy } from '../../fn'
import { shuffle, arrayMove, logger, humanDuration, parseHumanDuration } from '../../common/fn'
import { Socket } from '../../net/WebSocketServer'
import Youtube, { YoutubeVideosResponseDataEntry } from '../../services/Youtube'
import { User } from '../../services/Users'
import {
  ChatMessageContext, PlaylistItem, RawCommand, TwitchChatClient,
  TwitchChatContext, RewardRedemptionContext, FunctionCommand, Command,
  Bot, CommandFunction, Module
} from '../../types'
import {
  default_commands,
  default_settings, SongerquestModuleInitData, SongrequestModuleData,
  SongrequestModuleSettings, SongrequestModuleWsEventData
} from './SongrequestModuleCommon'
import { NextFunction, Response } from 'express'
import { isBroadcaster, isMod, isSubscriber } from '../../common/permissions'

const log = logger('SongrequestModule.ts')

const ADD_TYPE = {
  NOT_ADDED: 0,
  ADDED: 1,
  REQUEUED: 2,
  EXISTED: 3,
}

const NOT_ADDED_REASON = {
  TOO_MANY_QUEUED: 0,
  TOO_LONG: 1,
  NOT_FOUND_IN_PLAYLIST: 2,
  NOT_FOUND: 3,
}

interface AddResponseData {
  addType: number
  idx: number
  reason: number
}

interface WsData {
  event: string
  data: SongrequestModuleWsEventData
}

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

class SongrequestModule implements Module {
  public name = 'sr'

  public bot: Bot
  public user: User
  private data: SongrequestModuleData

  private commands: FunctionCommand[]

  private channelPointsCustomRewards: Record<string, string[]> = {}

  constructor(
    bot: Bot,
    user: User,
  ) {
    this.bot = bot
    this.user = user

    const initData = this.reinit()
    this.data = {
      filter: initData.data.filter,
      playlist: initData.data.playlist,
      commands: initData.data.commands,
      settings: initData.data.settings,
      stacks: initData.data.stacks,
    }
    this.commands = initData.commands
  }

  async userChanged(user: User) {
    this.user = user
  }

  reinit(): SongerquestModuleInitData {
    const data = this.bot.getUserModuleStorage(this.user).load(this.name, {
      filter: {
        tag: '',
      },
      settings: default_settings(),
      playlist: default_playlist(),
      commands: default_commands(),
      stacks: {},
    })

    // make sure items have correct structure
    // needed by rest of the code
    // TODO: maybe use same code as in save function
    data.playlist = default_playlist(data.playlist)
    data.settings = default_settings(data.settings)
    data.commands = default_commands(data.commands)

    return {
      data: {
        playlist: data.playlist,
        settings: data.settings,
        commands: data.commands,
        filter: data.filter,
        stacks: data.stacks,
      },
      commands: this.initCommands(data.commands),
    }
  }

  initCommands(rawCommands: Command[]): FunctionCommand[] {
    const map: Record<string, ((originalCmd: any) => CommandFunction)> = {
      sr_current: this.cmdSrCurrent.bind(this),
      sr_undo: this.cmdSrUndo.bind(this),
      sr_good: this.cmdSrGood.bind(this),
      sr_bad: this.cmdSrBad.bind(this),
      sr_stats: this.cmdSrStats.bind(this),
      sr_prev: this.cmdSrPrev.bind(this),
      sr_next: this.cmdSrNext.bind(this),
      sr_jumptonew: this.cmdSrJumpToNew.bind(this),
      sr_clear: this.cmdSrClear.bind(this),
      sr_rm: this.cmdSrRm.bind(this),
      sr_shuffle: this.cmdSrShuffle.bind(this),
      sr_reset_stats: this.cmdSrResetStats.bind(this),
      sr_loop: this.cmdSrLoop.bind(this),
      sr_noloop: this.cmdSrNoloop.bind(this),
      sr_pause: this.cmdSrPause.bind(this),
      sr_unpause: this.cmdSrUnpause.bind(this),
      sr_hidevideo: this.cmdSrHidevideo.bind(this),
      sr_showvideo: this.cmdSrShowvideo.bind(this),
      sr_request: this.cmdSr.bind(this),
      sr_re_request: this.cmdResr.bind(this),
      sr_addtag: this.cmdSrAddTag.bind(this),
      sr_rmtag: this.cmdSrRmTag.bind(this),
      sr_volume: this.cmdSrVolume.bind(this),
      sr_filter: this.cmdSrFilter.bind(this),
      sr_preset: this.cmdSrPreset.bind(this),
      sr_queue: this.cmdSrQueue.bind(this),
    }
    const commands: FunctionCommand[] = []
    rawCommands.forEach((cmd: Command) => {
      if (cmd.triggers.length === 0 || !map[cmd.action]) {
        return
      }
      commands.push(Object.assign({}, cmd, { fn: map[cmd.action](cmd) }))
    })
    return commands
  }

  saveCommands() {
    // pass
  }

  getRoutes() {
    return {
      post: {
        '/api/sr/import': async (req: any, res: Response, _next: NextFunction) => {
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
        '/api/sr/export': async (_req: any, res: Response, _next: NextFunction) => {
          res.send({
            settings: this.data.settings,
            playlist: this.data.playlist,
          })
        },
      },
    }
  }

  save() {
    this.bot.getUserModuleStorage(this.user).save(this.name, {
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
      commands: this.data.commands,
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
        commands: this.data.commands,
        globalVariables: this.bot.getUserVariables(this.user).all(),
        channelPointsCustomRewards: this.channelPointsCustomRewards,
      }
    };
  }

  updateClient(eventName: string, ws: Socket) {
    this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, this.wsdata(eventName), ws)
  }

  updateClients(eventName: string) {
    this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, this.wsdata(eventName))
  }

  async _channelPointsCustomRewards(): Promise<Record<string, string[]>> {
    const helixClient = this.bot.getUserTwitchClientManager(this.user).getHelixClient()
    if (helixClient) {
      return await helixClient.getAllChannelPointsCustomRewards()
    }
    return {}
  }

  getWsEvents() {
    return {
      'conn': async (ws: Socket) => {
        this.channelPointsCustomRewards = await this._channelPointsCustomRewards()
        this.updateClient('init', ws)
      },
      'play': (_ws: Socket, { id }: { id: number }) => {
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
      'ended': (_ws: Socket) => {
        const item = this.data.playlist.shift()
        if (item) {
          this.data.playlist.push(item)
        }
        this.save()
        this.updateClients('onEnded')
      },
      'save': (_ws: Socket, data: { commands: Command[], settings: SongrequestModuleSettings }) => {
        this.data.commands = data.commands
        this.data.settings = data.settings
        this.save()
        const initData = this.reinit()
        this.data = initData.data
        this.commands = initData.commands
        this.updateClients('save')
      },
      'ctrl': (_ws: Socket, { ctrl, args }: { ctrl: string, args: any[] }) => {
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
          case 'resetStatIdx': this.resetStatIdx(...args as [string, number]); break;
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
          case 'setAllToPlayed': this.setAllToPlayed(); break;
        }
      },
    }
  }

  async add(str: string, userName: string, maxLenMs: number, maxQueued: number): Promise<AddResponseData> {
    const countQueuedSongsByUser = () => this.data.playlist.filter(item => item.user === userName && item.plays === 0).length
    const isTooLong = (ytData: YoutubeVideosResponseDataEntry) => {
      if (maxLenMs > 0) {
        const songLenMs = fn.parseISO8601Duration(ytData.contentDetails.duration)
        if (maxLenMs < songLenMs) {
          return true
        }
      }
      return false
    }

    if (maxQueued > 0 && countQueuedSongsByUser() >= maxQueued) {
      return { addType: ADD_TYPE.NOT_ADDED, idx: -1, reason: NOT_ADDED_REASON.TOO_MANY_QUEUED }
    }

    const youtubeUrl = str.trim()

    let youtubeId = null
    let youtubeData = null

    const tmpYoutubeId = Youtube.extractYoutubeId(youtubeUrl)
    if (tmpYoutubeId) {
      const tmpYoutubeData = await this.loadYoutubeData(tmpYoutubeId)
      if (isTooLong(tmpYoutubeData)) {
        return { addType: ADD_TYPE.NOT_ADDED, idx: -1, reason: NOT_ADDED_REASON.TOO_LONG }
      }
      youtubeId = tmpYoutubeId
      youtubeData = tmpYoutubeData
    }
    if (!youtubeData) {
      const youtubeIds = await Youtube.getYoutubeIdsBySearch(youtubeUrl)
      if (youtubeIds) {
        const reasons = []
        for (const tmpYoutubeId of youtubeIds) {
          const tmpYoutubeData = await this.loadYoutubeData(tmpYoutubeId)
          if (!tmpYoutubeData) {
            continue
          }
          if (isTooLong(tmpYoutubeData)) {
            reasons.push(NOT_ADDED_REASON.TOO_LONG)
            continue
          }
          youtubeId = tmpYoutubeId
          youtubeData = tmpYoutubeData
          break
        }
        if (!youtubeId || !youtubeData) {
          if (reasons.includes(NOT_ADDED_REASON.TOO_LONG)) {
            return { addType: ADD_TYPE.NOT_ADDED, idx: -1, reason: NOT_ADDED_REASON.TOO_LONG }
          }
        }
      }
    }
    if (!youtubeId || !youtubeData) {
      return { addType: ADD_TYPE.NOT_ADDED, idx: -1, reason: NOT_ADDED_REASON.NOT_FOUND }
    }

    const tmpItem = this.createItem(youtubeId, youtubeData, userName)
    const { addType, idx, reason } = await this.addToPlaylist(tmpItem)
    if (addType === ADD_TYPE.ADDED) {
      this.data.stacks[userName] = this.data.stacks[userName] || []
      this.data.stacks[userName].push(youtubeId)
    }
    return { addType, idx, reason }
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
        human: humanDuration(durationTotal),
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
    this.updateClients('stats')
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

  resetStatIdx(stat: string, idx: number) {
    if (idx >= 0 && idx < this.data.playlist.length) {
      if (stat === 'plays') {
        this.data.playlist[idx].plays = 0
      } else if (stat === 'goods') {
        this.data.playlist[idx].goods = 0
      } else if (stat === 'bads') {
        this.data.playlist[idx].bads = 0
      }
    }
    this.save()
    this.updateClients('stats')
  }

  goodIdx(idx: number) {
    this.incStat('goods', idx)
    this.save()
    this.updateClients('stats')
  }

  badIdx(idx: number) {
    this.incStat('bads', idx)
    this.save()
    this.updateClients('stats')
  }

  async request(str: string) {
    // this comes from backend, always unlimited length
    const maxLen = 0
    const maxQueued = 0
    await this.add(str, this.user.name, maxLen, maxQueued)
  }

  findSongIdxByYoutubeId(youtubeId: string) {
    return this.data.playlist.findIndex(item => item.yt === youtubeId)
  }

  like() {
    this.incStat('goods')
    this.save()
    this.updateClients('stats')
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
    this.updateClients('stats')
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
    this.updateClients('init')
  }

  setAllToPlayed() {
    this.data.playlist = this.data.playlist.map(item => {
      item.plays = item.plays || 1
      return item
    })
    this.save()
    this.updateClients('init')
  }

  shuffle() {
    if (this.data.playlist.length < 3) {
      return
    }

    const rest = this.data.playlist.slice(1)
    this.data.playlist = [
      this.data.playlist[0],
      ...shuffle(rest.filter(item => item.plays === 0)),
      ...shuffle(rest.filter(item => item.plays > 0)),
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

    this.data.playlist = arrayMove(
      this.data.playlist,
      oldIndex,
      newIndex
    )

    this.save()
    this.updateClients('move')
  }

  remove(): PlaylistItem | null {
    if (this.data.playlist.length === 0) {
      return null
    }
    const removedItem = this.data.playlist.shift()
    this.save()
    this.updateClients('remove')
    return removedItem || null
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

  async answerAddRequest(addResponseData: AddResponseData) {
    const idx = addResponseData.idx
    const reason = addResponseData.reason
    const addType = addResponseData.addType

    if (addType === ADD_TYPE.NOT_ADDED) {
      if (reason === NOT_ADDED_REASON.NOT_FOUND) {
        return `No song found`
      } else if (reason === NOT_ADDED_REASON.NOT_FOUND_IN_PLAYLIST) {
        return `Song not found in playlist`
      } else if (reason === NOT_ADDED_REASON.TOO_LONG) {
        return `Song too long`
      } else if (reason === NOT_ADDED_REASON.TOO_MANY_QUEUED) {
        return `Too many songs queued`
      } else {
        return `Could not process that song request`
      }
    }

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
      const timePrediction = durationMs <= 0 ? '' : `, will play in ~${humanDuration(durationMs)}`
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

  cmdSrCurrent(_originalCommand: any) {
    return async (
      command: RawCommand | null,
      client: TwitchChatClient | null,
      target: string | null,
      context: TwitchChatContext | null,
      _msg: string | null,
    ) => {
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
  }

  cmdSrUndo(_originalCommand: any) {
    return async (
      command: RawCommand | null,
      client: TwitchChatClient | null,
      target: string | null,
      context: TwitchChatContext | null,
      _msg: string | null,
    ) => {
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
  }

  cmdResr(_originalCommand: any) {
    return async (
      command: RawCommand | null,
      client: TwitchChatClient | null,
      target: string | null,
      context: TwitchChatContext | null,
      _msg: string | null,
    ) => {
      if (!client || !command || !context) {
        return
      }

      const say = fn.sayFn(client, target)

      if (command.args.length === 0) {
        say(`Usage: !resr SEARCH`)
        return
      }

      const searchterm = command.args.join(' ')
      const addResponseData = await this.resr(searchterm)
      say(await this.answerAddRequest(addResponseData))
    }
  }

  cmdSrGood(_originalCommand: any) {
    return async (
      _command: RawCommand | null,
      _client: TwitchChatClient | null,
      _target: string | null,
      _context: TwitchChatContext | null,
      _msg: string | null,
    ) => {
      this.like()
    }
  }

  cmdSrBad(_originalCommand: any) {
    return async (
      _command: RawCommand | null,
      _client: TwitchChatClient | null,
      _target: string | null,
      _context: TwitchChatContext | null,
      _msg: string | null,
    ) => {
      this.dislike()
    }
  }

  cmdSrStats(_originalCommand: any) {
    return async (
      command: RawCommand | null,
      client: TwitchChatClient | null,
      target: string | null,
      context: TwitchChatContext | null,
      _msg: string | null,
    ) => {
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
  }

  cmdSrPrev(_originalCommand: any) {
    return async (
      _command: RawCommand | null,
      _client: TwitchChatClient | null,
      _target: string | null,
      _context: TwitchChatContext | null,
      _msg: string | null,
    ) => {
      this.prev()
    }
  }

  cmdSrNext(_originalCommand: any) {
    return async (
      _command: RawCommand | null,
      _client: TwitchChatClient | null,
      _target: string | null,
      _context: TwitchChatContext | null,
      _msg: string | null,
    ) => {
      this.next()
    }
  }

  cmdSrJumpToNew(_originalCommand: any) {
    return async (
      _command: RawCommand | null,
      _client: TwitchChatClient | null,
      _target: string | null,
      _context: TwitchChatContext | null,
      _msg: string | null,
    ) => {
      this.jumptonew()
    }
  }

  cmdSrClear(_originalCommand: any) {
    return async (
      _command: RawCommand | null,
      _client: TwitchChatClient | null,
      _target: string | null,
      _context: TwitchChatContext | null,
      _msg: string | null,
    ) => {
      this.clear()
    }
  }

  cmdSrRm(_originalCommand: any) {
    return async (
      _command: RawCommand | null,
      client: TwitchChatClient | null,
      target: string | null,
      _context: TwitchChatContext | null,
      _msg: string | null,
    ) => {
      if (!client || !target) {
        return
      }
      const removedItem = this.remove()
      if (removedItem) {
        const say = fn.sayFn(client, target)
        say(`Removed "${removedItem.title}" from the playlist.`)
      }
    }
  }

  cmdSrShuffle(_originalCommand: any) {
    return async (
      _command: RawCommand | null,
      _client: TwitchChatClient | null,
      _target: string | null,
      _context: TwitchChatContext | null,
      _msg: string | null,
    ) => {
      this.shuffle()
    }
  }

  cmdSrResetStats(_originalCommand: any) {
    return async (
      _command: RawCommand | null,
      _client: TwitchChatClient | null,
      _target: string | null,
      _context: TwitchChatContext | null,
      _msg: string | null,
    ) => {
      this.resetStats()
    }
  }

  cmdSrLoop(_originalCommand: any) {
    return async (
      _command: RawCommand | null,
      client: TwitchChatClient | null,
      target: string | null,
      _context: TwitchChatContext | null,
      _msg: string | null,
    ) => {
      if (!client) {
        return
      }
      const say = fn.sayFn(client, target)
      this.loop()
      say('Now looping the current song')
    }
  }

  cmdSrNoloop(_originalCommand: any) {
    return async (
      _command: RawCommand | null,
      client: TwitchChatClient | null,
      target: string | null,
      _context: TwitchChatContext | null,
      _msg: string | null,
    ) => {
      if (!client) {
        return
      }
      const say = fn.sayFn(client, target)
      this.noloop()
      say('Stopped looping the current song')
    }
  }

  cmdSrAddTag(originalCmd: any) {
    return async (
      command: RawCommand | null,
      client: TwitchChatClient | null,
      target: string | null,
      context: TwitchChatContext | null,
      _msg: string | null,
    ) => {
      if (!client || !command) {
        return
      }
      let tag = originalCmd.data?.tag || '$args'
      tag = await fn.doReplacements(tag, command, context, originalCmd, this.bot, this.user)
      if (tag === "") {
        return
      }

      const say = fn.sayFn(client, target)
      this.addTag(tag)
      say(`Added tag "${tag}"`)
    }
  }

  cmdSrRmTag(_originalCommand: any) {
    return async (
      command: RawCommand | null,
      client: TwitchChatClient | null,
      target: string | null,
      _context: TwitchChatContext | null,
      _msg: string | null,
    ) => {
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
  }

  cmdSrPause(_originalCommand: any) {
    return async (
      _command: RawCommand | null,
      _client: TwitchChatClient | null,
      _target: string | null,
      _context: TwitchChatContext | null,
      _msg: string | null,
    ) => {
      this.pause()
    }
  }

  cmdSrUnpause(_originalCommand: any) {
    return async (
      _command: RawCommand | null,
      _client: TwitchChatClient | null,
      _target: string | null,
      _context: TwitchChatContext | null,
      _msg: string | null,
    ) => {
      this.unpause()
    }
  }

  cmdSrVolume(_originalCommand: any) {
    return async (
      command: RawCommand | null,
      client: TwitchChatClient | null,
      target: string | null,
      _context: TwitchChatContext | null,
      _msg: string | null,
    ) => {
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
  }

  cmdSrHidevideo(_originalCommand: any) {
    return async (
      _command: RawCommand | null,
      client: TwitchChatClient | null,
      target: string | null,
      _context: TwitchChatContext | null,
      _msg: string | null,
    ) => {
      if (!client) {
        return
      }
      const say = fn.sayFn(client, target)
      this.videoVisibility(false)
      say(`Video is now hidden.`)
    }
  }

  cmdSrShowvideo(_originalCommand: any) {
    return async (
      _command: RawCommand | null,
      client: TwitchChatClient | null,
      target: string | null,
      _context: TwitchChatContext | null,
      _msg: string | null,
    ) => {
      if (!client) {
        return
      }
      const say = fn.sayFn(client, target)
      this.videoVisibility(true)
      say(`Video is now shown.`)
    }
  }

  cmdSrFilter(_originalCommand: any) {
    return async (
      command: RawCommand | null,
      client: TwitchChatClient | null,
      target: string | null,
      context: TwitchChatContext | null,
      _msg: string | null,
    ) => {
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
  }

  cmdSrQueue(_originalCommand: any) {
    return async (
      _command: RawCommand | null,
      client: TwitchChatClient | null,
      target: string | null,
      _context: TwitchChatContext | null,
      _msg: string | null,
    ) => {
      if (!client) {
        return
      }

      const say = fn.sayFn(client, target)

      const titles = this.data.playlist.slice(1, 4).map(item => item.title)
      if (titles.length === 1) {
        say(`${titles.length} song queued ("${titles.join('" → "')}").`)
      } else if (titles.length > 1) {
        say(`${titles.length} songs queued ("${titles.join('" → "')}").`)
      } else {
        say('No songs queued.')
      }
    }
  }

  cmdSrPreset(_originalCommand: any) {
    return async (
      command: RawCommand | null,
      client: TwitchChatClient | null,
      target: string | null,
      context: TwitchChatContext | null,
      _msg: string | null,
    ) => {
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
  }

  cmdSr(_originalCommand: any) {
    return async (
      command: RawCommand | null,
      client: TwitchChatClient | null,
      target: string | null,
      context: TwitchChatContext | null,
      _msg: string | null,
    ) => {
      if (!client || !command || !context) {
        return
      }

      const say = fn.sayFn(client, target)

      if (command.args.length === 0) {
        say(`Usage: !sr YOUTUBE-URL`)
        return
      }

      const str = command.args.join(' ')

      let maxLenMs: number
      let maxQueued: number
      if (isBroadcaster(context)) {
        maxLenMs = 0
        maxQueued = 0
      } else if (isMod(context)) {
        maxLenMs = parseHumanDuration(this.data.settings.maxSongLength.mod)
        maxQueued = this.data.settings.maxSongsQueued.mod
      } else if (isSubscriber(context)) {
        maxLenMs = parseHumanDuration(this.data.settings.maxSongLength.sub)
        maxQueued = this.data.settings.maxSongsQueued.sub
      } else {
        maxLenMs = parseHumanDuration(this.data.settings.maxSongLength.viewer)
        maxQueued = this.data.settings.maxSongsQueued.viewer
      }

      const addResponseData = await this.add(str, context['display-name'], maxLenMs, maxQueued)
      say(await this.answerAddRequest(addResponseData))
    }
  }

  async loadYoutubeData(youtubeId: string): Promise<YoutubeVideosResponseDataEntry> {
    const key = `youtubeData_${youtubeId}_20210717_2`
    let d = this.bot.getCache().get(key)
    if (!d) {
      d = await Youtube.fetchDataByYoutubeId(youtubeId)
      this.bot.getCache().set(key, d)
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

  async addToPlaylist(tmpItem: PlaylistItem): Promise<AddResponseData> {
    const idx = this.findSongIdxByYoutubeId(tmpItem.yt)
    let insertIndex = this.findInsertIndex()

    if (idx < 0) {
      this.data.playlist.splice(insertIndex, 0, tmpItem)
      this.save()
      this.updateClients('add')
      return {
        addType: ADD_TYPE.ADDED,
        idx: insertIndex,
        reason: -1,
      }
    }

    if (insertIndex > idx) {
      insertIndex = insertIndex - 1
    }

    if (insertIndex === idx) {
      return {
        addType: ADD_TYPE.EXISTED,
        idx: insertIndex,
        reason: -1,
      }
    }

    this.data.playlist = arrayMove(this.data.playlist, idx, insertIndex)
    this.save()
    this.updateClients('add')
    return {
      addType: ADD_TYPE.REQUEUED,
      idx: insertIndex,
      reason: -1,
    }
  }

  async resr(str: string): Promise<AddResponseData> {
    const idx = findIdxFuzzy(this.data.playlist, str, (item) => item.title)
    if (idx < 0) {
      return {
        addType: ADD_TYPE.NOT_ADDED,
        idx: -1,
        reason: NOT_ADDED_REASON.NOT_FOUND_IN_PLAYLIST,
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
        reason: -1,
      }
    }

    this.data.playlist = arrayMove(this.data.playlist, idx, insertIndex)
    this.save()
    this.updateClients('add')
    return {
      addType: ADD_TYPE.REQUEUED,
      idx: insertIndex,
      reason: -1,
    }
  }

  getCommands() {
    return this.commands
  }

  async onChatMsg(_chatMessageContext: ChatMessageContext) {
    // pass
  }

  async onRewardRedemption(_RewardRedemptionContext: RewardRedemptionContext) {
    // pass
  }
}

export default SongrequestModule
