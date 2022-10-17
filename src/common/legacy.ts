import { ChatEffect, CommandEffectType, CommandVariableChange, DictLookupEffect, EmotesEffect, VariableChangeEffect } from "../types"

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

const emotesToCommandEffect = (cmd: any): EmotesEffect => {
  return {
    type: CommandEffectType.EMOTES,
    data: {
      displayFn: cmd.data.displayFn,
      emotes: cmd.data.emotes,
    },
  }
}

export default {
  dictLookupToCommandEffect,
  emotesToCommandEffect,
  textToCommandEffect,
  variableChangeToCommandEffect,
}
