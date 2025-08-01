import type { NextFunction, Response } from 'express'
import type { Emitter, EventType } from 'mitt'
import type { LogLevel } from './common/fn'
import type { CommandRestrict } from './common/permissions'
import type ModuleManager from './mod/ModuleManager'
import type { GeneralModuleEmotesEventData } from './mod/modules/GeneralModuleCommon'
import type Auth from './net/Auth'
import type TwitchClientManager from './services/TwitchClientManager'
import type WebSocketServer from './net/WebSocketServer'
import type { Socket } from './net/WebSocketServer'
import type Cache from './services/Cache'
import type { FrontendStatusUpdater } from './services/FrontendStatusUpdater'
import type { StreamStatusUpdater } from './services/StreamStatusUpdater'
import type { User } from './repo/Users'
import type Widgets from './services/Widgets'
import type WebServer from './net/WebServer'
import type { TwitchTmiClientManager } from './services/TwitchTmiClientManager'
import type { Repos } from './repo/Repos'
import type { Youtube } from './services/Youtube'
import type { Canny } from './services/Canny'
import type Db from './DbPostgres'
import type { Discord } from './services/Discord'
import type { EmoteParser } from './services/EmoteParser'
import type { TimeApi } from './services/TimeApi'
import type { EffectApplier } from './effect/EffectApplier'
import type { TwitchClient, TwitchEventContext } from './services/twitch'
import type TwitchHelixClient from './services/TwitchHelixClient'
import type { CommandAction, CommandEffectType, CommandTriggerType, CountdownActionType, MODULE_NAME, WIDGET_TYPE } from './enums'

type int = number

declare const __brand: unique symbol
type Brand<B> = { [__brand]: B }
type Branded<T, B> = T & Brand<B>

export type JSONDateString = Branded<string, 'JSONDateString'> // e.g. "2023-10-01T12:34:56.789Z"

export type CommandId = Branded<string, 'CommandId'>
export type UserId = Branded<number, 'UserId'>
export type PlaylistItemId = Branded<number, 'PlaylistItemId'>
export type WidgetId = Branded<string, 'WidgetId'>

export interface ApiUser {
  id: UserId
  name: string
  email: string
  groups: string[]
}

export interface BaseUserData {
  user: ApiUser
  token: string
}

export interface FullApiUserData extends BaseUserData {
  cannyToken: string
}

export interface DbConfig {
  connectStr: string
  patchesDir: string
}

export interface YoutubeConfig {
  googleApiKeys: string[]
}

export interface WsConfig {
  hostname: string
  port: int
  connectstring: string
}

export interface HttpConfig {
  hostname: string
  port: int
  url: string
}

export interface CannyConfig {
  sso_private_key: string
}

export interface DiscordConfig {
  bot: {
    url: string
    token: string
  }
  announce: {
    guildId: string
    channelId: string
  }
}

export interface EventSubTransport {
  method: string // webhook
  callback: string
  secret: string
}

export interface TwitchConfig {
  eventSub: {
    transport: EventSubTransport
    enabled: boolean
  }
  tmi: {
    identity: {
      client_id: string
      client_secret: string
      username: string
      password: string
    }
  }
  auto_tags: { id: string, name: string }[]
  manual_tags: { id: string, name: string }[]
}

export interface Config {
  secret: string
  bot: {
    reportStatus: boolean
    supportTwitchAccessTokens: boolean
  }
  log: {
    level: LogLevel
  }
  twitch: TwitchConfig
  http: HttpConfig
  ws: WsConfig
  db: DbConfig
  youtube: YoutubeConfig
  modules: {
    speechToText: {
      google: {
        scriptId: string
      }
    }
  }
  youtubeDlBinary: string
  ffmpegBinary: string
  canny: CannyConfig
  discord: DiscordConfig
}

// @see https://github.com/SortableJS/vue.draggable.next
// @see https://github.com/SortableJS/Sortable#event-object-demo
export interface DragEndEvent {
  item: HTMLElement // dragged HTMLElement
  to: any[] // target list
  from: any[] // previous list
  oldIndex: number // element's old index within old parent
  newIndex: number // element's new index within new parent
  oldDraggableIndex: number // element's old index within old parent, only counting draggable elements
  newDraggableIndex: number // element's new index within new parent, only counting draggable elements
  clone: any // the clone element
  pullMode: any
}

export interface MediaFile {
  file: string
  filename: string
  urlpath: string
}

export interface SoundMediaFile extends MediaFile {
  volume: number
}

export interface UploadedFile {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  destination: string
  filename: string
  filepath: string // on disk
  size: number

  urlpath: string
}

export interface PlaylistItem {
  id: PlaylistItemId
  tags: string[]
  yt: string
  title: string
  timestamp: number
  durationMs: number
  hidevideo?: boolean
  last_play: number
  plays: number
  goods: number
  bads: number
  user: string
}

