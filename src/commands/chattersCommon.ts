import { Command } from "../types"
import { newCommandTrigger } from "../util"

export default {
  Name: () => "chatters command",
  Description: () => "Outputs the people who chatted during the stream.",
  NewCommand: (): Command => ({
    triggers: [newCommandTrigger()],
    action: 'chatters',
    restrict_to: [],
    variables: [],
    variableChanges: [],
    data: {},
  }),
}
