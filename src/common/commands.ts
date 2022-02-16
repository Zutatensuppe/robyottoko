import { mustParseHumanDuration } from "../common/fn"
import { Command, CommandAction, CommandTrigger, CommandTriggerType, FunctionCommand, MediaCommandData } from "../types"
import { MOD_OR_ABOVE } from './permissions'

export const newText = () => ''

const newMedia = (): MediaCommandData => ({
  sound: {
    filename: '',
    file: '',
    urlpath: '',
    volume: 100,
  },
  image: {
    filename: '',
    file: '',
    urlpath: '',
  },
  minDurationMs: '1s',
})

export const newCountdownDelay = () => ({ type: "delay", value: "1s" })
export const newCountdownText = () => ({ type: "text", value: newText() })
export const newCountdownMedia = () => ({ type: "media", value: newMedia() })

export const newTrigger = (type: CommandTriggerType): CommandTrigger => ({
  type,
  data: {
    // for trigger type "command" (todo: should only exist if type is command, not always)
    command: '',
    commandExact: false, // true if the command must match exactly with the input

    // for trigger type "timer" (todo: should only exist if type is timer, not always)
    minInterval: 0, // duration in ms or something parsable (eg 1s, 10m, ....)
    minLines: 0,
  },
})

export const newRewardRedemptionTrigger = (command: string = ''): CommandTrigger => {
  const trigger = newTrigger('reward_redemption')
  trigger.data.command = command
  return trigger
}

export const newCommandTrigger = (command: string = '', commandExact: boolean = false): CommandTrigger => {
  const trigger = newTrigger('command')
  trigger.data.command = command
  trigger.data.commandExact = commandExact
  return trigger
}

export const commandHasTrigger = (
  command: FunctionCommand,
  trigger: CommandTrigger,
) => {
  for (const cmdTrigger of command.triggers) {
    if (cmdTrigger.type !== trigger.type) {
      continue
    }
    if (cmdTrigger.type === 'command') {
      if (cmdTrigger.data.command === trigger.data.command) {
        // no need to check for commandExact here (i think^^)
        return true
      }
    } else if (cmdTrigger.type === 'reward_redemption') {
      if (cmdTrigger.data.command === trigger.data.command) {
        return true
      }
    } else if (cmdTrigger.type === 'timer') {
      if (
        cmdTrigger.data.minInterval === trigger.data.minInterval
        && cmdTrigger.data.minLines === trigger.data.minLines
      ) {
        return true
      }
    }
  }
  return false
}

export const getUniqueCommandsByTrigger = (
  commands: FunctionCommand[],
  trigger: CommandTrigger,
) => {
  const tmp = commands.filter((command) => commandHasTrigger(command, trigger))
  return tmp.filter((item, i, ar) => ar.indexOf(item) === i)
}

