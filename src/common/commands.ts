import { getProp, mustParseHumanDuration, nonce } from '../common/fn'
import {
  Command, CommandAction, CommandEffectData, CommandEffectType, CommandTrigger, CommandTriggerType,
  CountdownAction, CountdownActionType, FunctionCommand,
  MediaCommandData, MediaFile, MediaVideo, SoundMediaFile,
} from '../types'
import { MOD_OR_ABOVE } from './permissions'

export const newText = () => ''

const newSoundMediaFile = (obj: any = null): SoundMediaFile => ({
  filename: getProp(obj, ['filename'], ''),
  file: getProp(obj, ['file'], ''),
  urlpath: getProp(obj, ['urlpath'], ''),
  volume: getProp(obj, ['volume'], 100),
})

const newMediaFile = (obj: any = null): MediaFile => ({
  filename: getProp(obj, ['filename'], ''),
  file: getProp(obj, ['file'], ''),
  urlpath: getProp(obj, ['urlpath'], ''),
})

const newMediaVideo = (obj: any = null): MediaVideo => ({
  // video identified by url
  url: getProp(obj, ['url'], ''),
  volume: getProp(obj, ['volume'], 100),
})

export const newMedia = (obj: any = null): MediaCommandData => ({
  widgetIds: getProp(obj, ['widgetIds'], []),
  sound: newSoundMediaFile(obj?.sound),
  image: newMediaFile(obj?.image),
  image_url: getProp(obj, ['image_url'], ''), // image identified by url only
  video: newMediaVideo(obj?.video),
  minDurationMs: getProp(obj, ['minDurationMs'], '1s'),
})

export const newCountdownDelay = (): CountdownAction => ({ type: CountdownActionType.DELAY, value: '1s' })
export const newCountdownText = (): CountdownAction => ({ type: CountdownActionType.TEXT, value: newText() })
export const newCountdownMedia = (): CountdownAction => ({ type: CountdownActionType.MEDIA, value: newMedia() })

export const newTrigger = (type: CommandTriggerType): CommandTrigger => ({
  type,
  data: {
    // for trigger type "command" (todo: should only exist if type is command, not always)
    command: {
      value: '',
      match: 'startsWith',
    },

    // for trigger type "timer" (todo: should only exist if type is timer, not always)
    minInterval: 0, // duration in ms or something parsable (eg 1s, 10m, ....)
    minLines: 0,

    // for trigger type "first_chat"
    since: 'stream',
  },
})

export const newSubscribeTrigger = (): CommandTrigger => newTrigger(CommandTriggerType.SUB)
export const newFollowTrigger = (): CommandTrigger => newTrigger(CommandTriggerType.FOLLOW)
export const newBitsTrigger = (): CommandTrigger => newTrigger(CommandTriggerType.BITS)
export const newRaidTrigger = (): CommandTrigger => newTrigger(CommandTriggerType.RAID)

export const newRewardRedemptionTrigger = (command: string = ''): CommandTrigger => {
  const trigger = newTrigger(CommandTriggerType.REWARD_REDEMPTION)
  trigger.data.command = { value: command, match: 'exact' }
  return trigger
}

export const newJsonDate = () => new Date().toJSON()
const newCommandId = () => nonce(10)

export const newCommandTrigger = (command: string = '', commandExact: boolean = false): CommandTrigger => {
  const trigger = newTrigger(CommandTriggerType.COMMAND)
  trigger.data.command = {
    value: command,
    match: commandExact ? 'exact' : 'startsWith',
  }
  return trigger
}

export const newFirstChatTrigger = (since: 'alltime' | 'stream'): CommandTrigger => {
  const trigger = newTrigger(CommandTriggerType.FIRST_CHAT)
  trigger.data.since = since
  return trigger
}

