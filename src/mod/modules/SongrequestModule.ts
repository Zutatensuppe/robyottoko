import fn, { determineNewVolume, findIdxFuzzy, getChannelPointsCustomRewards } from '../../fn'
import { shuffle, arrayMove, logger, humanDuration, parseHumanDuration, nonce } from '../../common/fn'
import { Socket } from '../../net/WebSocketServer'
import Youtube, { YoutubeVideosResponseDataEntry } from '../../services/Youtube'
import { User } from '../../repo/Users'
import {
  ChatMessageContext, PlaylistItem,
  FunctionCommand, Command,
  Bot, CommandFunction, Module, CommandExecutionContext,
  MODULE_NAME, WIDGET_TYPE, TwitchChatContext
} from '../../types'
import {
  default_commands,
  default_settings,
  SongerquestModuleInitData,
  SongrequestModuleData,
  SongrequestModuleLimits,
  SongrequestModuleSettings,
  SongrequestModuleWsEventData,
  SortBy,
  SortDirection,
} from './SongrequestModuleCommon'
import { NextFunction, Response } from 'express'
import { isBroadcaster, isMod, isSubscriber } from '../../common/permissions'
import { newJsonDate } from '../../common/commands'

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
    durationMs: item?.durationMs || 0,
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

const noLimits = (): SongrequestModuleLimits => ({ maxLenMs: 0, maxQueued: 0 })
const determineLimits = (
  ctx: TwitchChatContext,
  settings: SongrequestModuleSettings,
): SongrequestModuleLimits => {
  if (isBroadcaster(ctx)) {
    return noLimits()
  }

  // use the longest set up maxLenMs and maxQueued that fits for the user
  // a user can be both moderator and subscriber, in that case the longest setting will be used
  // also, 0 is handled as 'unlimited', so have to check that too..
  const check: ('mod' | 'sub' | 'viewer')[] = []
  if (isMod(ctx)) {
    check.push('mod')
  }
  if (isSubscriber(ctx)) {
    check.push('sub')
  }
  if (check.length === 0) {
    check.push('viewer')
  }

  let maxLenMs: number = -1
  let maxQueued: number = -1
  for (const prop of check) {
    const lenMs = parseHumanDuration(settings.maxSongLength[prop])
    maxLenMs = (lenMs === 0 || maxLenMs === -1) ? lenMs : Math.max(maxLenMs, lenMs)

    const queued = settings.maxSongsQueued[prop]
    maxQueued = (queued === 0 || maxQueued === -1) ? queued : Math.max(maxQueued, queued)
  }

  // make sure that the limits are >= 0
  maxLenMs = Math.max(maxLenMs, 0)
  maxQueued = Math.max(maxQueued, 0)

  return { maxLenMs, maxQueued }
}

export const findInsertIndex = (playlist: PlaylistItem[]): number => {
  if (playlist.length === 0) {
    return 0
  }

  let found = -1
  for (let i = 0; i < playlist.length; i++) {
    if (playlist[i].plays === 0) {
      found = i
    } else if (found >= 0) {
      break
    }
  }
  return (found === -1 ? 0 : found) + 1
}


class SongrequestModule implements Module {
  public name = MODULE_NAME.SR

  // @ts-ignore
  private data: SongrequestModuleData
  // @ts-ignore
  private commands: FunctionCommand[]

  private channelPointsCustomRewards: Record<string, string[]> = {}

  constructor(
    public readonly bot: Bot,
    public user: User,
  ) {
    // @ts-ignore
    return (async () => {
      const initData = await this.reinit()
      this.data = {
        filter: initData.data.filter,
        playlist: initData.data.playlist,
        commands: initData.data.commands,
        settings: initData.data.settings,
        stacks: initData.data.stacks,
      }
      this.commands = initData.commands
      if (initData.shouldSave) {
        await this.bot.getRepos().module.save(this.user.id, this.name, this.data)
      }
      return this;
    })();
  }

  async userChanged(user: User) {
    this.user = user
  }

