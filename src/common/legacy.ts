import { ChatEffect, CommandEffectType, CommandVariableChange, DictLookupEffect, VariableChangeEffect } from "../types"

const variableChangeToCommandEffect = (variableChange: CommandVariableChange): VariableChangeEffect => {
  return {
    type: CommandEffectType.VARIABLE_CHANGE,
    data: variableChange,
  }
}

const textToCommandEffect = (cmd: any): ChatEffect => {
  return {
    type: CommandEffectType.CHAT,
    data: {
      text: !Array.isArray(cmd.data.text) ? [cmd.data.text] : cmd.data.text
    },
  }
}

const dictLookupToCommandEffect = (cmd: any): DictLookupEffect => {
  return {
    type: CommandEffectType.DICT_LOOKUP,
    data: {
      lang: cmd.data.lang,
      phrase: cmd.data.phrase,
    },
  }
}

export default {
  dictLookupToCommandEffect,
  textToCommandEffect,
  variableChangeToCommandEffect,
}
