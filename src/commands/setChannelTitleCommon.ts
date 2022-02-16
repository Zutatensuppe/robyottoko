import { Command } from "../types"
import { MOD_OR_ABOVE, newCommandTrigger } from "../util"

export default {
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
}
