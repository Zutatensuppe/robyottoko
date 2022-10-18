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
      <TrMadochanEffect
        v-if="item.type === CommandEffectType.MADOCHAN"
        v-model="val[idx]"
        @remove-click="onRmEffectClick(idx)"
      />
      <TrSetChannelTitleEffect
        v-if="item.type === CommandEffectType.SET_CHANNEL_TITLE"
        v-model="val[idx]"
        @remove-click="onRmEffectClick(idx)"
      />
      <TrSetChannelGameIdEffect
        v-if="item.type === CommandEffectType.SET_CHANNEL_GAME_ID"
        v-model="val[idx]"
        @remove-click="onRmEffectClick(idx)"
      />
      <TrAddStreamTagsEffect
        v-if="item.type === CommandEffectType.ADD_STREAM_TAGS"
        v-model="val[idx]"
        @remove-click="onRmEffectClick(idx)"
      />
      <TrRemoveStreamTagsEffect
        v-if="item.type === CommandEffectType.REMOVE_STREAM_TAGS"
        v-model="val[idx]"
        @remove-click="onRmEffectClick(idx)"
      />
      <TrChattersEffect
        v-if="item.type === CommandEffectType.CHATTERS"
        v-model="val[idx]"
        @remove-click="onRmEffectClick(idx)"
      />
      <TrCountdownEffect
        v-if="item.type === CommandEffectType.COUNTDOWN"
        v-model="val[idx]"
        :base-volume="baseVolume"
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
    <span
      class="button is-small"
      @click="addMadochan"
    >Add madochan</span>
    <span
      class="button is-small"
      @click="addSetChannelTitle"
    >Add set stream title</span>
    <span
      class="button is-small"
      @click="addSetChannelGameId"
    >Add set stream category</span>
    <span
      class="button is-small"
      @click="addAddStreamTags"
    >Add 'add stream tags'</span>
    <span
      class="button is-small"
      @click="addRemoveStreamTags"
    >Add 'remove stream tags'</span>
    <span
      class="button is-small"
      @click="addChatters"
    >Add chatters</span>
    <span
      class="button is-small"
      @click="addCountdown"
    >Add countdown</span>
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
const addMadochan = () => {
  val.value.push({
    type: CommandEffectType.MADOCHAN,
    data: {
      // TODO: use from same resource as server
      model: '100epochs800lenhashingbidirectional.h5',
      weirdness: '1',
    },
  })
}
const addSetChannelTitle = () => {
  val.value.push({
    type: CommandEffectType.SET_CHANNEL_TITLE,
    data: {
      title: ''
    },
  })
}
const addSetChannelGameId = () => {
  val.value.push({
    type: CommandEffectType.SET_CHANNEL_GAME_ID,
    data: {
      title: ''
    },
  })
}

const addAddStreamTags = () => {
  val.value.push({
    type: CommandEffectType.ADD_STREAM_TAGS,
    data: {
      tag: '',
    },
  })
}

const addRemoveStreamTags = () => {
  val.value.push({
    type: CommandEffectType.REMOVE_STREAM_TAGS,
    data: {
      tag: '',
    },
  })
}

const addChatters = () => {
  val.value.push({
    type: CommandEffectType.CHATTERS,
    data: {},
  })
}

const addCountdown = () => {
  val.value.push({
    type: CommandEffectType.COUNTDOWN,
    data: {
      type: 'auto',
      step: '',
      steps: '3',
      interval: '1s',
      intro: 'Starting countdown...',
      outro: 'Done!',
      actions: []
    }
  })
}

watch(val, (newValue: CommandEffect[]) => {
  emit('update:modelValue', newValue)
})
</script>