export interface DrawcastFavoriteList {
  list: string[]
  title: string
}

export interface DrawcastSettings {
  canvasWidth: int
  canvasHeight: int
  submitButtonText: string
  submitConfirm: string
  recentImagesTitle: string
  customDescription: string
  customProfileImage: MediaFile | null
  displayDuration: int
  displayLatestForever: boolean
  displayLatestAutomatically: boolean
  autofillLatest: boolean
  notificationSound: SoundMediaFile | null
  requireManualApproval: boolean
  favoriteLists: DrawcastFavoriteList[]
  moderationAdmins: string[]
}

// DRAW              SERVER                              -> RECEIVE/DRAW
// {image, nonce} -> [].push({ image, approved: false }) -> { image_received, nonce }
//
//                                                          { image, approved: true }

export interface DrawcastData {
  settings: DrawcastSettings
  drawUrl: string
  controlWidgetUrl: string
  receiveWidgetUrl: string
  images: any[]
}

export type CacheValue = any

export type VariableValue = any

export interface GlobalVariable {
  name: string
  value: VariableValue
}

export interface CommandExecutionContext {
  rawCmd: RawCommand | null
  context: TwitchEventContext | null
  date: Date
}

export interface RawCommand {
  name: string
  args: string[]
}

export interface CommandMatch {
  value: string
  match: 'startsWith' | 'exact' | 'anywhere'
}

export interface CommandTrigger {
  type: CommandTriggerType
  data: {
    // for trigger type "command" (todo: should only exist if type is command, not always)
    command: CommandMatch
    // for trigger type "timer" (todo: should only exist if type is timer, not always)
    minInterval: number | string // duration in ms or something parsable (eg 1s, 10m, ....)
    minLines: number

    // for trigger type "first_chat"
    since: 'alltime' | 'stream' | ''
  }
}

export type CommandEffectData =
  AddStreamTagEffectData |
  ChatEffectData |
  ChattersEffectData |
  CountdownEffectData |
  DictLookupEffectData |
  EmotesEffectData |
  MediaEffectData |
  MediaV2EffectData |
  MediaVolumeEffectData |
  RemoveStreamTagEffectData |
  RouletteEffectData |
  SetChannelGameIdEffectData |
  SetChannelTitleEffectData |
  VariableChangeEffectData

export interface VariableChangeEffectData {
  type: CommandEffectType.VARIABLE_CHANGE
  data: CommandVariableChange
}

export interface ChatEffectData {
  type: CommandEffectType.CHAT
  data: {
    text: string[]
  }
}

export interface DictLookupEffectData {
  type: CommandEffectType.DICT_LOOKUP
  data: {
    lang: string
    phrase: string
  }
}

export interface EmotesEffectData {
  type: CommandEffectType.EMOTES
  data: GeneralModuleEmotesEventData
}

export interface MediaEffectData {
  type: CommandEffectType.MEDIA
  data: MediaCommandData
}

export interface MediaV2EffectData {
  type: CommandEffectType.MEDIA_V2
  data: MediaV2CommandData
}

export interface SetChannelTitleEffectData {
  type: CommandEffectType.SET_CHANNEL_TITLE
  data: {
    title: string
  }
}

export interface SetChannelGameIdEffectData {
  type: CommandEffectType.SET_CHANNEL_GAME_ID
  data: {
    game_id: string
  }
}

export interface AddStreamTagEffectData {
  type: CommandEffectType.ADD_STREAM_TAGS
  data: {
    tag: string
  }
}

export interface RemoveStreamTagEffectData {
  type: CommandEffectType.REMOVE_STREAM_TAGS
  data: {
    tag: string
  }
}

export interface ChattersEffectData {
  type: CommandEffectType.CHATTERS
  data: object // empty object for now
}

export interface MediaVolumeEffectData {
  type: CommandEffectType.MEDIA_VOLUME
  data: object // empty object for now
}

export interface CountdownEffectData {
  type: CommandEffectType.COUNTDOWN
  data: CountdownCommandData
}

export interface RouletteEffectData {
  type: CommandEffectType.ROULETTE
  data: RouletteCommandData
}

export interface RouletteEntry {
  text: string
  weight: number
  color: string
  disabled?: boolean
}

export interface RouletteCommandData {
  widgetIds: WidgetId[]
  theme: string
  entries: RouletteEntry[]
  spinDurationMs: string | number
  winnerDisplayDurationMs: string | number
  startMessage: string
  endMessage: string
}

export interface CommandVariable {
  name: string
  value: any
}
export interface CommandVariableChange {
  change: string // 'set' | ...
  name: string
  value: string
}

export interface EmoteSet {
  name: string
  emotes: string[]
}

export type CommandFunction = (ctx: CommandExecutionContext) => any

