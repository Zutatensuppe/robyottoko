import { NextFunction, Response } from 'express'
import { Emitter, EventType } from 'mitt'
// @ts-ignore
import { Client } from 'tmi.js'
import { LogLevel } from './common/fn'
import { CommandRestrict } from './common/permissions'
import Db from './DbPostgres'
import ModuleManager from './mod/ModuleManager'
import ModuleStorage from './mod/ModuleStorage'
import Auth from './net/Auth'
import TwitchClientManager from './net/TwitchClientManager'
import WebSocketServer, { Socket } from './net/WebSocketServer'
import Cache from './services/Cache'
import { ChatLogRepo } from './services/ChatLogRepo'
import Tokens, { Token } from './services/Tokens'
import TwitchChannels from './services/TwitchChannels'
import Users, { User } from './services/Users'
import Variables from './services/Variables'
import Widgets from './services/Widgets'
import WebServer from './WebServer'

type int = number

export interface DbConfig {
  connectStr: string
  patchesDir: string
}

export interface WsConfig {
  hostname: string
  port: int
  connectstring: string
}

export interface MailConfig {
  sendinblue_api_key: string
}

export interface HttpConfig {
  hostname: string
  port: int
  url: string
}

export interface EventSubTransport {
  method: string // webhook
  callback: string
  secret: string
}