  async reinit(): Promise<SongerquestModuleInitData> {
    let shouldSave = false
    const data = await this.bot.getRepos().module.load(this.user.id, this.name, {
      filter: {
        tag: '',
      },
      settings: default_settings(),
      playlist: default_playlist(),
      commands: default_commands(),
      stacks: {},
    })

    if (typeof data.settings.customCssPresetIdx === 'undefined') {
      // find the index of a preset that matches the current settings
      // if nothing is found, create a new preset and use that index
      const matchingIndex = data.settings.customCssPresets.findIndex((preset: any) => {
        preset.css === data.settings.customCss &&
        preset.showProgressBar === data.settings.showProgressBar &&
        preset.showThumbnails === data.settings.showThumbnails &&
        preset.timestampFormat === data.settings.timestampFormat &&
        preset.maxItemsShown === data.settings.maxItemsShown
      })
      if (matchingIndex !== -1) {
        data.settings.customCssPresetIdx = matchingIndex
      } else {
        data.settings.customCssPresets.push({
          name: 'current',
          css: data.settings.customCss,
          showProgressBar: data.settings.showProgressBar,
          showThumbnails: data.settings.showThumbnails,
          timestampFormat: data.settings.timestampFormat,
          maxItemsShown: data.settings.maxItemsShown,
        })
        data.settings.customCssPresetIdx = data.settings.customCssPresets.length - 1
      }
    }

    // make sure items have correct structure
    // needed by rest of the code
    // TODO: maybe use same code as in save function
    data.playlist = default_playlist(data.playlist)
    data.settings = default_settings(data.settings)
    data.commands = default_commands(data.commands)

    // add duration to the playlist items
    for (const item of data.playlist) {
      if (!item.durationMs) {
        const d = await this.loadYoutubeData(item.yt)
        // sometimes songs in the playlist may not be available on yt anymore
        // then we just dont add that to the duration calculation
        if (d) {
          item.durationMs = fn.parseISO8601Duration(d.contentDetails.duration)
          shouldSave = true
        }
      }
    }

    // add ids to commands that dont have one yet
    for (const cmd of data.commands) {
      if (!cmd.id) {
        cmd.id = nonce(10)
        shouldSave = true
      }
      if (!cmd.createdAt) {
        cmd.createdAt = newJsonDate()
        shouldSave = true
      }
      if (!cmd.effects) {
        cmd.effects = []
        shouldSave = true
      }

      if (typeof cmd.cooldown !== 'object') {
        cmd.cooldown = cmd.timeout || { global: '0', perUser: '0' }
        shouldSave = true
      }
      if (cmd.timeout) {
        delete cmd.timeout
        shouldSave = true
      }
      if (typeof cmd.disallow_users === 'undefined') {
        cmd.disallow_users = []
        shouldSave = true
      }
      if (typeof cmd.allow_users === 'undefined') {
        cmd.allow_users = []
        shouldSave = true
      }
      if (typeof cmd.enabled === 'undefined') {
        cmd.enabled = true
        shouldSave = true
      }

      if (typeof cmd.restrict === 'undefined') {
        if (cmd.restrict_to.length === 0) {
          cmd.restrict = { active: false, to: [] }
        } else {
          cmd.restrict = { active: true, to: cmd.restrict_to }
        }
        shouldSave = true
      }
    }

    return {
      data: {
        playlist: data.playlist,
        settings: data.settings,
        commands: data.commands,
        filter: data.filter,
        stacks: data.stacks,
      },
      commands: this.initCommands(data.commands),
      shouldSave,
    }
  }

