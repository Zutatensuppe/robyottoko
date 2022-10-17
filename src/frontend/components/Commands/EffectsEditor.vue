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
        @remove-click="onRmEffectClick(idx)"
      />
      <TrDictLookupEffect
        v-if="item.type === CommandEffectType.DICT_LOOKUP"
        v-model="val[idx]"
        @remove-click="onRmEffectClick(idx)"
      />
      <TrEmotesEffect
        v-if="item.type === CommandEffectType.EMOTES"
        v-model="val[idx]"
        @remove-click="onRmEffectClick(idx)"
      />
      <TrMediaEffect
        v-if="item.type === CommandEffectType.MEDIA"
        v-model="val[idx]"
        :base-volume="baseVolume"
        :widget-url="widgetUrl"
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
    <span
      class="button is-small"
      @click="addDictLookup"
    >Add dict lookup</span>
    <span
      class="button is-small"
      @click="addEmotes"
    >Add emotes</span>
    <span
      class="button is-small"
      @click="addMedia"
    >Add media</span>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue';
import { CommandEffect, CommandEffectType, CommandVariable, GlobalVariable } from '../../../types';
import TrVariableChangeEffect from './Effects/TrVariableChangeEffect.vue';
import TrChatEffect from './Effects/TrChatEffect.vue';
import TrDictLookupEffect from './Effects/TrDictLookupEffect.vue';
import TrEmotesEffect from './Effects/TrEmotesEffect.vue';
import TrMediaEffect from './Effects/TrMediaEffect.vue';
import { newMedia } from '../../../common/commands';

export interface AutocompletableVariable {
  var: CommandVariable | GlobalVariable;
  type: string;
}

const props = defineProps<{
  modelValue: CommandEffect[],
  itemVariables: CommandVariable[],
  globalVariables: GlobalVariable[],
  baseVolume: number,
  widgetUrl: string,
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
const addDictLookup = () => {
  val.value.push({
    type: CommandEffectType.DICT_LOOKUP,
    data: {
      lang: 'ja',
      phrase: '',
    },
  })
}
const addEmotes = () => {
  val.value.push({
    type: CommandEffectType.EMOTES,
    data: {
      displayFn: [],
      emotes: [],
    },
  })
}
const addMedia = () => {
  val.value.push({
    type: CommandEffectType.MEDIA,
    data: newMedia(),
  })
}

watch(val, (newValue: CommandEffect[]) => {
  emit('update:modelValue', newValue)
})
</script>
