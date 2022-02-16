import { Command } from "../types"
import { newCommandTrigger, newText } from "../util"

export default {
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
}
