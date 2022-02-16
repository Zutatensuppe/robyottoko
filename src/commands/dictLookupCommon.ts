import { Command } from "../types"
import { newCommandTrigger } from "../util"

export default {
  Name: () => "dictionary lookup",
  Description: () => "Outputs the translation for the searched word.",
  NewCommand: (): Command => ({
    triggers: [newCommandTrigger()],
    action: 'dict_lookup',
    restrict_to: [],
    variables: [],
    variableChanges: [],
    data: {
      lang: 'ja',
      phrase: '',
    },
  }),
}