interface CommandCooldown {
  // human duration strings, '0' for no cooldown
  global: string
  globalMessage: string
  perUser: string
  perUserMessage: string
}

export type Command =
  GeneralCommand |
  SrCurrentCommand |
  SrUndoCommand |
  SrGoodCommand |
  SrBadCommand |
  SrStatsCommand |
  SrPrevCommand |
  SrNextCommand |
  SrJumptonewCommand |
  SrClearCommand |
  SrRmCommand |
  SrShuffleCommand |
  SrResetStatsCommand |
  SrLoopCommand |
  SrNoloopCommand |
  SrPauseCommand |
  SrUnpauseCommand |
  SrHidevideoCommand |
  SrShowvideoCommand |
  SrRequestCommand |
  SrReRequestCommand |
  SrAddtagCommand |
  SrRmtagCommand |
  SrVolumeCommand |
  SrFilterCommand |
  SrPresetCommand |
  SrQueueCommand |
  SrMoveTagUpCommand

export type CommandGroup = {
  title: string
  commandIds: CommandId[]
}

export interface AbstractCommand {
  id: CommandId
  createdAt: JSONDateString
  triggers: CommandTrigger[]
  effects: CommandEffectData[]
  variables: CommandVariable[]
  cooldown: CommandCooldown
  restrict: CommandRestrict
  disallow_users: string[] // usernames
  allow_users: string[] // usernames
  enabled: boolean

  // DEPRECATED:
  // -----------------------------------------------------------------
  action: CommandAction
  data: unknown
}

export interface DictSearchResponseDataEntry {
  from: string
  to: string[]
}

export interface GeneralCommand extends AbstractCommand {
  action: CommandAction.GENERAL
  data: Record<string, never>
}

export interface SrCurrentCommand extends AbstractCommand {
  action: CommandAction.SR_CURRENT
}
export interface SrUndoCommand extends AbstractCommand {
  action: CommandAction.SR_UNDO
}
export interface SrGoodCommand extends AbstractCommand {
  action: CommandAction.SR_GOOD
}
export interface SrBadCommand extends AbstractCommand {
  action: CommandAction.SR_BAD
}
export interface SrStatsCommand extends AbstractCommand {
  action: CommandAction.SR_STATS
}
export interface SrPrevCommand extends AbstractCommand {
  action: CommandAction.SR_PREV
}
export interface SrNextCommand extends AbstractCommand {
  action: CommandAction.SR_NEXT
}
export interface SrJumptonewCommand extends AbstractCommand {
  action: CommandAction.SR_JUMPTONEW
}
export interface SrClearCommand extends AbstractCommand {
  action: CommandAction.SR_CLEAR
}
export interface SrRmCommand extends AbstractCommand {
  action: CommandAction.SR_RM
}
export interface SrShuffleCommand extends AbstractCommand {
  action: CommandAction.SR_SHUFFLE
}
export interface SrResetStatsCommand extends AbstractCommand {
  action: CommandAction.SR_RESET_STATS
}
export interface SrLoopCommand extends AbstractCommand {
  action: CommandAction.SR_LOOP
}
export interface SrNoloopCommand extends AbstractCommand {
  action: CommandAction.SR_NOLOOP
}
export interface SrPauseCommand extends AbstractCommand {
  action: CommandAction.SR_PAUSE
}
export interface SrUnpauseCommand extends AbstractCommand {
  action: CommandAction.SR_UNPAUSE
}
export interface SrHidevideoCommand extends AbstractCommand {
  action: CommandAction.SR_HIDEVIDEO
}
export interface SrShowvideoCommand extends AbstractCommand {
  action: CommandAction.SR_SHOWVIDEO
}
export interface SrRequestCommand extends AbstractCommand {
  action: CommandAction.SR_REQUEST
}
export interface SrReRequestCommand extends AbstractCommand {
  action: CommandAction.SR_RE_REQUEST
}
export interface SrAddtagCommand extends AbstractCommand {
  action: CommandAction.SR_ADDTAG
  data: {
    tag: string
  }
}
export interface SrRmtagCommand extends AbstractCommand {
  action: CommandAction.SR_RMTAG
}
export interface SrVolumeCommand extends AbstractCommand {
  action: CommandAction.SR_VOLUME
}
export interface SrFilterCommand extends AbstractCommand {
  action: CommandAction.SR_FILTER
}
export interface SrPresetCommand extends AbstractCommand {
  action: CommandAction.SR_PRESET
}
export interface SrQueueCommand extends AbstractCommand {
  action: CommandAction.SR_QUEUE
}
export interface SrMoveTagUpCommand extends AbstractCommand {
  action: CommandAction.SR_MOVE_TAG_UP
}

export interface MediaVideo {
  url: string
  volume: number // 0 - 100
}

