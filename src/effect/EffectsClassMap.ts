import { CommandEffectType } from '../types'
import { AddStreamTagEffect } from './AddStreamTagsEffect'
import { ChatEffect } from './ChatEffect'
import { ChattersEffect } from './ChattersEffect'
import { CountdownEffect } from './CountdownEffect'
import { DictLookupEffect } from './DictLookupEffect'
import { EmotesEffect } from './EmotesEffect'
import { MadochanEffect } from './MadochanEffect'
import { MediaEffect } from './MediaEffect'
import { MediaVolumeEffect } from './MediaVolumeEffect'
import { RemoveStreamTagEffect } from './RemoveStreamTagsEffect'
import { RouletteEffect } from './RouletteEffect'
import { SetChannelGameIdEffect } from './SetChannelGameIdEffect'
import { SetChannelTitleEffect } from './SetChannelTitleEffect'
import { VariableChangeEffect } from './VariableChangeEffect'

export const EffectsClassMap = {
  [CommandEffectType.VARIABLE_CHANGE]: VariableChangeEffect,
  [CommandEffectType.CHAT]: ChatEffect,
  [CommandEffectType.DICT_LOOKUP]: DictLookupEffect,
  [CommandEffectType.EMOTES]: EmotesEffect,
  [CommandEffectType.MEDIA]: MediaEffect,
  [CommandEffectType.MADOCHAN]: MadochanEffect,
  [CommandEffectType.SET_CHANNEL_TITLE]: SetChannelTitleEffect,
  [CommandEffectType.SET_CHANNEL_GAME_ID]: SetChannelGameIdEffect,
  [CommandEffectType.ADD_STREAM_TAGS]: AddStreamTagEffect,
  [CommandEffectType.REMOVE_STREAM_TAGS]: RemoveStreamTagEffect,
  [CommandEffectType.CHATTERS]: ChattersEffect,
  [CommandEffectType.COUNTDOWN]: CountdownEffect,
  [CommandEffectType.MEDIA_VOLUME]: MediaVolumeEffect,
  [CommandEffectType.ROULETTE]: RouletteEffect,
}