const triggersEqual = (a: CommandTrigger, b: CommandTrigger): boolean => {
  if (a.type !== b.type) {
    return false
  }
  if (a.type === CommandTriggerType.COMMAND) {
    if (
      a.data.command.value === b.data.command.value
      && a.data.command.match === a.data.command.match
    ) {
      // no need to check for commandExact here (i think^^)
      return true
    }
  } else if (a.type === CommandTriggerType.REWARD_REDEMPTION) {
    if (
      a.data.command.value === b.data.command.value
      && a.data.command.match === a.data.command.match
    ) {
      return true
    }
  } else if (a.type === CommandTriggerType.TIMER) {
    if (
      a.data.minInterval === b.data.minInterval
      && a.data.minLines === b.data.minLines
    ) {
      return true
    }
  } else if (a.type === CommandTriggerType.FIRST_CHAT) {
    return true
  } else if (a.type === CommandTriggerType.SUB) {
    return true
  } else if (a.type === CommandTriggerType.FOLLOW) {
    return true
  } else if (a.type === CommandTriggerType.BITS) {
    return true
  } else if (a.type === CommandTriggerType.RAID) {
    return true
  }
  return false
}

export const commandHasAnyTrigger = (
  command: FunctionCommand,
  triggers: CommandTrigger[],
): boolean => {
  for (const cmdTrigger of command.triggers) {
    for (const trigger of triggers) {
      if (triggersEqual(cmdTrigger, trigger)) {
        return true
      }
    }
  }
  return false
}

export const getUniqueCommandsByTriggers = (
  commands: FunctionCommand[],
  triggers: CommandTrigger[],
): FunctionCommand[] => {
  const tmp = commands.filter((command) => commandHasAnyTrigger(command, triggers))
  return tmp.filter((item, i, ar) => ar.indexOf(item) === i)
}

export const isValidEffect = (_effect: CommandEffectData): boolean => {
  // TODO: check if effects are actually valid
  return true
}

export const isValidTrigger = (trigger: CommandTrigger): boolean => {
  if (trigger.type === CommandTriggerType.COMMAND) {
    if (!trigger.data.command.value) {
      return false
    }
    return true
  }

  if (trigger.type === CommandTriggerType.TIMER) {
    try {
      mustParseHumanDuration(trigger.data.minInterval)
    } catch (e) {
      return false
    }
    const l = parseInt(`${trigger.data.minLines}`, 10)
    if (isNaN(l)) {
      return false
    }
    return true
  }

  return true
}

interface CommandDef {
  Name: () => string
  Description: () => string
  NewCommand: () => Command
}

const createCommand = (cmd: Partial<Command>): Command => {
  if (typeof cmd.action === 'undefined') {
    throw new Error('action required')
  }
  return {
    id: typeof cmd.id !== 'undefined' ? cmd.id : newCommandId(),
    createdAt: typeof cmd.createdAt !== 'undefined' ? cmd.createdAt : newJsonDate(),
    action: cmd.action,
    triggers: typeof cmd.triggers !== 'undefined' ? cmd.triggers : [],
    effects: typeof cmd.effects !== 'undefined' ? cmd.effects : [],
    variables: typeof cmd.variables !== 'undefined' ? cmd.variables : [],
    data: typeof cmd.data !== 'undefined' ? cmd.data : {},
    cooldown: typeof cmd.cooldown !== 'undefined' ? cmd.cooldown : { global: '0', globalMessage: '', perUser: '0', perUserMessage: '' },
    restrict: {
      active: typeof cmd.restrict !== 'undefined' ? cmd.restrict.active : false,
      to: typeof cmd.restrict !== 'undefined' ? cmd.restrict.to : [],
    },
    disallow_users: typeof cmd.disallow_users !== 'undefined' ? cmd.disallow_users : [],
    allow_users: typeof cmd.allow_users !== 'undefined' ? cmd.allow_users : [],
    enabled: typeof cmd.enabled !== 'undefined' ? cmd.enabled : true,
  }
}

