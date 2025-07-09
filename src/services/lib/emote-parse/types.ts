export enum Provider {
  BTTV = 'bttv',
  FFZ = 'ffz',
  SEVENTV = '7tv',
  TWITCH = 'twitch',
}

export interface RepEmote {
  start: number
  end: number
  rep: string
}

export interface Emote {
  code: string
  img: string
  type: Provider
}

export enum Scope {
  GLOBAL = 'global',
  CHANNEL = 'channel',
}

type ScopeMap = Record<Scope, boolean>

export interface LoadedChannelAssets {
  lastLoadedTs: null | number
  channel: string
  channelId: string
  emotes: Emote[]
  loaded: {
    [Provider.BTTV]: ScopeMap
    [Provider.FFZ]: ScopeMap
    [Provider.SEVENTV]: ScopeMap
    [Provider.TWITCH]: ScopeMap
  }
}
