import addStreamTagsCommon from "./commands/addStreamTagsCommon"
import chattersCommon from "./commands/chattersCommon"
import countdownCommon from "./commands/countdownCommon"
import dictLookupCommon from "./commands/dictLookupCommon"
import madochanCreateWordCommon from "./commands/madochanCreateWordCommon"
import playMediaCommon from "./commands/playMediaCommon"
import randomTextCommon from "./commands/randomTextCommon"
import removeStreamTagsCommon from "./commands/removeStreamTagsCommon"
import setChannelGameIdCommon from "./commands/setChannelGameIdCommon"
import setChannelTitleCommon from "./commands/setChannelTitleCommon"
import { Command, CommandTrigger, CommandRestrict, CommandTriggerType, FunctionCommand, MediaCommandData, CommandAction } from "./types"

export const MOD_OR_ABOVE: CommandRestrict[] = ["mod", "broadcaster"]

export const newText = () => ''

export const newMedia = (): MediaCommandData => ({
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

export const ACTION_DESCRIPTION_MAP: Record<CommandAction, string> = {
  dict_lookup: dictLookupCommon.Description(),
  madochan_createword: madochanCreateWordCommon.Description(),
  chatters: chattersCommon.Description(),
  media: playMediaCommon.Description(),
  media_volume: `Sets the media volume to <code>&lt;VOLUME&gt;</code> (argument to this command, min 0, max 100).
  <br />
  If no argument is given, just outputs the current volume`,
  countdown: countdownCommon.Description(),
  text: randomTextCommon.Description(),
  set_channel_title: setChannelTitleCommon.Description(),
  set_channel_game_id: setChannelGameIdCommon.Description(),
  add_stream_tags: addStreamTagsCommon.Description(),
  remove_stream_tags: removeStreamTagsCommon.Description(),
  sr_current: "Show what song is currently playing",
  sr_undo: "Remove the song that was last added by oneself.",
  sr_good: "Vote the current song up",
  sr_bad: "Vote the current song down",
  sr_stats: "Show stats about the playlist",
  sr_prev: "Skip to the previous song",
  sr_next: "Skip to the next song",
  sr_jumptonew: "Jump to the next unplayed song",
  sr_clear: "Clear the playlist",
  sr_rm: "Remove the current song from the playlist",
  sr_shuffle: `Shuffle the playlist (current song unaffected).
    <br />
    Non-played and played songs will be shuffled separately and non-played
    songs will be put after currently playing song.`,
  sr_reset_stats: "Reset all statistics of all songs",
  sr_loop: "Loop the current song",
  sr_noloop: "Stop looping the current song",
  sr_pause: "Pause currently playing song",
  sr_unpause: "Unpause currently paused song",
  sr_hidevideo: "Hide video for current song",
  sr_showvideo: "Show video for current song",
  sr_request: `
  Search for <code>&lt;SEARCH&gt;</code> (argument to this command)
  at youtube (by id or by title)
  and queue the first result in the playlist (after the first found
  batch of unplayed songs).`,
  sr_re_request: `
  Search for <code>&lt;SEARCH&gt;</code> (argument to this command)
  in the current playlist and queue the first result in the playlist
  (after the first found batch of unplayed songs).`,
  sr_addtag: "Add tag <code>&lt;TAG&gt;</code> (argument to this command) to the current song",
  sr_rmtag: "Remove tag <code>&lt;TAG&gt;</code> (argument to this command) from the current song",
  sr_volume: `Sets the song request volume to <code>&lt;VOLUME&gt;</code> (argument to this command, min 0, max 100).
  <br />
  If no argument is given, just outputs the current volume`,
  sr_filter: `Play only songs with the given tag <code>&lt;TAG&gt;</code> (argument to this command). If no tag
  is given, play all songs.`,
  sr_preset: `Switches to the preset <code>&lt;PRESET&gt;</code> (argument to this command) if it exists.
  If no arguments are given, outputs all available presets.`,
  sr_queue: `Shows the next 3 songs that will play.`,
}

export const ACTION_NAME_MAP: Record<CommandAction, string> = {
  dict_lookup: dictLookupCommon.Name(),
  madochan_createword: madochanCreateWordCommon.Name(),
  chatters: chattersCommon.Name(),
  media: playMediaCommon.Name(),
  media_volume: "media volume command",
  countdown: countdownCommon.Name(),
  text: randomTextCommon.Name(),
  set_channel_title: setChannelTitleCommon.Name(),
  set_channel_game_id: setChannelGameIdCommon.Name(),
  add_stream_tags: addStreamTagsCommon.Name(),
  remove_stream_tags: removeStreamTagsCommon.Name(),
  sr_current: "sr_current",
  sr_undo: "sr_undo",
  sr_good: "sr_good",
  sr_bad: "sr_bad",
  sr_stats: "sr_stats",
  sr_prev: "sr_prev",
  sr_next: "sr_next",
  sr_jumptonew: "sr_jumptonew",
  sr_clear: "sr_clear",
  sr_rm: "sr_rm",
  sr_shuffle: "sr_shuffle",
  sr_reset_stats: "sr_reset_stats",
  sr_loop: "sr_loop",
  sr_noloop: "sr_noloop",
  sr_pause: "sr_pause",
  sr_unpause: "sr_unpause",
  sr_hidevideo: "sr_hidevideo",
  sr_showvideo: "sr_showvideo",
  sr_request: "sr_request",
  sr_re_request: "sr_re_request",
  sr_addtag: "sr_addtag",
  sr_rmtag: "sr_rmtag",
  sr_volume: "sr_volume",
  sr_filter: "sr_filter",
  sr_preset: "sr_preset",
  sr_queue: "sr_queue",
}

export const newCmd = (type: string): Command | null => {
  switch (type) {
    // GENERAL
    case 'text': return randomTextCommon.NewCommand()
    case 'media': return playMediaCommon.NewCommand()
    case 'media_volume': return {
      triggers: [newCommandTrigger()],
      action: 'media_volume',
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }
    case 'countdown': return countdownCommon.NewCommand()
    case 'dict_lookup': return dictLookupCommon.NewCommand()
    case 'madochan_createword': return madochanCreateWordCommon.NewCommand()
    case 'chatters': return chattersCommon.NewCommand()
    case 'set_channel_title': return setChannelTitleCommon.NewCommand()
    case 'set_channel_game_id': return setChannelGameIdCommon.NewCommand()
    case "add_stream_tags": return addStreamTagsCommon.NewCommand()
    case "remove_stream_tags": return removeStreamTagsCommon.NewCommand()

    // SONG REQUEST
    case 'sr_current': return {
      action: 'sr_current',
      triggers: [newCommandTrigger('!sr current', true)],
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: {},
    }
    case 'sr_undo': return {
      action: 'sr_undo',
      triggers: [newCommandTrigger('!sr undo', true)],
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: {},
    }
    case 'sr_good': return {
      action: 'sr_good',
      triggers: [newCommandTrigger('!sr good', true)],
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: {},
    }
    case 'sr_bad': return {
      action: 'sr_bad',
      triggers: [newCommandTrigger('!sr bad', true)],
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: {},
    }
    case 'sr_stats': return {
      action: 'sr_stats',
      triggers: [newCommandTrigger('!sr stats', true), newCommandTrigger('!sr stat', true)],
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: {},
    }
    case 'sr_prev': return {
      action: 'sr_prev',
      triggers: [newCommandTrigger('!sr prev', true)],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }
    case 'sr_next': return {
      action: 'sr_next',
      triggers: [newCommandTrigger('!sr next', true), newCommandTrigger('!sr skip', true)],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }
    case 'sr_jumptonew': return {
      action: 'sr_jumptonew',
      triggers: [newCommandTrigger('!sr jumptonew', true)],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }
    case 'sr_clear': return {
      action: 'sr_clear',
      triggers: [newCommandTrigger('!sr clear', true)],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }
    case 'sr_rm': return {
      action: 'sr_rm',
      triggers: [newCommandTrigger('!sr rm', true)],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }
    case 'sr_shuffle': return {
      action: 'sr_shuffle',
      triggers: [newCommandTrigger('!sr shuffle', true)],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }
    case 'sr_reset_stats': return {
      action: 'sr_reset_stats',
      triggers: [newCommandTrigger('!sr resetStats', true)],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }
    case 'sr_loop': return {
      action: 'sr_loop',
      triggers: [newCommandTrigger('!sr loop', true)],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }
    case 'sr_noloop': return {
      action: 'sr_noloop',
      triggers: [newCommandTrigger('!sr noloop', true), newCommandTrigger('!sr unloop', true)],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }
    case 'sr_pause': return {
      action: 'sr_pause',
      triggers: [newCommandTrigger('!sr pause', true)],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }
    case 'sr_unpause': return {
      action: 'sr_unpause',
      triggers: [newCommandTrigger('!sr nopause', true), newCommandTrigger('!sr unpause', true)],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }
    case 'sr_hidevideo': return {
      action: 'sr_hidevideo',
      triggers: [newCommandTrigger('!sr hidevideo', true)],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }
    case 'sr_showvideo': return {
      action: 'sr_showvideo',
      triggers: [newCommandTrigger('!sr showvideo', true)],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }
    case 'sr_request': return {
      action: 'sr_request',
      triggers: [newCommandTrigger('!sr')],
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: {},
    }
    case 'sr_re_request': return {
      action: 'sr_re_request',
      triggers: [newCommandTrigger('!resr')],
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: {},
    }
    case 'sr_addtag': return {
      action: 'sr_addtag',
      triggers: [newCommandTrigger('!sr tag'), newCommandTrigger('!sr addtag')],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }
    case 'sr_rmtag': return {
      action: 'sr_rmtag',
      triggers: [newCommandTrigger('!sr rmtag')],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }
    case 'sr_volume': return {
      action: 'sr_volume',
      triggers: [newCommandTrigger('!sr volume')],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }
    case 'sr_filter': return {
      action: 'sr_filter',
      triggers: [newCommandTrigger('!sr filter')],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }
    case 'sr_preset': return {
      action: 'sr_preset',
      triggers: [newCommandTrigger('!sr preset')],
      restrict_to: MOD_OR_ABOVE,
      variables: [],
      variableChanges: [],
      data: {},
    }
    case 'sr_queue': return {
      action: 'sr_queue',
      triggers: [newCommandTrigger('!sr queue')],
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: {},
    }
    default: return null
  }
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