export interface MediaV2Visualization {
  rectangle: {
    x: number // 0 - 1
    y: number // 0 - 1
    width: number // 0 - 1
    height: number // 0 - 1
  }
  rotation: number // 0 - 360
  css: string // freestyle css that will get applied to the item only
}

export type MediaV2CommandDataImageItem = {
  type: 'image'
  image: MediaFile | null // one of both must be set to something
  imageUrl: string // one of both must be set to something
  maskImage: MediaFile | null // optional, used as mask
  maskImageUrl: string // optional, used as mask if `maskImage` is not set
} & MediaV2Visualization

export type MediaV2CommandDataSoundItem = {
  type: 'sound'
  sound: SoundMediaFile
}

export type MediaV2CommandDataTextItem = {
  type: 'text'
  text: string
  font: string // css font string
  bold: boolean
  italic: boolean
  color: string // css color string
  outline: string // css color string
  outlineWidth: number
} & MediaV2Visualization

export type MediaV2CommandDataVideoItem = {
  type: 'video'
  video: MediaVideo
} & MediaV2Visualization

export type MediaV2CommandDataItem =
  MediaV2CommandDataImageItem |
  MediaV2CommandDataSoundItem |
  MediaV2CommandDataTextItem |
  MediaV2CommandDataVideoItem

export interface MediaV2CommandData {
  widgetIds: WidgetId[]
  mediaItems: MediaV2CommandDataItem[]
  minDurationMs: string | number
}

// @deprecated (use `MediaV2CommandData` instead)
export interface MediaCommandData {
  widgetIds: WidgetId[]
  sound: SoundMediaFile
  image: MediaFile
  video: MediaVideo
  image_url: string
  minDurationMs: string | number
}

export type CountdownAction =
  CountdownTextAction |
  CountdownDelayAction |
  CountdownMediaAction

export interface CountdownTextAction {
  type: CountdownActionType.TEXT
  value: string
}

export interface CountdownDelayAction {
  type: CountdownActionType.DELAY
  value: string
}

export interface CountdownMediaAction {
  type: CountdownActionType.MEDIA
  value: MediaCommandData
}

export interface CountdownCommandData {
  type: string
  step: string
  steps: string
  interval: string
  intro: string
  outro: string
  actions: CountdownAction[]
}

export interface FunctionCommand {
  id: CommandId
  triggers: CommandTrigger[]
  action?: CommandAction
  variables?: CommandVariable[]
  effects?: CommandEffectData[]
  data?: unknown
  fn: CommandFunction
  cooldown: CommandCooldown
  restrict: CommandRestrict
  disallow_users?: string[]
  allow_users?: string[]
  enabled?: boolean
}

export interface ChatMessageContext {
  client: TwitchClient | null
  context: TwitchEventContext
  msgOriginal: string
  msgNormalized: string
}

export interface Module {
  name: string
  bot: Bot
  user: User
  userChanged: (user: User) => Promise<void>
  saveCommands: () => void
  getWsEvents: () => Record<string, (ws: Socket, data?: any) => any>
  getRoutes: () => Record<string, Record<string, (req: any, res: Response, next: NextFunction) => Promise<any>>>
  getCommands: () => FunctionCommand[]
  onChatMsg: (chatMessageContext: ChatMessageContext) => Promise<void>
  isEnabled: () => boolean
  setEnabled: (enabled: boolean) => Promise<void>
}

export interface ModuleDefinition {
  module: MODULE_NAME
  title: string
}

export interface WidgetDefinition {
  type: WIDGET_TYPE
  module: MODULE_NAME
  title: string
  hint: string
  pub: boolean
}

export interface WidgetInfo extends WidgetDefinition {
  url: string
}

export interface TwitchBotIdentity {
  username: string
  password: string
  client_id: string
  client_secret: string
}

export interface Bot {
  getDb: () => Db
  getBuildVersion: () => string
  getBuildDate: () => string
  getModuleManager: () => ModuleManager
  getConfig: () => Config
  getCache: () => Cache
  getAuth: () => Auth
  getWebServer: () => WebServer
  getWebSocketServer: () => WebSocketServer
  getYoutube: () => Youtube
  getWidgets: () => Widgets
  getTimeApi: () => TimeApi
  getEventHub: () => Emitter<Record<EventType, unknown>>
  getRepos: () => Repos
  getEffectsApplier: () => EffectApplier
  getStreamStatusUpdater: () => StreamStatusUpdater
  getFrontendStatusUpdater: () => FrontendStatusUpdater
  getHelixClient: () => TwitchHelixClient
  getTwitchTmiClientManager: () => TwitchTmiClientManager
  getCanny: () => Canny
  getDiscord: () => Discord
  getEmoteParser: () => EmoteParser

  sayFn: (user: User) => (msg: string) => void
  getUserTwitchClientManager: (user: User) => TwitchClientManager
}
