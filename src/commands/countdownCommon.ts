import { Command } from "../types"
import { newCommandTrigger } from "../util"

export default {
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
}
