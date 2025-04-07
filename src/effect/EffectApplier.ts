import { logger } from '../common/fn'
import { TwitchEventContext } from '../services/twitch'
import { FunctionCommand, Module, RawCommand } from '../types'
import { CommandEffectType } from '../types'
import { AddStreamTagEffect } from './AddStreamTagsEffect'
import { ChatEffect } from './ChatEffect'
import { ChattersEffect } from './ChattersEffect'
import { CountdownEffect } from './CountdownEffect'
import { DictLookupEffect } from './DictLookupEffect'
import { EmotesEffect } from './EmotesEffect'
import { MediaEffect } from './MediaEffect'
import { MediaVolumeEffect } from './MediaVolumeEffect'
import { RemoveStreamTagEffect } from './RemoveStreamTagsEffect'
import { RouletteEffect } from './RouletteEffect'
import { SetChannelGameIdEffect } from './SetChannelGameIdEffect'
import { SetChannelTitleEffect } from './SetChannelTitleEffect'
import { VariableChangeEffect } from './VariableChangeEffect'

const EFFECTS_CLASS_MAP = {
  [CommandEffectType.VARIABLE_CHANGE]: VariableChangeEffect,
  [CommandEffectType.CHAT]: ChatEffect,
  [CommandEffectType.DICT_LOOKUP]: DictLookupEffect,
  [CommandEffectType.EMOTES]: EmotesEffect,
  [CommandEffectType.MEDIA]: MediaEffect,
  [CommandEffectType.SET_CHANNEL_TITLE]: SetChannelTitleEffect,
  [CommandEffectType.SET_CHANNEL_GAME_ID]: SetChannelGameIdEffect,
  [CommandEffectType.ADD_STREAM_TAGS]: AddStreamTagEffect,
  [CommandEffectType.REMOVE_STREAM_TAGS]: RemoveStreamTagEffect,
  [CommandEffectType.CHATTERS]: ChattersEffect,
  [CommandEffectType.COUNTDOWN]: CountdownEffect,
  [CommandEffectType.MEDIA_VOLUME]: MediaVolumeEffect,
  [CommandEffectType.ROULETTE]: RouletteEffect,
}

const log = logger('EffectApplier.ts')

export class EffectApplier {
  async applyEffects (
    originalCmd: FunctionCommand,
    contextModule: Module,
    rawCmd: RawCommand | null,
    context: TwitchEventContext | null,
  ) {
    if (!originalCmd.effects) {
      return
    }
    for (const effect of originalCmd.effects) {
      if (!EFFECTS_CLASS_MAP[effect.type]) {
        // unknown effect...
        log.warn({ type: effect.type }, 'unknown effect type')
        continue
      }
      const e = new (EFFECTS_CLASS_MAP[effect.type])(
        JSON.parse(JSON.stringify(effect)),
        originalCmd,
        contextModule,
        rawCmd,
        context,
      )
      await e.apply()
    }
    contextModule.saveCommands()
  }
}