export const commands: Record<CommandAction, CommandDef> = {
  [CommandAction.TEXT]: {
    Name: () => 'command',
    Description: () => '',
    NewCommand: (): Command => createCommand({
      triggers: [newCommandTrigger()],
      action: CommandAction.TEXT,
    }),
  },
  [CommandAction.SR_CURRENT]: {
    Name: () => 'sr_current',
    Description: () => 'Show what song is currently playing',
    NewCommand: (): Command => createCommand({
      action: CommandAction.SR_CURRENT,
      triggers: [newCommandTrigger('!sr current', true)],
    }),
  },
  [CommandAction.SR_UNDO]: {
    Name: () => 'sr_undo',
    Description: () => 'Remove the song that was last added by oneself.',
    NewCommand: (): Command => createCommand({
      action: CommandAction.SR_UNDO,
      triggers: [newCommandTrigger('!sr undo', true)],
    }),
  },
  [CommandAction.SR_GOOD]: {
    Name: () => 'sr_good',
    Description: () => 'Vote the current song up',
    NewCommand: (): Command => createCommand({
      action: CommandAction.SR_GOOD,
      triggers: [newCommandTrigger('!sr good', true)],
    }),
  },
  [CommandAction.SR_BAD]: {
    Name: () => 'sr_bad',
    Description: () => 'Vote the current song down',
    NewCommand: (): Command => createCommand({
      action: CommandAction.SR_BAD,
      triggers: [newCommandTrigger('!sr bad', true)],
    }),
  },
  [CommandAction.SR_STATS]: {
    Name: () => 'sr_stats',
    Description: () => 'Show stats about the playlist',
    NewCommand: (): Command => createCommand({
      action: CommandAction.SR_STATS,
      triggers: [newCommandTrigger('!sr stats', true), newCommandTrigger('!sr stat', true)],
    }),
  },
  [CommandAction.SR_PREV]: {
    Name: () => 'sr_prev',
    Description: () => 'Skip to the previous song',
    NewCommand: (): Command => createCommand({
      action: CommandAction.SR_PREV,
      triggers: [newCommandTrigger('!sr prev', true)],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }),
  },
  [CommandAction.SR_NEXT]: {
    Name: () => 'sr_next',
    Description: () => 'Skip to the next song',
    NewCommand: (): Command => createCommand({
      action: CommandAction.SR_NEXT,
      triggers: [newCommandTrigger('!sr next', true), newCommandTrigger('!sr skip', true)],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }),
  },
  [CommandAction.SR_JUMPTONEW]: {
    Name: () => 'sr_jumptonew',
    Description: () => 'Jump to the next unplayed song',
    NewCommand: (): Command => createCommand({
      action: CommandAction.SR_JUMPTONEW,
      triggers: [newCommandTrigger('!sr jumptonew', true)],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }),
  },
  [CommandAction.SR_CLEAR]: {
    Name: () => 'sr_clear',
    Description: () => 'Clear the playlist',
    NewCommand: (): Command => createCommand({
      action: CommandAction.SR_CLEAR,
      triggers: [newCommandTrigger('!sr clear', true)],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }),
  },
  [CommandAction.SR_RM]: {
    Name: () => 'sr_rm',
    Description: () => 'Remove the current song from the playlist',
    NewCommand: (): Command => createCommand({
      action: CommandAction.SR_RM,
      triggers: [newCommandTrigger('!sr rm', true)],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }),
  },
  [CommandAction.SR_SHUFFLE]: {
    Name: () => 'sr_shuffle',
    Description: () => `Shuffle the playlist (current song unaffected).
    <br />
    Non-played and played songs will be shuffled separately and non-played
    songs will be put after currently playing song.`,
    NewCommand: (): Command => createCommand({
      action: CommandAction.SR_SHUFFLE,
      triggers: [newCommandTrigger('!sr shuffle', true)],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }),
  },
  [CommandAction.SR_RESET_STATS]: {
    Name: () => 'sr_reset_stats',
    Description: () => 'Reset all statistics of all songs',
    NewCommand: (): Command => createCommand({
      action: CommandAction.SR_RESET_STATS,
      triggers: [newCommandTrigger('!sr resetStats', true)],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }),
  },
  [CommandAction.SR_LOOP]: {
    Name: () => 'sr_loop',
    Description: () => 'Loop the current song',
    NewCommand: (): Command => createCommand({
      action: CommandAction.SR_LOOP,
      triggers: [newCommandTrigger('!sr loop', true)],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }),
  },
  [CommandAction.SR_NOLOOP]: {
    Name: () => 'sr_noloop',
    Description: () => 'Stop looping the current song',
    NewCommand: (): Command => createCommand({
      action: CommandAction.SR_NOLOOP,
      triggers: [newCommandTrigger('!sr noloop', true), newCommandTrigger('!sr unloop', true)],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }),
  },
  [CommandAction.SR_PAUSE]: {
    Name: () => 'sr_pause',
    Description: () => 'Pause currently playing song',
    NewCommand: (): Command => createCommand({
      action: CommandAction.SR_PAUSE,
      triggers: [newCommandTrigger('!sr pause', true)],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }),
  },
  [CommandAction.SR_UNPAUSE]: {
    Name: () => 'sr_unpause',
    Description: () => 'Unpause currently paused song',
    NewCommand: (): Command => createCommand({
      action: CommandAction.SR_UNPAUSE,
      triggers: [newCommandTrigger('!sr nopause', true), newCommandTrigger('!sr unpause', true)],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }),
  },
  [CommandAction.SR_HIDEVIDEO]: {
    Name: () => 'sr_hidevideo',
    Description: () => 'Hide video for current song',
    NewCommand: (): Command => createCommand({
      action: CommandAction.SR_HIDEVIDEO,
      triggers: [newCommandTrigger('!sr hidevideo', true)],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }),
  },
  [CommandAction.SR_SHOWVIDEO]: {
    Name: () => 'sr_showvideo',
    Description: () => 'Show video for current song',
    NewCommand: (): Command => createCommand({
      action: CommandAction.SR_SHOWVIDEO,
      triggers: [newCommandTrigger('!sr showvideo', true)],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }),
  },
  [CommandAction.SR_REQUEST]: {
    Name: () => 'sr_request',
    Description: () => `
    Search for <code>&lt;SEARCH&gt;</code> (argument to this command)
    at youtube (by id or by title)
    and queue the first result in the playlist (after the first found
    batch of unplayed songs).`,
    NewCommand: (): Command => createCommand({
      action: CommandAction.SR_REQUEST,
      triggers: [newCommandTrigger('!sr')],
    }),
  },
  [CommandAction.SR_RE_REQUEST]: {
    Name: () => 'sr_re_request',
    Description: () => `
    Search for <code>&lt;SEARCH&gt;</code> (argument to this command)
    in the current playlist and queue the first result in the playlist
    (after the first found batch of unplayed songs).`,
    NewCommand: (): Command => createCommand({
      action: CommandAction.SR_RE_REQUEST,
      triggers: [newCommandTrigger('!resr')],
    }),
  },
  [CommandAction.SR_ADDTAG]: {
    Name: () => 'sr_addtag',
    Description: () => 'Add tag <code>&lt;TAG&gt;</code> (argument to this command) to the current song',
    NewCommand: (): Command => createCommand({
      action: CommandAction.SR_ADDTAG,
      triggers: [newCommandTrigger('!sr tag'), newCommandTrigger('!sr addtag')],
      restrict: { active: true, to: MOD_OR_ABOVE },
      data: { tag: '' },
    }),
  },
  [CommandAction.SR_RMTAG]: {
    Name: () => 'sr_rmtag',
    Description: () => 'Remove tag <code>&lt;TAG&gt;</code> (argument to this command) from the current song',
    NewCommand: (): Command => createCommand({
      action: CommandAction.SR_RMTAG,
      triggers: [newCommandTrigger('!sr rmtag')],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }),
  },
  [CommandAction.SR_VOLUME]: {
    Name: () => 'sr_volume',
    Description: () => `Sets the song request volume to <code>&lt;VOLUME&gt;</code> (argument to this command, min 0, max 100).
    <br />
    If no argument is given, just outputs the current volume`,
    NewCommand: (): Command => createCommand({
      action: CommandAction.SR_VOLUME,
      triggers: [newCommandTrigger('!sr volume')],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }),
  },
  [CommandAction.SR_FILTER]: {
    Name: () => 'sr_filter',
    Description: () => `Play only songs with the given tag <code>&lt;TAG&gt;</code> (argument to this command). If no tag
  is given, play all songs.`,
    NewCommand: (): Command => createCommand({
      action: CommandAction.SR_FILTER,
      triggers: [newCommandTrigger('!sr filter')],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }),
  },
  [CommandAction.SR_PRESET]: {
    Name: () => 'sr_preset',
    Description: () => `Switches to the preset <code>&lt;PRESET&gt;</code> (argument to this command) if it exists.
  If no arguments are given, outputs all available presets.`,
    NewCommand: (): Command => createCommand({
      action: CommandAction.SR_PRESET,
      triggers: [newCommandTrigger('!sr preset')],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }),
  },
  [CommandAction.SR_QUEUE]: {
    Name: () => 'sr_queue',
    Description: () => 'Shows the next 3 songs that will play.',
    NewCommand: (): Command => createCommand({
      action: CommandAction.SR_QUEUE,
      triggers: [newCommandTrigger('!sr queue')],
    }),
  },
  [CommandAction.SR_MOVE_TAG_UP]: {
    Name: () => 'sr_move_tag_up',
    Description: () => 'Moves songs with the tag to the beginning of the playlist.',
    NewCommand: (): Command => createCommand({
      action: CommandAction.SR_MOVE_TAG_UP,
      triggers: [newCommandTrigger('!sr movetagup')],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }),
  },
}

