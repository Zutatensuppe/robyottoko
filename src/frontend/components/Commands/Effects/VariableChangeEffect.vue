<template>
  <div>
    <table>
      <tr>
        <td>
          Name:
        </td>
        <td>
          Change:
        </td>
        <td>
          Value:
        </td>
      </tr>
      <tr>
        <td>
          <DropdownInput
            v-model="val.data.name"
            :values="autocompletableVariables().map(a => ({ value: a.var.name, label: `${a.var.name} (${a.type}), <code>${a.var.value}</code>` }))"
          />
        </td>
        <td>
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
        </td>
        <td>
          <StringInput v-model="val.data.value" />
        </td>
      </tr>
    </table>
  </div>
</template>
<script setup lang="ts">
import { VariableChangeEffect, CommandVariable, GlobalVariable } from '../../../../types';
import { AutocompletableVariable } from '../EffectsEditor.vue';
import StringInput from '../../StringInput.vue';
import DropdownInput from '../../DropdownInput.vue';
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: VariableChangeEffect,
  itemVariables: CommandVariable[],
  globalVariables: GlobalVariable[],
}>()

const val = ref<VariableChangeEffect>(props.modelValue)

const emit = defineEmits<{
  (e: 'update:modelValue', val: VariableChangeEffect): void
}>()

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
