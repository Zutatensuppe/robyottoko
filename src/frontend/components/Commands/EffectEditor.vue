<template>
  <VariableChangeEffect
    v-if="val.type === CommandEffectType.VARIABLE_CHANGE"
    v-model="val"
    :item-variables="itemVariables"
    :global-variables="globalVariables"
  />
  <ChatEffect
    v-else-if="val.type === CommandEffectType.CHAT"
    v-model="val"
  />
  <DictLookupEffect
    v-else-if="val.type === CommandEffectType.DICT_LOOKUP"
    v-model="val"
  />
  <EmotesEffect
    v-else-if="val.type === CommandEffectType.EMOTES"
    v-model="val"
  />
  <MediaEffect
    v-else-if="val.type === CommandEffectType.MEDIA"
    v-model="val"
    :base-volume="baseVolume"
    :widget-url="mediaWidgetUrl"
  />
  <MadochanEffect
    v-else-if="val.type === CommandEffectType.MADOCHAN"
    v-model="val"
  />
  <SetChannelTitleEffect
    v-else-if="val.type === CommandEffectType.SET_CHANNEL_TITLE"
    v-model="val"
  />
  <SetChannelGameIdEffect
    v-else-if="val.type === CommandEffectType.SET_CHANNEL_GAME_ID"
    v-model="val"
  />
  <AddStreamTagsEffect
    v-else-if="val.type === CommandEffectType.ADD_STREAM_TAGS"
    v-model="val"
  />
  <RemoveStreamTagsEffect
    v-else-if="val.type === CommandEffectType.REMOVE_STREAM_TAGS"
    v-model="val"
  />
  <ChattersEffect
    v-else-if="val.type === CommandEffectType.CHATTERS"
    v-model="val"
  />
  <CountdownEffect
    v-else-if="val.type === CommandEffectType.COUNTDOWN"
    v-model="val"
    :base-volume="baseVolume"
  />
  <RouletteEffect
    v-else-if="val.type === CommandEffectType.ROULETTE"
    v-model="val"
    :widget-url="rouletteWidgetUrl"
  />
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { CommandEffectData, CommandEffectType, CommandVariable, GlobalVariable } from '../../../types'
import VariableChangeEffect from './Effects/VariableChangeEffect.vue'
import ChatEffect from './Effects/ChatEffect.vue'
import DictLookupEffect from './Effects/DictLookupEffect.vue'
import EmotesEffect from './Effects/EmotesEffect.vue'
import MediaEffect from './Effects/MediaEffect.vue'
import MadochanEffect from './Effects/MadochanEffect.vue'
import SetChannelTitleEffect from './Effects/SetChannelTitleEffect.vue'
import SetChannelGameIdEffect from './Effects/SetChannelGameIdEffect.vue'
import AddStreamTagsEffect from './Effects/AddStreamTagsEffect.vue'
import RemoveStreamTagsEffect from './Effects/RemoveStreamTagsEffect.vue'
import ChattersEffect from './Effects/ChattersEffect.vue'
import CountdownEffect from './Effects/CountdownEffect.vue'
import RouletteEffect from './Effects/RouletteEffect.vue'

export interface AutocompletableVariable {
  var: CommandVariable | GlobalVariable;
  type: string;
}

const props = defineProps<{
  modelValue: CommandEffectData,
  itemVariables: CommandVariable[],
  globalVariables: GlobalVariable[],
  baseVolume: number,
  mediaWidgetUrl: string,
  rouletteWidgetUrl: string,
}>()

const val = ref<CommandEffectData>(props.modelValue)

const emit = defineEmits<{
  (e: 'update:modelValue', val: CommandEffectData): void
}>()

watch(val, (newValue: CommandEffectData) => {
  emit('update:modelValue', newValue)
})
</script>
