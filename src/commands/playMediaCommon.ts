import { Command } from "../types"
import { newCommandTrigger, newMedia } from "../util"

export default {
  Name: () => "media command",
  Description: () => "Display an image and/or play a sound.",
  NewCommand: (): Command => ({
    triggers: [newCommandTrigger()],
    action: 'media',
    restrict_to: [],
    variables: [],
    variableChanges: [],
    data: newMedia(),
  }),
}
