import { Command } from "../types"
import { MOD_OR_ABOVE, newCommandTrigger } from "../util"

export default {
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
}
