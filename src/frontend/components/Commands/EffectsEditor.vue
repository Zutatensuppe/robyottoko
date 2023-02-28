<template>
  <div>
    <table class="table">
      <tr
        v-for="(item, idx) in val"
        :key="idx"
      >
        <td><code>{{ item.type }}</code></td>
        <td>
          <VariableChangeEffect
            v-if="item.type === CommandEffectType.VARIABLE_CHANGE"
            v-model="val[idx]"
            :item-variables="itemVariables"
            :global-variables="globalVariables"
          />
          <ChatEffect
            v-if="item.type === CommandEffectType.CHAT"
            v-model="val[idx]"
          />
          <DictLookupEffect
            v-if="item.type === CommandEffectType.DICT_LOOKUP"
            v-model="val[idx]"
          />
          <EmotesEffect
            v-if="item.type === CommandEffectType.EMOTES"
            v-model="val[idx]"
          />
          <MediaEffect
            v-if="item.type === CommandEffectType.MEDIA"
            v-model="val[idx]"
            :base-volume="baseVolume"
            :widget-url="widgetUrl"
          />
          <MadochanEffect
            v-if="item.type === CommandEffectType.MADOCHAN"
            v-model="val[idx]"
          />
          <SetChannelTitleEffect
            v-if="item.type === CommandEffectType.SET_CHANNEL_TITLE"
            v-model="val[idx]"
          />
          <SetChannelGameIdEffect
            v-if="item.type === CommandEffectType.SET_CHANNEL_GAME_ID"
            v-model="val[idx]"
          />
          <AddStreamTagsEffect
            v-if="item.type === CommandEffectType.ADD_STREAM_TAGS"
            v-model="val[idx]"
          />
          <RemoveStreamTagsEffect
            v-if="item.type === CommandEffectType.REMOVE_STREAM_TAGS"
            v-model="val[idx]"
          />
          <ChattersEffect
            v-if="item.type === CommandEffectType.CHATTERS"
            v-model="val[idx]"
          />
          <CountdownEffect
            v-if="item.type === CommandEffectType.COUNTDOWN"
            v-model="val[idx]"
            :base-volume="baseVolume"
          />
        </td>
        <td>
          <DoubleclickButton
            class="button is-small mr-1"
            message="Are you sure?"
            :timeout="1000"
            @doubleclick="onRmEffectClick(idx)"
          >
            <i class="fa fa-trash" />
          </DoubleclickButton>
        </td>
      </tr>
    </table>
  </div>
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
import DoubleclickButton from '../DoubleclickButton.vue'

export interface AutocompletableVariable {
  var: CommandVariable | GlobalVariable;
  type: string;
}

const props = defineProps<{
  modelValue: CommandEffectData[],
  itemVariables: CommandVariable[],
  globalVariables: GlobalVariable[],
  baseVolume: number,
  widgetUrl: string,
}>()

const val = ref<CommandEffectData[]>(props.modelValue)

const emit = defineEmits<{
  (e: 'update:modelValue', val: CommandEffectData[]): void
}>()

const onRmEffectClick = (idx: number) => {
  val.value = val.value.filter((_v, tmpIdx) => tmpIdx !== idx)
}

watch(val, (newValue: CommandEffectData[]) => {
  emit('update:modelValue', newValue)
})
</script>
