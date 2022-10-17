<template>
  <tr>
    <td>
      Variable change:
      <div>
        Name:
        <dropdown-input
          v-model="val.data.name"
          :values="autocompletableVariables().map(a => ({ value: a.var.name, label: `${a.var.name} (${a.type}), <code>${a.var.value}</code>` }))"
        />
        Change:
        <div class="select is-small">
          <select v-model="val.data.change">
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
        <StringInput v-model="val.data.value" />
      </div>
      <button
        class="button is-small"
        @click="emit('removeClick')"
      >
        <i class="fa fa-remove" />
      </button>
    </td>
  </tr>
</template>
<script setup lang="ts">
import { VariableChangeEffect, CommandVariable, GlobalVariable } from '../../../../types';
import { AutocompletableVariable } from '../EffectsEditor.vue';
import StringInput from '../../StringInput.vue';
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: VariableChangeEffect,
  itemVariables: CommandVariable[],
  globalVariables: GlobalVariable[],
}>()

const val = ref<VariableChangeEffect>(props.modelValue)

const emit = defineEmits(['update:modelValue', 'removeClick'])

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

watch(val, (newValue: VariableChangeEffect) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
