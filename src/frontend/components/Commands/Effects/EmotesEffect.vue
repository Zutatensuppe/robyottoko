<template>
  <div>
    <table>
      <tr>
        <th>Display Functions:</th>
        <td>
          <div
            v-if="val.data.displayFn.length"
          >
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
          </div>
          <div v-else>
            No display function added yet
          </div>
          <button
            class="button is-small"
            @click="addFn()"
          >
            <i class="fa fa-plus mr-1" /> Add
          </button>
        </td>
      </tr>
      <tr>
        <th>Emotes:</th>
        <td>
          <div>
            <div
              v-if="val.data.emotes.length"
              class="emote-select"
            >
              <img
                v-for="(emote, idx) in val.data.emotes"
                :key="idx"
                :src="emote.url"
                class="is-clickable"
                @click="removeEmote(idx)"
              >
            </div>
            <div
              v-else
              class="emote-select"
            >
              No emotes added yet
            </div>

            <div class="field has-addons">
              <div class="control">
                <StringInput
                  v-model="emotesInput"
                  placeholder="Enter emotes here"
                />
              </div>
              <div class="control">
                <StringInput
                  v-model="emotesChannelInput"
                  placeholder="(Optional) channel"
                />
              </div>
              <button
                class="button is-small"
                @click="addExtractedEmotes"
              >
                <i class="fa fa-plus mr-1" /> Add emotes
              </button>
            </div>

            Channels:
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
                  class="is-clickable"
                  @click="addEmote(emote)"
                >
              </div>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</template>
<script setup lang="ts">
import type { EmotesEffectData, EmoteSet } from '../../../../types'
import { onBeforeMount, ref, watch } from 'vue'
import { EMOTE_DISPLAY_FN, possibleEmoteDisplayFunctions } from '../../../../mod/modules/GeneralModuleCommon'
import api from '../../../_api'
import StringInput from '../../StringInput.vue'
import { useToast } from 'vue-toastification'

const props = defineProps<{
  modelValue: EmotesEffectData,
}>()

const toast = useToast()

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
    args: [],
  })
}

const removeEmote = (idx: number): void => {
  val.value.data.emotes = val.value.data.emotes.filter((_value, index) => index !== idx)
}

const addEmote = (url: string): void => {
  val.value.data.emotes.push({ url })
}

const emotesInput = ref<string>('')
const emotesChannelInput = ref<string>('')
const channelNameInput = ref<string>('')

const addExtractedEmotes = async (): Promise<void> => {
  if (!emotesInput.value) {
    return
  }
  const res = await api.getExtractedEmotes(emotesInput.value, emotesChannelInput.value)
  if (res.status !== 200) {
    toast.error('Error extracting emotes.')
    return
  }
  try {
    const json = await res.json()
    if (json.length === 0) {
      toast.error('No emotes could be extracted.')
    } else {
      val.value.data.emotes.push(...json)
    }
  } catch (e) {
    toast.error('Error extracting emotes.')
    return
  }
}

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
