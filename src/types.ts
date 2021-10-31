import { Client } from 'tmi.js'
import { Socket } from './net/WebSocketServer'
import { Token } from './services/Tokens'
import { User } from './services/Users'
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

export interface Config {
  secret: string
  log: {
    level: LogLevel
  }
  twitch: {
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
  mail: {
    sendinblue_api_key: string
  }
  http: {
    hostname: string
    port: int
    url: string
  }
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
  id: string
  tags: string[]
}

export interface DrawcastData {
  settings: {
    canvasWidth: int
    canvasHeight: int
    submitButtonText: string
    submitConfirm: string
    customDescription: string
    palette: string
    displayDuration: int
    displayLatestForever: string
    displayLatestAutomatically: string
    notificationSound: string
    favorites: string[]
  }
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
  channels: string[]
  say: (target: string, msg: string) => Promise<any>
}

export interface TwitchChatContext {
  "room-id": any
  "user-id": any
  "display-name": any
  mod: any
  subscriber: any
}

export interface RawCommand {
  name: string
  args: string[]
}

export interface CommandTrigger { }
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

export type CommandAction = 'text' | 'media' | 'countdown' | 'jisho_org_lookup' | 'madochan_createword' | 'chatters'
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

export interface RandomTextCommand extends Command {
  action: "text"
  data: {
    text: string[]
  }
}

export interface MediaCommand extends Command {
  action: "media"
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
    actions: { type: string, value: string }[]
  }
}

export interface FunctionCommand extends Command {
  fn: (rawCmd: RawCommand, client: Client, target: string, context: TwitchChatContext, msg: string) => any
}

export interface BotModule {
  variables: Variables
  saveCommands: () => void
}

export interface Module {
  name: string
  getWsEvents: () => Record<string, (ws: Socket, data?: any) => any>
}

interface MailServicePasswordResetData {
  user: User
  token: Token
}

interface MailServiceRegistrationData {
  user: User
  token: Token
}

export interface MailService {
  sendPasswordResetMail: (data: MailServicePasswordResetData) => any
  sendRegistrationMail: (data: MailServiceRegistrationData) => any
}
