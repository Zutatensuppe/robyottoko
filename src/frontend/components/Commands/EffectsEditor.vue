<template>
  <div>
    <table
      v-for="(item, idx) in modelValue"
      :key="idx"
    >
      <tr v-if="item.type === CommandEffectType.VARIABLE_CHANGE">
        <td>Variable change:</td>
        <td>
          Name:
          <dropdown-input
            v-model="item.data.name"
            :values="autocompletableVariables().map(a => ({ value: a.var.name, label: `${a.var.name} (${a.type}), <code>${a.var.value}</code>` }))"
          />
          Change:
          <div class="select is-small">
            <select v-model="item.data.change">
              <option value="set">
                set
              </option>
              <option value="increase_by">
                increase by
              </option>
              <option value="decrease_by">
                decrease by
              </option>
            </select>
          </div>
          Value:
          <StringInput v-model="item.data.value" />

          <button
            class="button is-small"
            @click="onRmEffectClick(idx)"
          >
            <i class="fa fa-remove" />
          </button>
        </td>
      </tr>
    </table>

    <span
      class="button is-small"
      @click="onAddEffectClick"
    >Add Variable Change</span>
    <div class="help">
      Variable changes are performed when the command is executed,
      before anything else.
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue';
import { CommandEffect, CommandEffectType, CommandVariable, GlobalVariable } from '../../../types';
import StringInput from '../StringInput.vue';

export interface AutocompletableVariable {
  var: CommandVariable | GlobalVariable;
  type: string;
}

const props = defineProps<{
  modelValue: CommandEffect[],
  itemVariables: CommandVariable[],
  globalVariables: GlobalVariable[],
}>()

const val = ref<CommandEffect[]>(props.modelValue)

const emit = defineEmits(['update:modelValue'])

const onRmEffectClick = (idx: number) => {
  val.value = val.value.filter((_v, tmpIdx) => tmpIdx !== idx)
}

const onAddEffectClick = () => {
  val.value.push({
    type: CommandEffectType.VARIABLE_CHANGE,
    data: {
      name: "",
      change: "set",
      value: "",
    }
  });
}

const autocompletableVariables = (): AutocompletableVariable[] => {
  const variables: AutocompletableVariable[] = props.itemVariables.slice().map((localVar: CommandVariable) => {
    return {
      var: localVar,
      type: "local",
    }
  })
  props.globalVariables.forEach((globalVar: GlobalVariable) => {
    if (!variables.find((localVar) => localVar.var.name === globalVar.name)) {
      variables.push({
        var: globalVar,
        type: "global",
      })
    }
  })
  return variables
}

watch(val, (newValue: CommandEffect[]) => {
  emit('update:modelValue', newValue)
})
</script>
