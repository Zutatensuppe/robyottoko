// @ts-ignore
import { Client } from 'tmi.js'
import { Socket } from './net/WebSocketServer'
import { Token } from './services/Tokens'
import Variables from './services/Variables'

type int = number

export type LogLevel = 'info' | 'debug' | 'error' | 'log'

export interface DbConfig {
  file: string
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

export interface TwitchConfig {
  eventSub: {
    transport: {
      method: string // 'webhook'
      callback: string
      secret: string
    }
  }
  tmi: {
    identity: {
      client_id: string
      client_secret: string
      username: string
      password: string
    }
  }
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
  }
}

export interface UploadedFile {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  destination: string
  filename: string
  path: string
  size: number
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

export interface DrawcastSettings {
  canvasWidth: int
  canvasHeight: int
  submitButtonText: string
  submitConfirm: string
  customDescription: string
  palette: string
  displayDuration: int
  displayLatestForever: string
  displayLatestAutomatically: string
  notificationSound: {
    filename: string
    file: string
    volume: number
  }
  favorites: string[]
}

export interface DrawcastData {
  settings: DrawcastSettings
  defaultSettings: any
  drawUrl: string
  images: any[]
}

export interface GlobalVariable {
  name: string
  value: any
}

// TODO: use type definitions for tmi.js
export interface TwitchChatClient extends Client {
  opts: {
    channels: string[],
  },
  say: (target: string, msg: string) => Promise<any>
  connect: () => any
  disconnect: () => any
  on: (event: string, callback: (target: string, context: TwitchChatContext, msg: string, self: boolean) => Promise<void>) => void
}

export interface TwitchChatContext {
  "room-id": any
  "user-id": any
  "display-name": string
  username: string
  mod: any
  subscriber: any
}

export interface RawCommand {
  name: string
  args: string[]
}

export type CommandTriggerType = 'command' | 'reward_redemption' | 'timer'

export interface CommandTrigger {
  type: CommandTriggerType
  data: {
    // for trigger type "command" (todo: should only exist if type is command, not always)
    command: string
    commandExact: boolean
    // for trigger type "timer" (todo: should only exist if type is timer, not always)
    minInterval: number // duration in ms or something parsable (eg 1s, 10m, ....)
    minLines: number
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
export interface CommandData { }

export type CommandFunction = (
  rawCmd: RawCommand | null,
  client: TwitchChatClient | null,
  target: string | null,
  context: TwitchChatContext | null,
  msg: string | null,
) => any

export type CommandAction = 'text' | 'media' | 'countdown' | 'dict_lookup' | 'madochan_createword' | 'chatters'
export type CommandRestrict = 'mod' | 'sub' | 'broadcaster'

export interface Command {
  triggers: CommandTrigger[]
  action: CommandAction
  restrict_to: CommandRestrict[]
  variables: CommandVariable[]
  variableChanges: CommandVariableChange[]
  data: CommandData
}

// should not exist
export interface TextCommand extends Command {
  action: "text"
  data: {
    text: string
  }
}

export interface DictLookupCommand extends Command {
  action: "dict_lookup"
  data: {
    lang: string
    phrase: string
  }
}

export interface DictSearchResponseDataEntry {
  from: string
  to: string[]
}

export interface RandomTextCommand extends Command {
  action: "text"
  data: {
    text: string[]
  }
}

export interface MediaCommand extends Command {
  action: "media"
}

export interface MediaCommandData {
  sound: {
    filename: string
    file: string
    volume: number
  },
  image: {
    filename: string
    file: string
  },
  minDurationMs: string | number
}

export type CountdownActionType = 'text' | 'media' | 'delay'

export interface CountdownAction {
  type: CountdownActionType
  value: string | MediaCommandData
}

export interface CountdownCommand extends Command {
  action: "countdown"
  data: {
    type: string
    step: string
    steps: string
    interval: string
    intro: string
    outro: string
    actions: CountdownAction[]
  }
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
  client: TwitchChatClient
  target: string
  context: TwitchChatContext
  msg: string
}

export interface RewardRedemptionContext {
  client: TwitchChatClient
  target: string
  context: TwitchChatContext
  redemption: TwitchChannelPointsRedemption,
}

// https://dev.twitch.tv/docs/pubsub
export interface TwitchChannelPointsEventMessage {
  type: 'reward-redeemed',
  data: {
    timestamp: string,
    redemption: TwitchChannelPointsRedemption,
  }
}

export interface TwitchChannelPointsRedemption {
  id: string
  user: {
    id: string
    login: string
    display_name: string
  }
  channel_id: string
  redeemed_at: string
  reward: {
    id: string
    channel_id: string
    title: string
    prompt: string
    cost: int
    is_user_input_required: boolean
    is_sub_only: boolean
    image: {
      url_1x: string
      url_2x: string
      url_4x: string
    },
    default_image: {
      url_1x: string
      url_2x: string
      url_4x: string
    }
    background_color: string
    is_enabled: boolean
    is_paused: boolean
    is_in_stock: boolean
    max_per_stream: {
      is_enabled: boolean
      max_per_stream: int
    }
    should_redemptions_skip_request_queue: boolean
  }
  user_input: string
  status: string
}

export interface Module {
  name: string
  variables: Variables
  saveCommands: () => void
  getWsEvents: () => Record<string, (ws: Socket, data?: any) => any>
  widgets: () => Record<string, (req: any, res: any, next: Function) => Record<string, string>>
  getRoutes: () => Record<string, Record<string, (req: any, res: any, next: Function) => Promise<any>>>
  getCommands: () => FunctionCommand[]
  onChatMsg: (chatMessageContext: ChatMessageContext) => Promise<void>
  onRewardRedemption: (rewardRedemptionContext: RewardRedemptionContext) => Promise<void>
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
