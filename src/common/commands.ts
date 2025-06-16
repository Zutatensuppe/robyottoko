import { getProp, mustParseHumanDuration, nonce } from '../common/fn'
import type {
  AbstractCommand,
  Command, CommandEffectData, CommandTrigger,
  CountdownAction, FunctionCommand,
  GeneralCommand,
  MediaCommandData, MediaV2CommandDataSoundItem, MediaFile, MediaV2CommandData, MediaVideo, RouletteCommandData, RouletteEntry, SoundMediaFile, SrAddtagCommand, SrBadCommand, SrClearCommand, SrCurrentCommand, SrFilterCommand, SrGoodCommand, SrHidevideoCommand, SrJumptonewCommand, SrLoopCommand, SrMoveTagUpCommand, SrNextCommand, SrNoloopCommand, SrPauseCommand, SrPresetCommand, SrPrevCommand, SrQueueCommand, SrReRequestCommand, SrRequestCommand, SrResetStatsCommand, SrRmCommand, SrRmtagCommand, SrShowvideoCommand, SrShuffleCommand, SrStatsCommand, SrUndoCommand, SrUnpauseCommand, SrVolumeCommand,
  MediaV2CommandDataVideoItem,
  MediaV2CommandDataImageItem,
  MediaV2CommandDataTextItem} from '../types'
