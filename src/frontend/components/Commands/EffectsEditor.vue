<template>
  <div>
    <table class="table">
      <tr
        v-for="(item, idx) in val"
        :key="idx"
      >
        <td><code>{{ item.type }}</code></td>
        <td>
          <TrVariableChangeEffect
            v-if="item.type === CommandEffectType.VARIABLE_CHANGE"
            v-model="val[idx]"
            :item-variables="itemVariables"
            :global-variables="globalVariables"
          />
          <TrChatEffect
            v-if="item.type === CommandEffectType.CHAT"
            v-model="val[idx]"
          />
          <TrDictLookupEffect
            v-if="item.type === CommandEffectType.DICT_LOOKUP"
            v-model="val[idx]"
          />
          <TrEmotesEffect
            v-if="item.type === CommandEffectType.EMOTES"
            v-model="val[idx]"
          />
          <TrMediaEffect
            v-if="item.type === CommandEffectType.MEDIA"
            v-model="val[idx]"
            :base-volume="baseVolume"
            :widget-url="widgetUrl"
          />
          <TrMadochanEffect
            v-if="item.type === CommandEffectType.MADOCHAN"
            v-model="val[idx]"
          />
          <TrSetChannelTitleEffect
            v-if="item.type === CommandEffectType.SET_CHANNEL_TITLE"
            v-model="val[idx]"
          />
          <TrSetChannelGameIdEffect
            v-if="item.type === CommandEffectType.SET_CHANNEL_GAME_ID"
            v-model="val[idx]"
          />
          <TrAddStreamTagsEffect
            v-if="item.type === CommandEffectType.ADD_STREAM_TAGS"
            v-model="val[idx]"
          />
          <TrRemoveStreamTagsEffect
            v-if="item.type === CommandEffectType.REMOVE_STREAM_TAGS"
            v-model="val[idx]"
          />
          <TrChattersEffect
            v-if="item.type === CommandEffectType.CHATTERS"
            v-model="val[idx]"
          />
          <TrCountdownEffect
            v-if="item.type === CommandEffectType.COUNTDOWN"
            v-model="val[idx]"
            :base-volume="baseVolume"
          />
        </td>
        <td>
          <doubleclick-button
            class="button is-small mr-1"
            message="Are you sure?"
            :timeout="1000"
            @doubleclick="onRmEffectClick(idx)"
          >
            <i class="fa fa-trash" />
          </doubleclick-button>
        </td>
      </tr>
    </table>
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
import TrMadochanEffect from './Effects/TrMadochanEffect.vue';
import TrSetChannelTitleEffect from './Effects/TrSetChannelTitleEffect.vue';
import TrSetChannelGameIdEffect from './Effects/TrSetChannelGameIdEffect.vue';
import TrAddStreamTagsEffect from './Effects/TrAddStreamTagsEffect.vue';
import TrRemoveStreamTagsEffect from './Effects/TrRemoveStreamTagsEffect.vue';
import TrChattersEffect from './Effects/TrChattersEffect.vue';
import TrCountdownEffect from './Effects/TrCountdownEffect.vue';

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

watch(val, (newValue: CommandEffect[]) => {
  emit('update:modelValue', newValue)
})
</script>
