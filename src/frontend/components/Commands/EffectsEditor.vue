<template>
  <div>
    <table
      v-for="(item, idx) in val"
      :key="idx"
    >
      <TrVariableChangeEffect
        v-if="item.type === CommandEffectType.VARIABLE_CHANGE"
        v-model="val[idx]"
        :item-variables="itemVariables"
        :global-variables="globalVariables"
        @remove-click="onRmEffectClick(idx)"
      />
      <TrChatEffect
        v-if="item.type === CommandEffectType.CHAT"
        v-model="val[idx]"
        :item-variables="itemVariables"
        :global-variables="globalVariables"
        @remove-click="onRmEffectClick(idx)"
      />
    </table>

    <span
      class="button is-small"
      @click="addVariableChange"
    >Add variable change</span>
    <span
      class="button is-small"
      @click="addChat"
    >Add chat</span>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue';
import { CommandEffect, CommandEffectType, CommandVariable, GlobalVariable } from '../../../types';
import TrVariableChangeEffect from './Effects/TrVariableChangeEffect.vue';
import TrChatEffect from './Effects/TrChatEffect.vue';

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

const addVariableChange = () => {
  val.value.push({
    type: CommandEffectType.VARIABLE_CHANGE,
    data: {
      name: "",
      change: "set",
      value: "",
    },
  })
}
const addChat = () => {
  val.value.push({
    type: CommandEffectType.CHAT,
    data: {
      text: [''],
    },
  })
}

watch(val, (newValue: CommandEffect[]) => {
  emit('update:modelValue', newValue)
})
</script>
