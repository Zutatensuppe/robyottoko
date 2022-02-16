import { Command } from "../types"
import { newCommandTrigger } from "../util"

export default {
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
}
