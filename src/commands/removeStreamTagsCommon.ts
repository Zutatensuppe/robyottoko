import { Command } from "../types"
import { MOD_OR_ABOVE, newCommandTrigger } from "../util"

export default {
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
}