  initCommands(rawCommands: Command[]): FunctionCommand[] {
    const map: Record<string, ((originalCmd: Command) => CommandFunction)> = {
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
    // TODO: save, because variable changes could have happened
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

  async save(): Promise<void> {
    await this.bot.getRepos().module.save(this.user.id, this.name, {
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

  async wsdata(eventName: string): Promise<WsData> {
    return {
      event: eventName,
      data: {
        // ommitting youtube cache data and stacks
        filter: this.data.filter,
        playlist: this.data.playlist,
        settings: this.data.settings,
        commands: this.data.commands,
        globalVariables: await this.bot.getRepos().variables.all(this.user.id),
        channelPointsCustomRewards: this.channelPointsCustomRewards,
        widgetUrl: await this.bot.getWidgets().getWidgetUrl(WIDGET_TYPE.SR, this.user.id),
      }
    };
  }

  async updateClient(eventName: string, ws: Socket): Promise<void> {
    this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, await this.wsdata(eventName), ws)
  }

  async updateClients(eventName: string): Promise<void> {
    this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, await this.wsdata(eventName))
  }

  getWsEvents() {
    return {
      'conn': async (ws: Socket) => {
        this.channelPointsCustomRewards = await getChannelPointsCustomRewards(this.bot, this.user)
        await this.updateClient('init', ws)
      },
      'play': async (_ws: Socket, { id }: { id: number }) => {
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

        await this.save()
        await this.updateClients('playIdx')
      },
      'ended': async (_ws: Socket) => {
        const item = this.data.playlist.shift()
        if (item) {
          this.data.playlist.push(item)
        }
        await this.save()
        await this.updateClients('onEnded')
      },
      'save': async (_ws: Socket, data: { commands: Command[], settings: SongrequestModuleSettings }) => {
        this.data.commands = data.commands
        this.data.settings = data.settings
        await this.save()
        const initData = await this.reinit()
        this.data = initData.data
        this.commands = initData.commands
        await this.updateClients('save')
      },
      'ctrl': async (_ws: Socket, { ctrl, args }: { ctrl: string, args: any[] }) => {
        switch (ctrl) {
          case 'volume': this.volume(...args as [number]); break;
          case 'pause': this.pause(); break;
          case 'unpause': this.unpause(); break;
          case 'loop': this.loop(); break;
          case 'noloop': this.noloop(); break;
          case 'good': this.like(); break;
          case 'bad': this.dislike(); break;
          case 'prev': await this.prev(); break;
          case 'skip': await this.next(); break;
          case 'resetStats': await this.resetStats(); break;
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
          case 'videoVisibility': await this.videoVisibility(...args as [boolean, number]); break;
          case 'setAllToPlayed': this.setAllToPlayed(); break;
          case 'sort': this.sort(...args as [SortBy, SortDirection]); break;
        }
      },
    }
  }

  async add(str: string, userName: string, limits: SongrequestModuleLimits): Promise<AddResponseData> {
    const countQueuedSongsByUser = () => this.data.playlist.filter(item => item.user === userName && item.plays === 0).length
    const isTooLong = (ytData: YoutubeVideosResponseDataEntry) => {
      if (limits.maxLenMs > 0) {
        const songLenMs = fn.parseISO8601Duration(ytData.contentDetails.duration)
        if (limits.maxLenMs < songLenMs) {
          return true
        }
      }
      return false
    }

    if (limits.maxQueued > 0 && countQueuedSongsByUser() >= limits.maxQueued) {
      return { addType: ADD_TYPE.NOT_ADDED, idx: -1, reason: NOT_ADDED_REASON.TOO_MANY_QUEUED }
    }

    const youtubeUrl = str.trim()

    let youtubeId = null
    let youtubeData = null

    const tmpYoutubeId = Youtube.extractYoutubeId(youtubeUrl)
    if (tmpYoutubeId) {
      const tmpYoutubeData = await this.loadYoutubeData(tmpYoutubeId)
      if (tmpYoutubeData) {
        if (isTooLong(tmpYoutubeData)) {
          return { addType: ADD_TYPE.NOT_ADDED, idx: -1, reason: NOT_ADDED_REASON.TOO_LONG }
        }
        youtubeId = tmpYoutubeId
        youtubeData = tmpYoutubeData
      }
    }

    if (!youtubeData) {
      const reasons = []
      for (const duration of Youtube.msToVideoDurations(limits.maxLenMs)) {
        const youtubeIds = await Youtube.getYoutubeIdsBySearch(youtubeUrl, duration)
        if (!youtubeIds) {
          continue
        }
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
        if (youtubeId && youtubeData) {
          break
        }
      }
      if (!youtubeId || !youtubeData) {
        if (reasons.includes(NOT_ADDED_REASON.TOO_LONG)) {
          return { addType: ADD_TYPE.NOT_ADDED, idx: -1, reason: NOT_ADDED_REASON.TOO_LONG }
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

  async videoVisibility(visible: boolean, idx = -1) {
    if (idx === -1) {
      idx = this.determineFirstIndex()
    }
    if (idx === -1) {
      return
    }
    if (this.data.playlist.length > idx) {
      this.data.playlist[idx].hidevideo = visible ? false : true
    }
    await this.save()
    await this.updateClients('video')
  }

  async durationUntilIndex(idx: number) {
    if (idx <= 0) {
      return 0
    }

    let durationTotalMs = 0
    for (const item of this.data.playlist.slice(0, idx)) {
      durationTotalMs += item.durationMs
    }
    return durationTotalMs
  }

  async stats(userName: string) {
    const countTotal = this.data.playlist.length
    let durationTotal = 0
    if (countTotal > 0) {
      for (const item of this.data.playlist) {
        durationTotal += item.durationMs
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

  async resetStats() {
    this.data.playlist = this.data.playlist.map(item => {
      item.plays = 0
      item.goods = 0
      item.bads = 0
      return item
    })
    await this.save()
    await this.updateClients('stats')
  }

  async playIdx(idx: number) {
    if (this.data.playlist.length === 0) {
      return
    }
    while (idx-- > 0) {
      const item = this.data.playlist.shift()
      if (item) {
        this.data.playlist.push(item)
      }
    }

    await this.save()
    await this.updateClients('skip')
  }

  async rmIdx(idx: number) {
    if (this.data.playlist.length === 0) {
      return
    }
    this.data.playlist.splice(idx, 1)
    await this.save()
    if (idx === 0) {
      await this.updateClients('remove')
    } else {
      await this.updateClients('init')
    }
  }

  async resetStatIdx(stat: string, idx: number) {
    if (idx >= 0 && idx < this.data.playlist.length) {
      if (stat === 'plays') {
        this.data.playlist[idx].plays = 0
      } else if (stat === 'goods') {
        this.data.playlist[idx].goods = 0
      } else if (stat === 'bads') {
        this.data.playlist[idx].bads = 0
      }
    }
    await this.save()
    await this.updateClients('stats')
  }

  async goodIdx(idx: number) {
    this.incStat('goods', idx)
    await this.save()
    await this.updateClients('stats')
  }

  async badIdx(idx: number) {
    this.incStat('bads', idx)
    await this.save()
    await this.updateClients('stats')
  }

  async request(str: string) {
    // this comes from backend, always unlimited length
    await this.add(str, this.user.name, noLimits())
  }

  findSongIdxByYoutubeId(youtubeId: string) {
    return this.data.playlist.findIndex(item => item.yt === youtubeId)
  }

  async like() {
    this.incStat('goods')
    await this.save()
    await this.updateClients('stats')
  }

  async filter(filter: { tag: string }) {
    this.data.filter = filter
    await this.save()
    await this.updateClients('filter')
  }

  async sort(by: SortBy, direction: SortDirection) {
    this.data.playlist = this.data.playlist.sort((a, b) => {
      if (by === SortBy.TIMESTAMP && a.timestamp !== b.timestamp) {
        return direction * (a.timestamp > b.timestamp ? 1 : -1)
      }
      if (by === SortBy.TITLE && a.title !== b.title) {
        return direction * a.title.localeCompare(b.title)
      }
      if (by === SortBy.PLAYS && a.plays !== b.plays) {
        return direction * (a.plays > b.plays ? 1 : -1)
      }
      if (by === SortBy.USER && a.user !== b.user) {
        return direction * a.user.localeCompare(b.user)
      }
      if (by === SortBy.DURATION && a.durationMs !== b.durationMs) {
        return direction * (a.durationMs > b.durationMs ? 1 : -1)
      }
      return 0
    })
    await this.save()
    await this.updateClients('init')
  }

  async addTag(tag: string, idx = -1) {
    if (idx === -1) {
      idx = this.determineFirstIndex()
    }
    if (idx === -1) {
      return
    }
    if (this.data.playlist.length > idx) {
      if (!this.data.playlist[idx].tags.includes(tag)) {
        this.data.playlist[idx].tags.push(tag)
        await this.save()
        await this.updateClients('tags')
      }
    }
  }

  async updateTag(oldTag: string, newTag: string) {
    this.data.playlist = this.data.playlist.map(item => {
      item.tags = [...new Set(item.tags.map(tag => {
        return tag === oldTag ? newTag : tag
      }))]
      return item
    })
    await this.save()
    await this.updateClients('tags')
  }

  async rmTag(tag: string, idx = -1) {
    if (idx === -1) {
      idx = this.determineFirstIndex()
    }
    if (idx === -1) {
      return
    }
    if (this.data.playlist.length > idx) {
      if (this.data.playlist[idx].tags.includes(tag)) {
        this.data.playlist[idx].tags = this.data.playlist[idx].tags.filter(t => t !== tag)
        await this.save()
        await this.updateClients('tags')
      }
    }
  }

  async volume(vol: number) {
    if (vol < 0) {
      vol = 0
    }
    if (vol > 100) {
      vol = 100
    }
    this.data.settings.volume = parseInt(`${vol}`, 10)
    await this.save()
    await this.updateClients('settings')
  }

  async pause() {
    await this.updateClients('pause')
  }

  async unpause() {
    await this.updateClients('unpause')
  }

  async loop() {
    await this.updateClients('loop')
  }

  async noloop() {
    await this.updateClients('noloop')
  }

  async dislike() {
    this.incStat('bads')
    await this.save()
    await this.updateClients('stats')
  }

  async settings(settings: SongrequestModuleSettings) {
    this.data.settings = settings
    await this.save()
    await this.updateClients('settings')
  }

  async prev() {
    const index = this.determinePrevIndex()
    if (index >= 0) {
      await this.playIdx(index)
    }
  }

  async next() {
    const index = this.determineNextIndex()
    if (index >= 0) {
      await this.playIdx(index)
    }
  }

  async jumptonew() {
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

    await this.save()
    await this.updateClients('skip')
  }

  async clear() {
    this.data.playlist = []
    await this.save()
    await this.updateClients('init')
  }

  async setAllToPlayed() {
    this.data.playlist = this.data.playlist.map(item => {
      item.plays = item.plays || 1
      return item
    })
    await this.save()
    await this.updateClients('init')
  }

  async shuffle() {
    if (this.data.playlist.length < 3) {
      return
    }

    const rest = this.data.playlist.slice(1)
    this.data.playlist = [
      this.data.playlist[0],
      ...shuffle(rest.filter(item => item.plays === 0)),
      ...shuffle(rest.filter(item => item.plays > 0)),
    ]

    await this.save()
    await this.updateClients('shuffle')
  }

  async move(oldIndex: number, newIndex: number) {
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

    await this.save()
    await this.updateClients('move')
  }

  async remove(): Promise<PlaylistItem | null> {
    if (this.data.playlist.length === 0) {
      return null
    }
    const removedItem = this.data.playlist.shift()
    await this.save()
    await this.updateClients('remove')
    return removedItem || null
  }

  async undo(username: string) {
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
    await this.rmIdx(idx)
    return item
  }

  async answerAddRequest(
    addResponseData: AddResponseData,
    limits: SongrequestModuleLimits,
  ): Promise<string> {
    const idx = addResponseData.idx
    const reason = addResponseData.reason
    const addType = addResponseData.addType

    if (addType === ADD_TYPE.NOT_ADDED) {
      if (reason === NOT_ADDED_REASON.NOT_FOUND) {
        return `No song found`
      } else if (reason === NOT_ADDED_REASON.NOT_FOUND_IN_PLAYLIST) {
        return `Song not found in playlist`
      } else if (reason === NOT_ADDED_REASON.TOO_LONG) {
        return `Song too long (max. ${humanDuration(limits.maxLenMs)})`
      } else if (reason === NOT_ADDED_REASON.TOO_MANY_QUEUED) {
        return `Too many songs queued (max. ${limits.maxQueued})`
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

  cmdSrCurrent(_originalCommand: Command) {
    return async (ctx: CommandExecutionContext) => {
      if (!ctx.rawCmd || !ctx.context) {
        return
      }
      const say = this.bot.sayFn(this.user, ctx.target)
      if (this.data.playlist.length === 0) {
        say(`Playlist is empty`)
        return
      }
      const cur = this.data.playlist[0]
      // todo: error handling, title output etc..
      say(`Currently playing: ${cur.title} (${Youtube.getUrlById(cur.yt)}, ${cur.plays}x plays, requested by ${cur.user})`)
    }
  }

  cmdSrUndo(_originalCommand: Command) {
    return async (ctx: CommandExecutionContext) => {
      if (!ctx.rawCmd || !ctx.context || !ctx.context['display-name']) {
        return
      }
      const say = this.bot.sayFn(this.user, ctx.target)
      const undid = await this.undo(ctx.context['display-name'])
      if (!undid) {
        say(`Could not undo anything`)
      } else {
        say(`Removed "${undid.title}" from the playlist!`)
      }
    }
  }

  cmdResr(_originalCommand: Command) {
    return async (ctx: CommandExecutionContext) => {
      if (!ctx.rawCmd || !ctx.context) {
        log.error('cmdResr: client, command or context empty')
        return
      }

      const say = this.bot.sayFn(this.user, ctx.target)

      if (ctx.rawCmd.args.length === 0) {
        say(`Usage: !resr SEARCH`)
        return
      }

      const searchterm = ctx.rawCmd.args.join(' ')
      const addResponseData = await this.resr(searchterm)
      say(await this.answerAddRequest(addResponseData, noLimits()))
    }
  }

  cmdSrGood(_originalCommand: Command) {
    return async (_ctx: CommandExecutionContext) => {
      await this.like()
    }
  }

  cmdSrBad(_originalCommand: Command) {
    return async (_ctx: CommandExecutionContext) => {
      await this.dislike()
    }
  }

  cmdSrStats(_originalCommand: Command) {
    return async (ctx: CommandExecutionContext) => {
      if (!ctx.rawCmd || !ctx.context || !ctx.context['display-name']) {
        return
      }

      const say = this.bot.sayFn(this.user, ctx.target)

      const stats = await this.stats(ctx.context['display-name'])
      let number = `${stats.count.byUser}`
      const verb = stats.count.byUser === 1 ? 'was' : 'were'
      if (stats.count.byUser === 1) {
        number = 'one'
      } else if (stats.count.byUser === 0) {
        number = 'none'
      }
      const countStr = `There are ${stats.count.total} songs in the playlist, `
        + `${number} of which ${verb} requested by ${ctx.context['display-name']}.`
      const durationStr = `The total duration of the playlist is ${stats.duration.human}.`
      say([countStr, durationStr].join(' '))
    }
  }

  cmdSrPrev(_originalCommand: Command) {
    return async (_ctx: CommandExecutionContext) => {
      await this.prev()
    }
  }

  cmdSrNext(_originalCommand: Command) {
    return async (_ctx: CommandExecutionContext) => {
      await this.next()
    }
  }

  cmdSrJumpToNew(_originalCommand: Command) {
    return async (_ctx: CommandExecutionContext) => {
      await this.jumptonew()
    }
  }

  cmdSrClear(_originalCommand: Command) {
    return async (_ctx: CommandExecutionContext) => {
      await this.clear()
    }
  }

  cmdSrRm(_originalCommand: Command) {
    return async (ctx: CommandExecutionContext) => {
      if (!ctx.target) {
        return
      }
      const removedItem = await this.remove()
      if (removedItem) {
        const say = this.bot.sayFn(this.user, ctx.target)
        say(`Removed "${removedItem.title}" from the playlist.`)
      }
    }
  }

  cmdSrShuffle(_originalCommand: Command) {
    return async (_ctx: CommandExecutionContext) => {
      await this.shuffle()
    }
  }

  cmdSrResetStats(_originalCommand: Command) {
    return async (_ctx: CommandExecutionContext) => {
      await this.resetStats()
    }
  }

  cmdSrLoop(_originalCommand: Command) {
    return async (ctx: CommandExecutionContext) => {
      const say = this.bot.sayFn(this.user, ctx.target)
      await this.loop()
      say('Now looping the current song')
    }
  }

  cmdSrNoloop(_originalCommand: Command) {
    return async (ctx: CommandExecutionContext) => {
      const say = this.bot.sayFn(this.user, ctx.target)
      await this.noloop()
      say('Stopped looping the current song')
    }
  }

  cmdSrAddTag(originalCmd: any) {
    return async (ctx: CommandExecutionContext) => {
      if (!ctx.rawCmd) {
        return
      }
      let tag = originalCmd.data?.tag || '$args'
      tag = await fn.doReplacements(tag, ctx.rawCmd, ctx.context, originalCmd, this.bot, this.user)
      if (tag === "") {
        return
      }

      const say = this.bot.sayFn(this.user, ctx.target)
      await this.addTag(tag)
      say(`Added tag "${tag}"`)
    }
  }

  cmdSrRmTag(_originalCommand: Command) {
    return async (ctx: CommandExecutionContext) => {
      if (!ctx.rawCmd) {
        return
      }
      if (!ctx.rawCmd.args.length) {
        return
      }
      const say = this.bot.sayFn(this.user, ctx.target)
      const tag = ctx.rawCmd.args.join(' ')
      await this.rmTag(tag)
      say(`Removed tag "${tag}"`)
    }
  }

  cmdSrPause(_originalCommand: Command) {
    return async (_ctx: CommandExecutionContext) => {
      await this.pause()
    }
  }

  cmdSrUnpause(_originalCommand: Command) {
    return async (_ctx: CommandExecutionContext) => {
      await this.unpause()
    }
  }

  cmdSrVolume(_originalCommand: Command) {
    return async (ctx: CommandExecutionContext) => {
      if (!ctx.rawCmd) {
        return
      }

      const say = this.bot.sayFn(this.user, ctx.target)
      if (ctx.rawCmd.args.length === 0) {
        say(`Current volume: ${this.data.settings.volume}`)
      } else {
        const newVolume = determineNewVolume(
          ctx.rawCmd.args[0],
          this.data.settings.volume,
        )
        await this.volume(newVolume)
        say(`New volume: ${this.data.settings.volume}`)
      }
    }
  }

  cmdSrHidevideo(_originalCommand: Command) {
    return async (ctx: CommandExecutionContext) => {
      const say = this.bot.sayFn(this.user, ctx.target)
      await this.videoVisibility(false)
      say(`Video is now hidden.`)
    }
  }

  cmdSrShowvideo(_originalCommand: Command) {
    return async (ctx: CommandExecutionContext) => {
      const say = this.bot.sayFn(this.user, ctx.target)
      await this.videoVisibility(true)
      say(`Video is now shown.`)
    }
  }

  cmdSrFilter(_originalCommand: Command) {
    return async (ctx: CommandExecutionContext) => {
      if (!ctx.rawCmd || !ctx.context) {
        return
      }

      const say = this.bot.sayFn(this.user, ctx.target)
      const tag = ctx.rawCmd.args.join(' ')
      await this.filter({ tag })
      if (tag !== '') {
        say(`Playing only songs tagged with "${tag}"`)
      } else {
        say(`Playing all songs`)
      }
    }
  }

  cmdSrQueue(_originalCommand: Command) {
    return async (ctx: CommandExecutionContext) => {
      const say = this.bot.sayFn(this.user, ctx.target)
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

  cmdSrPreset(_originalCommand: Command) {
    return async (ctx: CommandExecutionContext) => {
      if (!ctx.rawCmd || !ctx.context) {
        return
      }

      const say = this.bot.sayFn(this.user, ctx.target)
      const presetName = ctx.rawCmd.args.join(' ')
      if (presetName === '') {
        if (this.data.settings.customCssPresets.length) {
          say(`Presets: ${this.data.settings.customCssPresets.map(preset => preset.name).join(', ')}`)
        } else {
          say(`No presets configured`)
        }
      } else {
        const index = this.data.settings.customCssPresets.findIndex(preset => preset.name === presetName)
        if (index !== -1) {
          this.data.settings.customCssPresetIdx = index
          say(`Switched to preset: ${presetName}`)
        } else {
          say(`Preset does not exist: ${presetName}`)
        }
        // TODO: is a save missing here?
        await this.updateClients('settings')
      }
    }
  }

  cmdSr(_originalCommand: Command) {
    return async (ctx: CommandExecutionContext) => {
      if (!ctx.rawCmd || !ctx.context || !ctx.context['display-name']) {
        return
      }

      const say = this.bot.sayFn(this.user, ctx.target)

      if (ctx.rawCmd.args.length === 0) {
        say(`Usage: !sr YOUTUBE-URL`)
        return
      }

      const str = ctx.rawCmd.args.join(' ')

      const limits = determineLimits(ctx.context, this.data.settings)
      const addResponseData = await this.add(str, ctx.context['display-name'], limits)
      say(await this.answerAddRequest(addResponseData, limits))
    }
  }

  async loadYoutubeData(youtubeId: string): Promise<YoutubeVideosResponseDataEntry | null> {
    const key = `youtubeData_${youtubeId}_20210717_2`
    let d = await this.bot.getCache().get(key)
    if (d === undefined) {
      d = await Youtube.fetchDataByYoutubeId(youtubeId)
      if (d) {
        await this.bot.getCache().set(key, d, Infinity)
      }
    }
    return d
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
      durationMs: fn.parseISO8601Duration(youtubeData.contentDetails.duration),
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
    let insertIndex = findInsertIndex(this.data.playlist)

    if (idx < 0) {
      this.data.playlist.splice(insertIndex, 0, tmpItem)
      await this.save()
      await this.updateClients('add')
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
    await this.save()
    await this.updateClients('add')
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

    let insertIndex = findInsertIndex(this.data.playlist)

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
    await this.save()
    await this.updateClients('add')
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
}

export default SongrequestModule
