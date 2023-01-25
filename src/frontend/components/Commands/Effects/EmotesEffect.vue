<template>
  <div>
    <div>
      Display Functions:
      <div
        v-for="(displayFn, idx) in val.data.displayFn"
        :key="idx"
        class="field has-addons mb-1"
      >
        <div class="control">
          <div
            class="select is-small"
          >
            <select v-model="val.data.displayFn[idx].fn">
              <option
                v-for="(fn, idx2) in possibleEmoteDisplayFunctions"
                :key="idx2"
                :value="fn"
              >
                {{ fn }}
              </option>
            </select>
          </div>
        </div>
        <button
          class="button is-small"
          @click="rmFn(idx)"
        >
          <i class="fa fa-remove" />
        </button>
      </div>
      <button
        class="button is-small"
        @click="addFn()"
      >
        <i class="fa fa-plus mr-1" /> Add
      </button>
    </div>
    <div>
      Emotes:

      <div class="emote-select">
        <img
          v-for="(emote, idx) in val.data.emotes"
          :key="idx"
          :src="emote.url"
          @click="removeEmote(idx)"
        >
      </div>
      <div class="field has-addons">
        <div class="control">
          <StringInput
            v-model="channelNameInput"
            placeholder="Enter channel name here"
          />
        </div>
        <button
          class="button is-small"
          @click="loadChannelEmotes"
        >
          <i class="fa fa-plus mr-1" /> Show emotes from channel
        </button>
      </div>
      <div class="emote-select">
        Select emotes to display:
        <div
          v-for="(emotesSet, idx) in possibleEmoteSets"
          :key="idx"
        >
          <div class="emote-set-name">
            {{ emotesSet.name }}
          </div>
          <img
            v-for="(emote, idx2) in emotesSet.emotes"
            :key="idx2"
            :src="emote"
            @click="addEmote(emote)"
          >
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { EmotesEffectData, EmoteSet } from '../../../../types';
import { onBeforeMount, ref, watch } from 'vue';
import { EMOTE_DISPLAY_FN, possibleEmoteDisplayFunctions } from '../../../../mod/modules/GeneralModuleCommon';
import api from '../../../api';
import StringInput from '../../StringInput.vue';

const props = defineProps<{
  modelValue: EmotesEffectData,
}>()

const val = ref<EmotesEffectData>(props.modelValue)
const possibleEmoteSets = ref<EmoteSet[]>([])

const emit = defineEmits<{
  (e: 'update:modelValue', val: EmotesEffectData): void
}>()

const rmFn = (idx: number): void => {
  val.value.data.displayFn = val.value.data.displayFn.filter((_value, index) => index !== idx)
}

const addFn = (): void => {
  val.value.data.displayFn.push({
    fn: EMOTE_DISPLAY_FN.FLOATING_SPACE,
    args: []
  })
}

const removeEmote = (idx: number): void => {
  val.value.data.emotes = val.value.data.emotes.filter((_value, index) => index !== idx)
}

const addEmote = (url: string): void => {
  val.value.data.emotes.push({ url })
}

const channelNameInput = ref<string>('')

const loadChannelEmotes = async (): Promise<void> => {
  const channelName = channelNameInput.value
  if (possibleEmoteSets.value.find(set => set.name === channelName)) {
    return
  }

  const res = await api.getGeneralChannelEmotes(channelName)
  const json = await res.json()
  possibleEmoteSets.value.unshift({
    name: channelName,
    emotes: json.data.map((emoteData: any) => `https://static-cdn.jtvnw.net/emoticons/v2/${emoteData.id}/default/dark/3.0`),
  })
}

onBeforeMount(async () => {
  possibleEmoteSets.value = []
  const res = await api.getGeneralGlobalEmotes()
  const json = await res.json()
  possibleEmoteSets.value.push({
    name: 'global',
    emotes: json.data.map((emoteData: any) => `https://static-cdn.jtvnw.net/emoticons/v2/${emoteData.id}/default/dark/3.0`),
  })
})

watch(val, (newValue: EmotesEffectData) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>

<style lang="scss">
.emote-select {
  img { width: 32px; }
}
.emote-set-name {
  font-weight: bold;
}
</style>