export const possibleEffectActions = () => ([
  { type: CommandEffectType.CHAT, label: 'Add chat', title: 'chat' },
  { type: CommandEffectType.MEDIA, label: 'Add media', title: 'media' },
  { type: CommandEffectType.MEDIA_VOLUME, label: 'Add media volume', title: 'media_volume' },
  { type: CommandEffectType.EMOTES, label: 'Add emotes', title: 'emotes' },
  { type: CommandEffectType.SET_CHANNEL_TITLE, label: 'Add set_channel_title', title: 'set_channel_title' },
  { type: CommandEffectType.SET_CHANNEL_GAME_ID, label: 'Add set_channel_game_id', title: 'set_channel_game_id' },
  { type: CommandEffectType.CHATTERS, label: 'Add chatters', title: 'chatters' },
  { type: CommandEffectType.DICT_LOOKUP, label: 'Add dict_lookup', title: 'dict_lookup' },
  { type: CommandEffectType.ADD_STREAM_TAGS, label: 'Add add_stream_tags', title: 'add_stream_tags' },
  { type: CommandEffectType.REMOVE_STREAM_TAGS, label: 'Add remove_stream_tags', title: 'remove_stream_tags' },
  { type: CommandEffectType.MADOCHAN, label: 'Add madochan', title: 'madochan' },
  { type: CommandEffectType.COUNTDOWN, label: 'Add countdown', title: 'countdown' },
  { type: CommandEffectType.VARIABLE_CHANGE, label: 'Add variable_change', title: 'variable_change' },
])

