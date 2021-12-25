import { Command, CommandTrigger, CommandTriggerType, FunctionCommand, MediaCommandData } from "./types"

export const newText = () => ''

export const newMedia = (): MediaCommandData => ({
  sound: {
    filename: '',
    file: '',
    volume: 100,
  },
  image: {
    filename: '',
    file: '',
  },
  minDurationMs: '1s',
})

export const newCountdown = () => ({
  steps: 3,
  interval: '1s',
  intro: 'Starting countdown...',
  outro: 'Done!'
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


export const newCmd = (type: string): Command | null => {
  switch (type) {
    case 'text': return {
      triggers: [newCommandTrigger()],
      action: 'text',
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: {
        text: [newText()],
      },
    }
    case 'media': return {
      triggers: [newCommandTrigger()],
      action: 'media',
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: newMedia(),
    }
    case 'countdown': return {
      triggers: [newCommandTrigger()],
      action: 'countdown',
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: newCountdown(),
    }
    case 'dict_lookup': return {
      triggers: [newCommandTrigger()],
      action: 'dict_lookup',
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: {
        lang: 'ja',
        phrase: '',
      },
    }
    case 'madochan_createword': return {
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
    }
    case 'chatters': return {
      triggers: [newCommandTrigger()],
      action: 'chatters',
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