export interface TwitchConfig {
  eventSub: {
    transport: EventSubTransport
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
  log: {
    level: LogLevel
  }
  twitch: TwitchConfig
  mail: MailConfig
  http: HttpConfig
  ws: WsConfig
  db: DbConfig
  modules: {
    sr: {
      google: {
        api_key: string
      }
    },
    speechToText: {
      google: {
        scriptId: string
      }
    }
  },
  youtubeDlBinary: string,
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
  id: number
  tags: string[]
  yt: string
  title: string
  timestamp: number
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
  palette: string[]
  displayDuration: int
  displayLatestForever: boolean
  displayLatestAutomatically: boolean
  autofillLatest: boolean
  notificationSound: SoundMediaFile | null
  requireManualApproval: boolean
  favoriteLists: DrawcastFavoriteList[]
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

// TODO: use type definitions for tmi.js
export interface TwitchChatClient extends Client {
  opts: {
    channels: string[],
  },
  say: (target: string, msg: string) => Promise<any>
  connect: () => Promise<any>
  disconnect: () => Promise<any>
  on: (event: string, callback: (target: string, context: TwitchChatContext, msg: string, self: boolean) => Promise<void>) => void
}

export interface TwitchChatContext {
  "room-id": any
  "user-id": any
  "display-name": string
  username: string
  mod: any
  subscriber: any
  badges: {
    broadcaster?: string
  }
  // incomplete
}

export interface CommandExecutionContext {
  rawCmd: RawCommand | null
  target: string | null
  context: TwitchChatContext | null
}

export interface RawCommand {
  name: string
  args: string[]
}

export enum CommandTriggerType {
  COMMAND = 'command',
  REWARD_REDEMPTION = 'reward_redemption',
  FOLLOW = 'follow',
  SUB = 'sub',
  BITS = 'bits',
  RAID = 'raid',
  TIMER = 'timer',
  FIRST_CHAT = 'first_chat',
}

export interface CommandTrigger {
  type: CommandTriggerType
  data: {
    // for trigger type "command" (todo: should only exist if type is command, not always)
    command: string
    commandExact: boolean
    // for trigger type "timer" (todo: should only exist if type is timer, not always)
    minInterval: number // duration in ms or something parsable (eg 1s, 10m, ....)
    minLines: number

    // for trigger type "first_chat"
    since: 'alltime' | 'stream'
  }
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

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CommandData {
}

export type CommandFunction = (ctx: CommandExecutionContext) => any

export enum CommandAction {
  // general
  TEXT = 'text',
  MEDIA = 'media',
  MEDIA_VOLUME = 'media_volume',
  COUNTDOWN = 'countdown',
  DICT_LOOKUP = 'dict_lookup',
  MADOCHAN_CREATEWORD = 'madochan_createword',
  CHATTERS = 'chatters',
  SET_CHANNEL_TITLE = 'set_channel_title',
  SET_CHANNEL_GAME_ID = 'set_channel_game_id',
  ADD_STREAM_TAGS = 'add_stream_tags',
  REMOVE_STREAM_TAGS = 'remove_stream_tags',
  // song request
  SR_CURRENT = 'sr_current',
  SR_UNDO = 'sr_undo',
  SR_GOOD = 'sr_good',
  SR_BAD = 'sr_bad',
  SR_STATS = 'sr_stats',
  SR_PREV = 'sr_prev',
  SR_NEXT = 'sr_next',
  SR_JUMPTONEW = 'sr_jumptonew',
  SR_CLEAR = 'sr_clear',
  SR_RM = 'sr_rm',
  SR_SHUFFLE = 'sr_shuffle',
  SR_RESET_STATS = 'sr_reset_stats',
  SR_LOOP = 'sr_loop',
  SR_NOLOOP = 'sr_noloop',
  SR_PAUSE = 'sr_pause',
  SR_UNPAUSE = 'sr_unpause',
  SR_HIDEVIDEO = 'sr_hidevideo',
  SR_SHOWVIDEO = 'sr_showvideo',
  SR_REQUEST = 'sr_request',
  SR_RE_REQUEST = 'sr_re_request',
  SR_ADDTAG = 'sr_addtag',
  SR_RMTAG = 'sr_rmtag',
  SR_VOLUME = 'sr_volume',
  SR_FILTER = 'sr_filter',
  SR_PRESET = 'sr_preset',
  SR_QUEUE = 'sr_queue',
}

export interface Command {
  id: string
  createdAt: string // json date string
  triggers: CommandTrigger[]
  action: CommandAction
  restrict_to: CommandRestrict[]
  variables: CommandVariable[]
  variableChanges: CommandVariableChange[]
  data: CommandData
}

export interface SetChannelTitleCommand extends Command {
  action: CommandAction.SET_CHANNEL_TITLE
  data: {
    title: string
  }
}

export interface AddStreamTagCommand extends Command {
  action: CommandAction.ADD_STREAM_TAGS
  data: {
    tag: string
  }
}

export interface RemoveStreamTagCommand extends Command {
  action: CommandAction.REMOVE_STREAM_TAGS
  data: {
    tag: string
  }
}

export interface SetChannelGameIdCommand extends Command {
  action: CommandAction.SET_CHANNEL_GAME_ID
  data: {
    game_id: string
  }
}

export interface DictLookupCommand extends Command {
  action: CommandAction.DICT_LOOKUP
  data: {
    lang: string
    phrase: string
  }
}

export interface MadochanCommand extends Command {
  action: CommandAction.MADOCHAN_CREATEWORD
  data: {
    model: string
    weirdness: string
  }
}

export interface DictSearchResponseDataEntry {
  from: string
  to: string[]
}

export interface RandomTextCommand extends Command {
  action: CommandAction.TEXT
  data: {
    text: string[]
  }
}

export interface MediaVolumeCommand extends Command {
  action: CommandAction.MEDIA_VOLUME
}

export interface MediaCommand extends Command {
  action: CommandAction.MEDIA
  data: MediaCommandData
}

export interface ChattersCommand extends Command {
  action: CommandAction.CHATTERS
}

export interface MediaVideo {
  url: string
  volume: number // 0 - 100
}

export interface MediaCommandData {
  widgetIds: string[]
  sound: SoundMediaFile
  image: MediaFile
  video: MediaVideo
  image_url: string
  minDurationMs: string | number
}

export enum CountdownActionType {
  TEXT = 'text',
  MEDIA = 'media',
  DELAY = 'delay',
}

export interface CountdownAction {
  type: CountdownActionType
  value: string | MediaCommandData
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

export interface CountdownCommand extends Command {
  action: CommandAction.COUNTDOWN
  data: CountdownCommandData
}

export interface FunctionCommand {
  triggers: CommandTrigger[]
  action?: CommandAction
  restrict_to?: CommandRestrict[]
  variables?: CommandVariable[]
  variableChanges?: CommandVariableChange[]
  data?: CommandData
  fn: CommandFunction
}

export interface ChatMessageContext {
  client: TwitchChatClient | null
  target: string
  context: TwitchChatContext
  msg: string
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
}

interface MailServiceUser {
  email: string
  name: string
}

export interface MailServicePasswordResetData {
  user: MailServiceUser
  token: Token
}

export interface MailServiceRegistrationData {
  user: MailServiceUser
  token: Token
}

export interface MailService {
  sendPasswordResetMail: (data: MailServicePasswordResetData) => any
  sendRegistrationMail: (data: MailServiceRegistrationData) => any
}

export interface Bot {
  getBuildVersion: () => string
  getBuildDate: () => string
  getModuleManager: () => ModuleManager
  getDb: () => Db
  getConfig: () => Config
  getUsers: () => Users
  getTokens: () => Tokens
  getTwitchChannels: () => TwitchChannels
  getCache: () => Cache
  getMail: () => MailService
  getAuth: () => Auth
  getWebServer: () => WebServer
  getWebSocketServer: () => WebSocketServer
  getWidgets: () => Widgets
  getEventHub: () => Emitter<Record<EventType, unknown>>
  getChatLog: () => ChatLogRepo

  sayFn: (user: User, target: string | null) => (msg: string) => void
  getUserVariables: (user: User) => Variables
  getUserModuleStorage: (user: User) => ModuleStorage
  getUserTwitchClientManager: (user: User) => TwitchClientManager
}