const newEffectData = (type: CommandEffectType): any => {
  switch (type) {
    case CommandEffectType.VARIABLE_CHANGE:
      return { name: '', change: 'set', value: '' }
    case CommandEffectType.CHAT:
      return { text: [''] }
    case CommandEffectType.DICT_LOOKUP:
      return { lang: 'ja', phrase: '' }
    case CommandEffectType.EMOTES:
      return { displayFn: [], emotes: [] }
    case CommandEffectType.MEDIA:
      return newMedia()
    case CommandEffectType.MADOCHAN:
      // TODO: use from same resource as server
      return { model: '100epochs800lenhashingbidirectional.h5', weirdness: '1' }
    case CommandEffectType.SET_CHANNEL_TITLE:
      return { title: '' }
    case CommandEffectType.SET_CHANNEL_GAME_ID:
      return { game_id: '' }
    case CommandEffectType.ADD_STREAM_TAGS:
      return { tag: '' }
    case CommandEffectType.REMOVE_STREAM_TAGS:
      return { tag: '' }
    case CommandEffectType.CHATTERS:
      return {}
    case CommandEffectType.COUNTDOWN:
      return {
          type: 'auto',
          step: '',
          steps: '3',
          interval: '1s',
          intro: 'Starting countdown...',
          outro: 'Done!',
          actions: [],
      }
    default:
      // should not occur, all possible cases are handled
      return {}
  }
}

export const newEffect = (type: CommandEffectType): CommandEffectData => {
  return { type, data: newEffectData(type) }
}

export default {
  commands,
  newEffect,
  possibleEffectActions,
}
