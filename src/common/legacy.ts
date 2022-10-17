import { CommandEffect, CommandEffectType, CommandVariableChange } from "../types"


// LEGACY CLEANUP
const variableChangeToCommandEffect = (variableChange: CommandVariableChange): CommandEffect => {
  return {
    type: CommandEffectType.VARIABLE_CHANGE,
    data: variableChange,
  }
}


export default {
  variableChangeToCommandEffect
}
