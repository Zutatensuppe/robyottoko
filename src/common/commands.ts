import { getProp, mustParseHumanDuration, nonce } from "../common/fn"
import {
  ChattersCommand,
  Command, CommandAction, CommandEffect, CommandTrigger, CommandTriggerType,
  CountdownAction, CountdownActionType, CountdownCommand, FunctionCommand,
  MediaCommandData, MediaFile, MediaVideo, MediaVolumeCommand, RandomTextCommand, SoundMediaFile,
} from "../types"
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

export const newCountdownDelay = (): CountdownAction => ({ type: CountdownActionType.DELAY, value: "1s" })
export const newCountdownText = (): CountdownAction => ({ type: CountdownActionType.TEXT, value: newText() })
export const newCountdownMedia = (): CountdownAction => ({ type: CountdownActionType.MEDIA, value: newMedia() })

export const newTrigger = (type: CommandTriggerType): CommandTrigger => ({
  type,
  data: {
    // for trigger type "command" (todo: should only exist if type is command, not always)
    command: '',
    commandExact: false, // true if the command must match exactly with the input

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
  trigger.data.command = command
  return trigger
}

export const newJsonDate = () => new Date().toJSON()
const newCommandId = () => nonce(10)

export const newCommandTrigger = (command: string = '', commandExact: boolean = false): CommandTrigger => {
  const trigger = newTrigger(CommandTriggerType.COMMAND)
  trigger.data.command = command
  trigger.data.commandExact = commandExact
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
    if (a.data.command === b.data.command) {
      // no need to check for commandExact here (i think^^)
      return true
    }
  } else if (a.type === CommandTriggerType.REWARD_REDEMPTION) {
    if (a.data.command === b.data.command) {
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

export const isValidEffect = (_effect: CommandEffect): boolean => {
  // TODO: check if effects are actually valid
  return true
}

export const isValidTrigger = (trigger: CommandTrigger): boolean => {
  if (trigger.type === CommandTriggerType.COMMAND) {
    if (!trigger.data.command) {
      return false;
    }
    return true;
  }

  if (trigger.type === CommandTriggerType.TIMER) {
    try {
      mustParseHumanDuration(trigger.data.minInterval);
    } catch (e) {
      return false;
    }
    const l = parseInt(`${trigger.data.minLines}`, 10);
    if (isNaN(l)) {
      return false;
    }
    return true;
  }

  return true;
}

interface CommandDef {
  Name: () => string
  Description: () => string
  NewCommand: () => Command
  RequiresAccessToken: () => boolean
}

export const commands: Record<CommandAction, CommandDef> = {
  chatters: {
    Name: () => "chatters command",
    Description: () => "Outputs the people who chatted during the stream.",
    NewCommand: (): ChattersCommand => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      triggers: [newCommandTrigger()],
      effects: [],
      action: CommandAction.CHATTERS,
      restrict_to: [],
      variables: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  countdown: {
    Name: () => "countdown",
    Description: () => "Add a countdown or messages spaced by time intervals.",
    NewCommand: (): CountdownCommand => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      triggers: [newCommandTrigger()],
      effects: [],
      action: CommandAction.COUNTDOWN,
      restrict_to: [],
      variables: [],
      data: {
        type: 'auto',
        step: '',
        steps: '3',
        interval: '1s',
        intro: 'Starting countdown...',
        outro: 'Done!',
        actions: [] as CountdownAction[]
      },
    }),
    RequiresAccessToken: () => false,
  },
  media_volume: {
    Name: () => "media volume command",
    Description: () => `Sets the media volume to <code>&lt;VOLUME&gt;</code> (argument to this command, min 0, max 100).
    <br />
    If no argument is given, just outputs the current volume`,
    NewCommand: (): MediaVolumeCommand => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      triggers: [newCommandTrigger()],
      effects: [],
      action: CommandAction.MEDIA_VOLUME,
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  text: {
    Name: () => "command",
    Description: () => "Send a message to chat",
    NewCommand: (): RandomTextCommand => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      triggers: [newCommandTrigger()],
      effects: [],
      action: CommandAction.TEXT,
      restrict_to: [],
      variables: [],
      data: {
        text: [newText()],
      },
    }),
    RequiresAccessToken: () => false,
  },
  sr_current: {
    Name: () => "sr_current",
    Description: () => "Show what song is currently playing",
    NewCommand: (): Command => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      action: CommandAction.SR_CURRENT,
      triggers: [newCommandTrigger('!sr current', true)],
      effects: [],
      restrict_to: [],
      variables: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_undo: {
    Name: () => "sr_undo",
    Description: () => "Remove the song that was last added by oneself.",
    NewCommand: (): Command => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      action: CommandAction.SR_UNDO,
      triggers: [newCommandTrigger('!sr undo', true)],
      effects: [],
      restrict_to: [],
      variables: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_good: {
    Name: () => "sr_good",
    Description: () => "Vote the current song up",
    NewCommand: (): Command => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      action: CommandAction.SR_GOOD,
      triggers: [newCommandTrigger('!sr good', true)],
      effects: [],
      restrict_to: [],
      variables: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_bad: {
    Name: () => "sr_bad",
    Description: () => "Vote the current song down",
    NewCommand: (): Command => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      action: CommandAction.SR_BAD,
      triggers: [newCommandTrigger('!sr bad', true)],
      effects: [],
      restrict_to: [],
      variables: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_stats: {
    Name: () => "sr_stats",
    Description: () => "Show stats about the playlist",
    NewCommand: (): Command => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      action: CommandAction.SR_STATS,
      triggers: [newCommandTrigger('!sr stats', true), newCommandTrigger('!sr stat', true)],
      effects: [],
      restrict_to: [],
      variables: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_prev: {
    Name: () => "sr_prev",
    Description: () => "Skip to the previous song",
    NewCommand: (): Command => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      action: CommandAction.SR_PREV,
      triggers: [newCommandTrigger('!sr prev', true)],
      effects: [],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_next: {
    Name: () => "sr_next",
    Description: () => "Skip to the next song",
    NewCommand: (): Command => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      action: CommandAction.SR_NEXT,
      triggers: [newCommandTrigger('!sr next', true), newCommandTrigger('!sr skip', true)],
      effects: [],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_jumptonew: {
    Name: () => "sr_jumptonew",
    Description: () => "Jump to the next unplayed song",
    NewCommand: (): Command => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      action: CommandAction.SR_JUMPTONEW,
      triggers: [newCommandTrigger('!sr jumptonew', true)],
      effects: [],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_clear: {
    Name: () => "sr_clear",
    Description: () => "Clear the playlist",
    NewCommand: (): Command => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      action: CommandAction.SR_CLEAR,
      triggers: [newCommandTrigger('!sr clear', true)],
      effects: [],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_rm: {
    Name: () => "sr_rm",
    Description: () => "Remove the current song from the playlist",
    NewCommand: (): Command => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      action: CommandAction.SR_RM,
      triggers: [newCommandTrigger('!sr rm', true)],
      effects: [],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_shuffle: {
    Name: () => "sr_shuffle",
    Description: () => `Shuffle the playlist (current song unaffected).
    <br />
    Non-played and played songs will be shuffled separately and non-played
    songs will be put after currently playing song.`,
    NewCommand: (): Command => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      action: CommandAction.SR_SHUFFLE,
      triggers: [newCommandTrigger('!sr shuffle', true)],
      effects: [],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_reset_stats: {
    Name: () => "sr_reset_stats",
    Description: () => "Reset all statistics of all songs",
    NewCommand: (): Command => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      action: CommandAction.SR_RESET_STATS,
      triggers: [newCommandTrigger('!sr resetStats', true)],
      effects: [],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_loop: {
    Name: () => "sr_loop",
    Description: () => "Loop the current song",
    NewCommand: (): Command => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      action: CommandAction.SR_LOOP,
      triggers: [newCommandTrigger('!sr loop', true)],
      effects: [],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_noloop: {
    Name: () => "sr_noloop",
    Description: () => "Stop looping the current song",
    NewCommand: (): Command => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      action: CommandAction.SR_NOLOOP,
      triggers: [newCommandTrigger('!sr noloop', true), newCommandTrigger('!sr unloop', true)],
      effects: [],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_pause: {
    Name: () => "sr_pause",
    Description: () => "Pause currently playing song",
    NewCommand: (): Command => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      action: CommandAction.SR_PAUSE,
      triggers: [newCommandTrigger('!sr pause', true)],
      effects: [],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_unpause: {
    Name: () => "sr_unpause",
    Description: () => "Unpause currently paused song",
    NewCommand: (): Command => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      action: CommandAction.SR_UNPAUSE,
      triggers: [newCommandTrigger('!sr nopause', true), newCommandTrigger('!sr unpause', true)],
      effects: [],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_hidevideo: {
    Name: () => "sr_hidevideo",
    Description: () => "Hide video for current song",
    NewCommand: (): Command => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      action: CommandAction.SR_HIDEVIDEO,
      triggers: [newCommandTrigger('!sr hidevideo', true)],
      effects: [],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_showvideo: {
    Name: () => "sr_showvideo",
    Description: () => "Show video for current song",
    NewCommand: (): Command => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      action: CommandAction.SR_SHOWVIDEO,
      triggers: [newCommandTrigger('!sr showvideo', true)],
      effects: [],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_request: {
    Name: () => "sr_request",
    Description: () => `
    Search for <code>&lt;SEARCH&gt;</code> (argument to this command)
    at youtube (by id or by title)
    and queue the first result in the playlist (after the first found
    batch of unplayed songs).`,
    NewCommand: (): Command => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      action: CommandAction.SR_REQUEST,
      triggers: [newCommandTrigger('!sr')],
      effects: [],
      restrict_to: [],
      variables: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_re_request: {
    Name: () => "sr_re_request",
    Description: () => `
    Search for <code>&lt;SEARCH&gt;</code> (argument to this command)
    in the current playlist and queue the first result in the playlist
    (after the first found batch of unplayed songs).`,
    NewCommand: (): Command => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      action: CommandAction.SR_RE_REQUEST,
      triggers: [newCommandTrigger('!resr')],
      effects: [],
      restrict_to: [],
      variables: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_addtag: {
    Name: () => "sr_addtag",
    Description: () => "Add tag <code>&lt;TAG&gt;</code> (argument to this command) to the current song",
    NewCommand: (): Command => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      action: CommandAction.SR_ADDTAG,
      triggers: [newCommandTrigger('!sr tag'), newCommandTrigger('!sr addtag')],
      effects: [],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      data: {
        tag: "",
      },
    }),
    RequiresAccessToken: () => false,
  },
  sr_rmtag: {
    Name: () => "sr_rmtag",
    Description: () => "Remove tag <code>&lt;TAG&gt;</code> (argument to this command) from the current song",
    NewCommand: (): Command => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      action: CommandAction.SR_RMTAG,
      triggers: [newCommandTrigger('!sr rmtag')],
      effects: [],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_volume: {
    Name: () => "sr_volume",
    Description: () => `Sets the song request volume to <code>&lt;VOLUME&gt;</code> (argument to this command, min 0, max 100).
    <br />
    If no argument is given, just outputs the current volume`,
    NewCommand: (): Command => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      action: CommandAction.SR_VOLUME,
      triggers: [newCommandTrigger('!sr volume')],
      effects: [],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_filter: {
    Name: () => "sr_filter",
    Description: () => `Play only songs with the given tag <code>&lt;TAG&gt;</code> (argument to this command). If no tag
  is given, play all songs.`,
    NewCommand: (): Command => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      action: CommandAction.SR_FILTER,
      triggers: [newCommandTrigger('!sr filter')],
      effects: [],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_preset: {
    Name: () => "sr_preset",
    Description: () => `Switches to the preset <code>&lt;PRESET&gt;</code> (argument to this command) if it exists.
  If no arguments are given, outputs all available presets.`,
    NewCommand: (): Command => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      action: CommandAction.SR_PRESET,
      triggers: [newCommandTrigger('!sr preset')],
      effects: [],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_queue: {
    Name: () => "sr_queue",
    Description: () => `Shows the next 3 songs that will play.`,
    NewCommand: (): Command => ({
      id: newCommandId(),
      createdAt: newJsonDate(),
      action: CommandAction.SR_QUEUE,
      triggers: [newCommandTrigger('!sr queue')],
      effects: [],
      restrict_to: [],
      variables: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
}

export default {
  commands,
}