export const isValidTrigger = (trigger: CommandTrigger) => {
  if (trigger.type === "command") {
    if (!trigger.data.command) {
      return false;
    }
    return true;
  }

  if (trigger.type === "timer") {
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
  add_stream_tags: {
    Name: () => "add_stream_tags command",
    Description: () => "Add streamtag",
    NewCommand: (): Command => ({
      triggers: [newCommandTrigger()],
      action: 'add_stream_tags',
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {
        tag: ''
      },
    }),
    RequiresAccessToken: () => true,
  },
  chatters: {
    Name: () => "chatters command",
    Description: () => "Outputs the people who chatted during the stream.",
    NewCommand: (): Command => ({
      triggers: [newCommandTrigger()],
      action: 'chatters',
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  countdown: {
    Name: () => "countdown",
    Description: () => "Add a countdown or messages spaced by time intervals.",
    NewCommand: (): Command => ({
      triggers: [newCommandTrigger()],
      action: 'countdown',
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: {
        steps: 3,
        interval: '1s',
        intro: 'Starting countdown...',
        outro: 'Done!'
      },
    }),
    RequiresAccessToken: () => false,
  },
  dict_lookup: {
    Name: () => "dictionary lookup",
    Description: () => "Outputs the translation for the searched word.",
    NewCommand: (): Command => ({
      triggers: [newCommandTrigger()],
      action: 'dict_lookup',
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: {
        lang: 'ja',
        phrase: '',
      },
    }),
    RequiresAccessToken: () => false,
  },
  madochan_createword: {
    Name: () => "madochan",
    Description: () => "Creates a word for a definition.",
    NewCommand: (): Command => ({
      triggers: [newCommandTrigger()],
      action: 'madochan_createword',
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: {
        // TODO: use from same resource as server
        model: '100epochs800lenhashingbidirectional.h5',
        weirdness: 1,
      },
    }),
    RequiresAccessToken: () => false,
  },
  media: {
    Name: () => "media command",
    Description: () => "Display an image and/or play a sound.",
    NewCommand: (): Command => ({
      triggers: [newCommandTrigger()],
      action: 'media',
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: newMedia(),
    }),
    RequiresAccessToken: () => false,
  },
  media_volume: {
    Name: () => "media volume command",
    Description: () => `Sets the media volume to <code>&lt;VOLUME&gt;</code> (argument to this command, min 0, max 100).
    <br />
    If no argument is given, just outputs the current volume`,
    NewCommand: (): Command => ({
      triggers: [newCommandTrigger()],
      action: 'media_volume',
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  text: {
    Name: () => "command",
    Description: () => "Send a message to chat",
    NewCommand: (): Command => ({
      triggers: [newCommandTrigger()],
      action: 'text',
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: {
        text: [newText()],
      },
    }),
    RequiresAccessToken: () => false,
  },
  remove_stream_tags: {
    Name: () => "remove_stream_tags command",
    Description: () => "Remove streamtag",
    NewCommand: (): Command => ({
      triggers: [newCommandTrigger()],
      action: 'remove_stream_tags',
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {
        tag: ''
      },
    }),
    RequiresAccessToken: () => true,
  },
  set_channel_game_id: {
    Name: () => "change stream category command",
    Description: () => "Change the stream category",
    NewCommand: (): Command => ({
      triggers: [newCommandTrigger()],
      action: 'set_channel_game_id',
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {
        game_id: ''
      },
    }),
    RequiresAccessToken: () => true,
  },
  set_channel_title: {
    Name: () => "change stream title command",
    Description: () => "Change the stream title",
    NewCommand: (): Command => ({
      triggers: [newCommandTrigger()],
      action: 'set_channel_title',
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {
        title: ''
      },
    }),
    RequiresAccessToken: () => true,
  },
  sr_current: {
    Name: () => "sr_current",
    Description: () => "Show what song is currently playing",
    NewCommand: (): Command => ({
      action: 'sr_current',
      triggers: [newCommandTrigger('!sr current', true)],
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_undo: {
    Name: () => "sr_undo",
    Description: () => "Remove the song that was last added by oneself.",
    NewCommand: (): Command => ({
      action: 'sr_undo',
      triggers: [newCommandTrigger('!sr undo', true)],
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_good: {
    Name: () => "sr_good",
    Description: () => "Vote the current song up",
    NewCommand: (): Command => ({
      action: 'sr_good',
      triggers: [newCommandTrigger('!sr good', true)],
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_bad: {
    Name: () => "sr_bad",
    Description: () => "Vote the current song down",
    NewCommand: (): Command => ({
      action: 'sr_bad',
      triggers: [newCommandTrigger('!sr bad', true)],
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_stats: {
    Name: () => "sr_stats",
    Description: () => "Show stats about the playlist",
    NewCommand: (): Command => ({
      action: 'sr_stats',
      triggers: [newCommandTrigger('!sr stats', true), newCommandTrigger('!sr stat', true)],
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_prev: {
    Name: () => "sr_prev",
    Description: () => "Skip to the previous song",
    NewCommand: (): Command => ({
      action: 'sr_prev',
      triggers: [newCommandTrigger('!sr prev', true)],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_next: {
    Name: () => "sr_next",
    Description: () => "Skip to the next song",
    NewCommand: (): Command => ({
      action: 'sr_next',
      triggers: [newCommandTrigger('!sr next', true), newCommandTrigger('!sr skip', true)],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_jumptonew: {
    Name: () => "sr_jumptonew",
    Description: () => "Jump to the next unplayed song",
    NewCommand: (): Command => ({
      action: 'sr_jumptonew',
      triggers: [newCommandTrigger('!sr jumptonew', true)],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_clear: {
    Name: () => "sr_clear",
    Description: () => "Clear the playlist",
    NewCommand: (): Command => ({
      action: 'sr_clear',
      triggers: [newCommandTrigger('!sr clear', true)],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_rm: {
    Name: () => "sr_rm",
    Description: () => "Remove the current song from the playlist",
    NewCommand: (): Command => ({
      action: 'sr_rm',
      triggers: [newCommandTrigger('!sr rm', true)],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
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
      action: 'sr_shuffle',
      triggers: [newCommandTrigger('!sr shuffle', true)],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_reset_stats: {
    Name: () => "sr_reset_stats",
    Description: () => "Reset all statistics of all songs",
    NewCommand: (): Command => ({
      action: 'sr_reset_stats',
      triggers: [newCommandTrigger('!sr resetStats', true)],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_loop: {
    Name: () => "sr_loop",
    Description: () => "Loop the current song",
    NewCommand: (): Command => ({
      action: 'sr_loop',
      triggers: [newCommandTrigger('!sr loop', true)],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_noloop: {
    Name: () => "sr_noloop",
    Description: () => "Stop looping the current song",
    NewCommand: (): Command => ({
      action: 'sr_noloop',
      triggers: [newCommandTrigger('!sr noloop', true), newCommandTrigger('!sr unloop', true)],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_pause: {
    Name: () => "sr_pause",
    Description: () => "Pause currently playing song",
    NewCommand: (): Command => ({
      action: 'sr_pause',
      triggers: [newCommandTrigger('!sr pause', true)],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_unpause: {
    Name: () => "sr_unpause",
    Description: () => "Unpause currently paused song",
    NewCommand: (): Command => ({
      action: 'sr_unpause',
      triggers: [newCommandTrigger('!sr nopause', true), newCommandTrigger('!sr unpause', true)],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_hidevideo: {
    Name: () => "sr_hidevideo",
    Description: () => "Hide video for current song",
    NewCommand: (): Command => ({
      action: 'sr_hidevideo',
      triggers: [newCommandTrigger('!sr hidevideo', true)],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_showvideo: {
    Name: () => "sr_showvideo",
    Description: () => "Show video for current song",
    NewCommand: (): Command => ({
      action: 'sr_showvideo',
      triggers: [newCommandTrigger('!sr showvideo', true)],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
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
      action: 'sr_request',
      triggers: [newCommandTrigger('!sr')],
      restrict_to: [],
      variables: [],
      variableChanges: [],
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
      action: 'sr_re_request',
      triggers: [newCommandTrigger('!resr')],
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_addtag: {
    Name: () => "sr_addtag",
    Description: () => "Add tag <code>&lt;TAG&gt;</code> (argument to this command) to the current song",
    NewCommand: (): Command => ({
      action: 'sr_addtag',
      triggers: [newCommandTrigger('!sr tag'), newCommandTrigger('!sr addtag')],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_rmtag: {
    Name: () => "sr_rmtag",
    Description: () => "Remove tag <code>&lt;TAG&gt;</code> (argument to this command) from the current song",
    NewCommand: (): Command => ({
      action: 'sr_rmtag',
      triggers: [newCommandTrigger('!sr rmtag')],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
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
      action: 'sr_volume',
      triggers: [newCommandTrigger('!sr volume')],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_filter: {
    Name: () => "sr_filter",
    Description: () => `Play only songs with the given tag <code>&lt;TAG&gt;</code> (argument to this command). If no tag
  is given, play all songs.`,
    NewCommand: (): Command => ({
      action: 'sr_filter',
      triggers: [newCommandTrigger('!sr filter')],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_preset: {
    Name: () => "sr_preset",
    Description: () => `Switches to the preset <code>&lt;PRESET&gt;</code> (argument to this command) if it exists.
  If no arguments are given, outputs all available presets.`,
    NewCommand: (): Command => ({
      action: 'sr_preset',
      triggers: [newCommandTrigger('!sr preset')],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
  sr_queue: {
    Name: () => "sr_queue",
    Description: () => `Shows the next 3 songs that will play.`,
    NewCommand: (): Command => ({
      action: 'sr_queue',
      triggers: [newCommandTrigger('!sr queue')],
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: {},
    }),
    RequiresAccessToken: () => false,
  },
}

export default {
  commands,
}