import { CommandAction, CommandEffectType, CommandTriggerType, CountdownActionType,
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

export const newMediaV2 = (obj: any = null): MediaV2CommandData => ({
  widgetIds: getProp(obj, ['widgetIds'], []),
  mediaItems: getProp(obj, ['mediaItems'], []),
  minDurationMs: getProp(obj, ['minDurationMs'], '1s'),
})

export const newMediaV2Sound = (obj: any = null): MediaV2CommandDataSoundItem => ({
  type: 'sound',
  sound: newSoundMediaFile(obj?.sound),
})

export const newMediaV2Video = (obj: any = null): MediaV2CommandDataVideoItem => ({
  type: 'video',
  video: newMediaVideo(obj?.video),
  rectangle: getProp(obj, ['rectangle'], { x: 0, y: 0, width: 1, height: 1 }),
  rotation: getProp(obj, ['rotation'], 0),
  css: getProp(obj, ['css'], ''),
})

export const newMediaV2Image = (obj: any = null): MediaV2CommandDataImageItem => ({
  type: 'image',
  image: newMediaFile(obj?.image),
  imageUrl: getProp(obj, ['imageUrl'], ''),
  rectangle: getProp(obj, ['rectangle'], { x: 0, y: 0, width: 1, height: 1 }),
  rotation: getProp(obj, ['rotation'], 0),
  css: getProp(obj, ['css'], ''),
})

export const newMediaV2Text = (obj: any = null): MediaV2CommandDataTextItem => ({
  type: 'text',
  text: getProp(obj, ['text'], ''),
  font: getProp(obj, ['font'], ''),
  color: getProp(obj, ['color'], ''),
  outline: getProp(obj, ['outline'], ''),
  bold: getProp(obj, ['bold'], false),
  italic: getProp(obj, ['italic'], false),
  outlineWidth: getProp(obj, ['outlineWidth'], 0),
  rectangle: getProp(obj, ['rectangle'], { x: 0, y: 0, width: 1, height: 1 }),
  rotation: getProp(obj, ['rotation'], 0),
  css: getProp(obj, ['css'], ''),
})

export const newRoulette = (): RouletteCommandData => ({
  widgetIds: [],
  theme: 'default',
  entries: [],
  spinDurationMs: 15000,
  winnerDisplayDurationMs: 5000,
  startMessage: 'The wheel started spinning!',
  endMessage: 'The result of the wheel spin is "$entry.text"!',
})

export const newRouletteEntry = (): RouletteEntry => ({
  color: '#ffffff',
  text: '',
  weight: 1,
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
export const newGiftSubscribeTrigger = (): CommandTrigger => newTrigger(CommandTriggerType.GIFTSUB)
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

const createCommand = (cmd: Partial<AbstractCommand>): AbstractCommand => {
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
  [CommandAction.GENERAL]: {
    Name: () => 'command',
    Description: () => '',
    NewCommand: (): GeneralCommand => createCommand({
      triggers: [newCommandTrigger()],
      action: CommandAction.GENERAL,
    }) as GeneralCommand,
  },
  [CommandAction.SR_CURRENT]: {
    Name: () => 'sr_current',
    Description: () => 'Show what song is currently playing',
    NewCommand: (): SrCurrentCommand => createCommand({
      action: CommandAction.SR_CURRENT,
      triggers: [newCommandTrigger('!sr current', true)],
    }) as SrCurrentCommand,
  },
  [CommandAction.SR_UNDO]: {
    Name: () => 'sr_undo',
    Description: () => 'Remove the song that was last added by oneself.',
    NewCommand: (): SrUndoCommand => createCommand({
      action: CommandAction.SR_UNDO,
      triggers: [newCommandTrigger('!sr undo', true)],
    }) as SrUndoCommand,
  },
  [CommandAction.SR_GOOD]: {
    Name: () => 'sr_good',
    Description: () => 'Vote the current song up',
    NewCommand: (): SrGoodCommand => createCommand({
      action: CommandAction.SR_GOOD,
      triggers: [newCommandTrigger('!sr good', true)],
    }) as SrGoodCommand,
  },
  [CommandAction.SR_BAD]: {
    Name: () => 'sr_bad',
    Description: () => 'Vote the current song down',
    NewCommand: (): SrBadCommand => createCommand({
      action: CommandAction.SR_BAD,
      triggers: [newCommandTrigger('!sr bad', true)],
    }) as SrBadCommand,
  },
  [CommandAction.SR_STATS]: {
    Name: () => 'sr_stats',
    Description: () => 'Show stats about the playlist',
    NewCommand: (): SrStatsCommand => createCommand({
      action: CommandAction.SR_STATS,
      triggers: [newCommandTrigger('!sr stats', true), newCommandTrigger('!sr stat', true)],
    }) as SrStatsCommand,
  },
  [CommandAction.SR_PREV]: {
    Name: () => 'sr_prev',
    Description: () => 'Skip to the previous song',
    NewCommand: (): SrPrevCommand => createCommand({
      action: CommandAction.SR_PREV,
      triggers: [newCommandTrigger('!sr prev', true)],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }) as SrPrevCommand,
  },
  [CommandAction.SR_NEXT]: {
    Name: () => 'sr_next',
    Description: () => 'Skip to the next song',
    NewCommand: (): SrNextCommand => createCommand({
      action: CommandAction.SR_NEXT,
      triggers: [newCommandTrigger('!sr next', true), newCommandTrigger('!sr skip', true)],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }) as SrNextCommand,
  },
  [CommandAction.SR_JUMPTONEW]: {
    Name: () => 'sr_jumptonew',
    Description: () => 'Jump to the next unplayed song',
    NewCommand: (): SrJumptonewCommand => createCommand({
      action: CommandAction.SR_JUMPTONEW,
      triggers: [newCommandTrigger('!sr jumptonew', true)],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }) as SrJumptonewCommand,
  },
  [CommandAction.SR_CLEAR]: {
    Name: () => 'sr_clear',
    Description: () => 'Clear the playlist',
    NewCommand: (): SrClearCommand => createCommand({
      action: CommandAction.SR_CLEAR,
      triggers: [newCommandTrigger('!sr clear', true)],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }) as SrClearCommand,
  },
  [CommandAction.SR_RM]: {
    Name: () => 'sr_rm',
    Description: () => 'Remove the current song from the playlist',
    NewCommand: (): SrRmCommand => createCommand({
      action: CommandAction.SR_RM,
      triggers: [newCommandTrigger('!sr rm', true)],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }) as SrRmCommand,
  },
  [CommandAction.SR_SHUFFLE]: {
    Name: () => 'sr_shuffle',
    Description: () => `Shuffle the playlist (current song unaffected).
    <br />
    Non-played and played songs will be shuffled separately and non-played
    songs will be put after currently playing song.`,
    NewCommand: (): SrShuffleCommand => createCommand({
      action: CommandAction.SR_SHUFFLE,
      triggers: [newCommandTrigger('!sr shuffle', true)],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }) as SrShuffleCommand,
  },
  [CommandAction.SR_RESET_STATS]: {
    Name: () => 'sr_reset_stats',
    Description: () => 'Reset all statistics of all songs',
    NewCommand: (): SrResetStatsCommand => createCommand({
      action: CommandAction.SR_RESET_STATS,
      triggers: [newCommandTrigger('!sr resetStats', true)],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }) as SrResetStatsCommand,
  },
  [CommandAction.SR_LOOP]: {
    Name: () => 'sr_loop',
    Description: () => 'Loop the current song',
    NewCommand: (): SrLoopCommand => createCommand({
      action: CommandAction.SR_LOOP,
      triggers: [newCommandTrigger('!sr loop', true)],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }) as SrLoopCommand,
  },
  [CommandAction.SR_NOLOOP]: {
    Name: () => 'sr_noloop',
    Description: () => 'Stop looping the current song',
    NewCommand: (): SrNoloopCommand => createCommand({
      action: CommandAction.SR_NOLOOP,
      triggers: [newCommandTrigger('!sr noloop', true), newCommandTrigger('!sr unloop', true)],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }) as SrNoloopCommand,
  },
  [CommandAction.SR_PAUSE]: {
    Name: () => 'sr_pause',
    Description: () => 'Pause currently playing song',
    NewCommand: (): SrPauseCommand => createCommand({
      action: CommandAction.SR_PAUSE,
      triggers: [newCommandTrigger('!sr pause', true)],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }) as SrPauseCommand,
  },
  [CommandAction.SR_UNPAUSE]: {
    Name: () => 'sr_unpause',
    Description: () => 'Unpause currently paused song',
    NewCommand: (): SrUnpauseCommand => createCommand({
      action: CommandAction.SR_UNPAUSE,
      triggers: [newCommandTrigger('!sr nopause', true), newCommandTrigger('!sr unpause', true)],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }) as SrUnpauseCommand,
  },
  [CommandAction.SR_HIDEVIDEO]: {
    Name: () => 'sr_hidevideo',
    Description: () => 'Hide video for current song',
    NewCommand: (): SrHidevideoCommand => createCommand({
      action: CommandAction.SR_HIDEVIDEO,
      triggers: [newCommandTrigger('!sr hidevideo', true)],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }) as SrHidevideoCommand,
  },
  [CommandAction.SR_SHOWVIDEO]: {
    Name: () => 'sr_showvideo',
    Description: () => 'Show video for current song',
    NewCommand: (): SrShowvideoCommand => createCommand({
      action: CommandAction.SR_SHOWVIDEO,
      triggers: [newCommandTrigger('!sr showvideo', true)],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }) as SrShowvideoCommand,
  },
  [CommandAction.SR_REQUEST]: {
    Name: () => 'sr_request',
    Description: () => `
    Search for <code>&lt;SEARCH&gt;</code> (argument to this command)
    at youtube (by id or by title)
    and queue the first result in the playlist (after the first found
    batch of unplayed songs).`,
    NewCommand: (): SrRequestCommand => createCommand({
      action: CommandAction.SR_REQUEST,
      triggers: [newCommandTrigger('!sr')],
    }) as SrRequestCommand,
  },
  [CommandAction.SR_RE_REQUEST]: {
    Name: () => 'sr_re_request',
    Description: () => `
    Search for <code>&lt;SEARCH&gt;</code> (argument to this command)
    in the current playlist and queue the first result in the playlist
    (after the first found batch of unplayed songs).`,
    NewCommand: (): SrReRequestCommand => createCommand({
      action: CommandAction.SR_RE_REQUEST,
      triggers: [newCommandTrigger('!resr')],
    }) as SrReRequestCommand,
  },
  [CommandAction.SR_ADDTAG]: {
    Name: () => 'sr_addtag',
    Description: () => 'Add tag <code>&lt;TAG&gt;</code> (argument to this command) to the current song',
    NewCommand: (): SrAddtagCommand => createCommand({
      action: CommandAction.SR_ADDTAG,
      triggers: [newCommandTrigger('!sr tag'), newCommandTrigger('!sr addtag')],
      restrict: { active: true, to: MOD_OR_ABOVE },
      data: { tag: '' },
    }) as SrAddtagCommand,
  },
  [CommandAction.SR_RMTAG]: {
    Name: () => 'sr_rmtag',
    Description: () => 'Remove tag <code>&lt;TAG&gt;</code> (argument to this command) from the current song',
    NewCommand: (): SrRmtagCommand => createCommand({
      action: CommandAction.SR_RMTAG,
      triggers: [newCommandTrigger('!sr rmtag')],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }) as SrRmtagCommand,
  },
  [CommandAction.SR_VOLUME]: {
    Name: () => 'sr_volume',
    Description: () => `Sets the song request volume to <code>&lt;VOLUME&gt;</code> (argument to this command, min 0, max 100).
    <br />
    If no argument is given, just outputs the current volume`,
    NewCommand: (): SrVolumeCommand => createCommand({
      action: CommandAction.SR_VOLUME,
      triggers: [newCommandTrigger('!sr volume')],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }) as SrVolumeCommand,
  },
  [CommandAction.SR_FILTER]: {
    Name: () => 'sr_filter',
    Description: () => `Play only songs with the given tag <code>&lt;TAG&gt;</code> (argument to this command). If no tag
  is given, play all songs.`,
    NewCommand: (): SrFilterCommand => createCommand({
      action: CommandAction.SR_FILTER,
      triggers: [newCommandTrigger('!sr filter')],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }) as SrFilterCommand,
  },
  [CommandAction.SR_PRESET]: {
    Name: () => 'sr_preset',
    Description: () => `Switches to the preset <code>&lt;PRESET&gt;</code> (argument to this command) if it exists.
  If no arguments are given, outputs all available presets.`,
    NewCommand: (): SrPresetCommand => createCommand({
      action: CommandAction.SR_PRESET,
      triggers: [newCommandTrigger('!sr preset')],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }) as SrPresetCommand,
  },
  [CommandAction.SR_QUEUE]: {
    Name: () => 'sr_queue',
    Description: () => 'Shows the next 3 songs that will play.',
    NewCommand: (): SrQueueCommand => createCommand({
      action: CommandAction.SR_QUEUE,
      triggers: [newCommandTrigger('!sr queue')],
    }) as SrQueueCommand,
  },
  [CommandAction.SR_MOVE_TAG_UP]: {
    Name: () => 'sr_move_tag_up',
    Description: () => 'Moves songs with the tag to the beginning of the playlist.',
    NewCommand: (): SrMoveTagUpCommand => createCommand({
      action: CommandAction.SR_MOVE_TAG_UP,
      triggers: [newCommandTrigger('!sr movetagup')],
      restrict: { active: true, to: MOD_OR_ABOVE },
    }) as SrMoveTagUpCommand,
  },
}

export const possibleEffectActions = () => ([
  { type: CommandEffectType.CHAT, label: 'Add chat', title: CommandEffectType.CHAT },
  { type: CommandEffectType.MEDIA, label: 'Add media', title: CommandEffectType.MEDIA },
  // MEDIA_V2 DISABLED FOR PRODUCTION
  // { type: CommandEffectType.MEDIA_V2, label: 'Add media v2', title: CommandEffectType.MEDIA_V2 },
  { type: CommandEffectType.MEDIA_VOLUME, label: 'Add media volume', title: CommandEffectType.MEDIA_VOLUME },
  { type: CommandEffectType.EMOTES, label: 'Add emotes', title: CommandEffectType.EMOTES },
  { type: CommandEffectType.ROULETTE, label: 'Add roulette', title: CommandEffectType.ROULETTE },
  { type: CommandEffectType.SET_CHANNEL_TITLE, label: 'Add set_channel_title', title: CommandEffectType.SET_CHANNEL_TITLE },
  { type: CommandEffectType.SET_CHANNEL_GAME_ID, label: 'Add set_channel_game_id', title: CommandEffectType.SET_CHANNEL_GAME_ID },
  { type: CommandEffectType.CHATTERS, label: 'Add chatters', title: CommandEffectType.CHATTERS },
  { type: CommandEffectType.DICT_LOOKUP, label: 'Add dict_lookup', title: CommandEffectType.DICT_LOOKUP },
  { type: CommandEffectType.ADD_STREAM_TAGS, label: 'Add add_stream_tags', title: CommandEffectType.ADD_STREAM_TAGS },
  { type: CommandEffectType.REMOVE_STREAM_TAGS, label: 'Add remove_stream_tags', title: CommandEffectType.REMOVE_STREAM_TAGS },
  { type: CommandEffectType.COUNTDOWN, label: 'Add countdown', title: CommandEffectType.COUNTDOWN },
  { type: CommandEffectType.VARIABLE_CHANGE, label: 'Add variable_change', title: CommandEffectType.VARIABLE_CHANGE },
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
    case CommandEffectType.MEDIA_V2:
      return newMediaV2()
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
    case CommandEffectType.MEDIA_VOLUME:
      return {}
    case CommandEffectType.ROULETTE:
      return newRoulette()
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
