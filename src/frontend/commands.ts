import { Command } from "../types"

const newTrigger = (type: string) => ({
  type,
  data: {
    // for trigger type "command" (todo: should only exist if type is command, not always)
    command: '',
    // for trigger type "timer" (todo: should only exist if type is timer, not always)
    minInterval: 0, // duration in ms or something parsable (eg 1s, 10m, ....)
    minLines: 0,
  },
})

const newText = () => ''

const newMedia = () => ({
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

const newCountdown = () => ({
  steps: 3,
  interval: '1s',
  intro: 'Starting countdown...',
  outro: 'Done!'
})

const newCmd = (type: string): Command | null => {
  switch (type) {
    case 'text': return {
      triggers: [newTrigger('command')],
      action: 'text',
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: {
        text: [newText()],
      },
    }
    case 'media': return {
      triggers: [newTrigger('command')],
      action: 'media',
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: newMedia(),
    }
    case 'countdown': return {
      triggers: [newTrigger('command')],
      action: 'countdown',
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: newCountdown(),
    }
    case 'jisho_org_lookup': return {
      triggers: [newTrigger('command')],
      action: 'jisho_org_lookup',
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: {},
    }
    case 'madochan_createword': return {
      triggers: [newTrigger('command')],
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
      triggers: [newTrigger('command')],
      action: 'chatters',
      restrict_to: [],
      variables: [],
      variableChanges: [],
      data: {},
    }
    default: return null
  }
}

export default {
  newTrigger,
  newText,
  newMedia,
  newCmd,
}
