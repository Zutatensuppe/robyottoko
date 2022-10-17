import { ChatEffect, CommandEffectType, CommandVariableChange, VariableChangeEffect } from "../types"

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
    }
  }
}

export default {
  variableChangeToCommandEffect,
  textToCommandEffect,
}
