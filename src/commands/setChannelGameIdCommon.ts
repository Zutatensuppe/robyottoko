import { Command } from "../types"
import { MOD_OR_ABOVE, newCommandTrigger } from "../util"

export default {
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
}
