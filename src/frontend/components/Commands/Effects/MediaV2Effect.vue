<template>
  <div ref="el">
    <div class="mb-2">
      <strong>Display-Duration</strong>
      <div class="help">
        The minimum duration that images will be displayed.
        Sound will always play for their full length
        regardless of this setting.
      </div>
      <div class="control has-icons-left">
        <DurationInput
          :model-value="val.data.minDurationMs"
          @update:modelValue="val.data.minDurationMs = $event"
        />
        <span class="icon is-small is-left">
          <i class="fa fa-hourglass" />
        </span>
      </div>
    </div>

    <div class="mb-2">
      <strong>Widgets</strong>
      <div>
        <p class="help">
          Define in which widgets this media should show up in.
          Leave the list empty to only show in the default widget.
        </p>
      </div>
      <div
        v-if="val.data.widgetIds.length === 0"
        class="field has-addons"
      >
        This media will show in the&nbsp;
        <a
          :href="`${widgetUrl}`"
          target="_blank"
        >default widget</a>.
      </div>
      <div
        v-for="(id, idx) in val.data.widgetIds"
        :key="idx"
        class="field has-addons"
      >
        <div class="control mr-1">
          <StringInput v-model="val.data.widgetIds[idx]" />
        </div>
        <a
          class="button is-small mr-1"
          :href="`${widgetUrl}?id=${encodeURIComponent(id)}`"
          target="_blank"
        >Open widget</a>
        <button
          class="button is-small"
          @click="rmWidgetId(idx)"
        >
          <i class="fa fa-remove" />
        </button>
      </div>
      <div class="field">
        <button
          class="button is-small"
          @click="addWidgetId"
        >
          <i class="fa fa-plus mr-1" /> Add widget
        </button>
      </div>
    </div>

    <div>
      <strong>Elements</strong>
    </div>
    <div class="mb-2">
      <div
        v-for="(item, idx) in val.data.mediaItems"
        :key="idx"
        class="media-v2-item-edit"
        :class="{ 'is-selected': selectedItemIdx === idx }"
        @click="onItemClick(idx)"
      >
        <div class="media-v2-item-edit-inner">
          <template v-if="item.type === 'image'">
            <table class="table">
              <tr>
                <td>Image:</td>
                <td>
                  <ImageUpload v-model="item.image" />
                  <StringInput v-model="item.imageUrl" placeholder="Custom Image URL" />
                </td>
              </tr>
              <tr>
                <td>Mask Image:</td>
                <td>
                  <ImageUpload v-model="item.maskImage" />
                  <StringInput v-model="item.maskImageUrl" placeholder="Custom Mask Image URL" />
                </td>
              </tr>
            </table>
          </template>
          <template v-else-if="item.type === 'video'">
            Video:

            <table class="table">
              <tr>
                <td>Url:</td>
                <td>
                  <StringInput v-model="item.video.url" />
                </td>
              </tr>
              <tr>
                <td>Volume:</td>
                <td>
                  <VolumeSlider v-model="item.video.volume" />
                </td>
              </tr>
            </table>
            <div class="help">
              The video url has to be a twitch clip url
              (<code>https://clips.twitch.tv/...</code>) or a URL to a
              video file (a URL usually ending in <code>.mp4</code> or
              similar).
              Currently Youtube or other Video Hosters are not supported.
            </div>
          </template>
          <template v-else-if="item.type === 'text'">
            <table class="table">
              <tr>
                <td>Text:</td>
                <td>
                  <StringInput v-model="item.text" />
                </td>
              </tr>
              <tr>
                <td>Settings:</td>
                <td>
                  <div class="is-flex g-1">
                    <label>
                      Color:<br >
                      <input v-model="item.color" class="input is-small" type="color">
                    </label>
                    <label>
                      Outline:<br >
                      <input v-model="item.outline" class="input is-small" type="color">
                    </label>
                    <label>
                      Outline Width:<br >
                      <IntegerInput v-model="item.outlineWidth" />
                    </label>
                    <label>
                      Bold:<br >
                      <CheckboxInput v-model="item.bold" />
                    </label>
                    <label>
                      Italic:<br >
                      <CheckboxInput v-model="item.italic" />
                    </label>
                    <div class="font-select">
                      Font:
                      <div class="is-flex">
                        <input v-model="item.font" class="input is-small" type="text">
                        <div class="select is-small">
                          <select v-model="item.font">
                            <option
                              v-for="(fn, idx2) in availableFonts"
                              :key="idx2"
                              :value="fn"
                            >
                              {{ fn }}
                            </option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </table>
          </template>
          <template v-else-if="item.type === 'sound'">
            <SoundUpload
              v-model="item.sound"
              :base-volume="baseVolume"
            />
          </template>
          <template v-else>
            {{ item }}
          </template>
        </div>
      </div>
    </div>
    <div class="mb-2 buttons">
      <button
        class="button is-small"
        @click="onMoveItemUpClick()"
        :disabled="selectedItemIdx < 1"
      >
        <i class="fa fa-chevron-up" />
      </button>
      <button
        class="button is-small"
        @click="onMoveItemDownClick()"
        :disabled="selectedItemIdx === -1 || selectedItemIdx >= val.data.mediaItems.length - 1"
      >
        <i class="fa fa-chevron-down" />
      </button>
      <button
        class="button is-small"
        @click="onRemoveItemClick()"
        :disabled="selectedItemIdx === -1"
      >
        <i class="fa fa-remove" />
      </button>

      <button class="button is-small" @click="addImage()">
        Add image
      </button>

      <button class="button is-small" @click="addVideo()">
        Add video
      </button>

      <button class="button is-small" @click="addText()">
        Add text
      </button>

      <button class="button is-small" @click="addSound()">
        Add sound
      </button>
    </div>

    <MediaV2EditArea
      v-model="val.data.mediaItems"
      :selected-item-idx="selectedItemIdx"
      @update:selectedItemIdx="selectedItemIdx = $event"
    />
  </div>
</template>
<script setup lang="ts">
import { newMediaV2Image, newMediaV2Sound, newMediaV2Text, newMediaV2Video } from '../../../../common/commands'
import type { MediaV2EffectData } from '../../../../types'
import { Ref, ref, watch } from 'vue'
import MediaV2EditArea from './MediaV2EditArea.vue'
import ImageUpload from '../../ImageUpload.vue'
import SoundUpload from '../../SoundUpload.vue'
import StringInput from '../../StringInput.vue'
import VolumeSlider from '../../VolumeSlider.vue'
import { getAvailableFonts } from '../../../util'
import CheckboxInput from '../../CheckboxInput.vue'
import DurationInput from '../../DurationInput.vue'
import IntegerInput from '../../IntegerInput.vue'

const availableFonts = ref<string[]>(getAvailableFonts())

const props = defineProps<{
  modelValue: MediaV2EffectData,
  widgetUrl: string,
  baseVolume: number,
}>()

const selectedItemIdx = ref<number>(-1)
const onItemClick = (idx: number) => {
  if (selectedItemIdx.value === idx) {
    selectedItemIdx.value = -1
  } else {
    selectedItemIdx.value = idx
  }
}

const onMoveItemUpClick = () => {
  if (selectedItemIdx.value >= 0 && moveItem(selectedItemIdx.value, -1)) {
    selectedItemIdx.value -= 1
  }
}
const onMoveItemDownClick = () => {
  if (selectedItemIdx.value >= 0 && moveItem(selectedItemIdx.value, 1)) {
    selectedItemIdx.value += 1
  }
}
const onRemoveItemClick = () => {
  if (selectedItemIdx.value >= 0) {
    removeItem(selectedItemIdx.value)
    selectedItemIdx.value = -1
  }
}

const val = ref<MediaV2EffectData>(props.modelValue)

const emit = defineEmits<{
  (e: 'update:modelValue', val: MediaV2EffectData): void
}>()

const el = ref<HTMLElement>() as Ref<HTMLElement>

const addImage = () => {
  val.value.data.mediaItems.push(newMediaV2Image())
}

const addVideo = () => {
  val.value.data.mediaItems.push(newMediaV2Video())
}

const addText = () => {
  val.value.data.mediaItems.push(newMediaV2Text())
}

const addSound = () => {
  val.value.data.mediaItems.push(newMediaV2Sound())
}

const moveItem = (idx: number, direction: number): boolean => {
  if (idx + direction < 0 || idx + direction >= val.value.data.mediaItems.length) {
    return false
  }
  const item = val.value.data.mediaItems[idx]
  val.value.data.mediaItems.splice(idx, 1)
  val.value.data.mediaItems.splice(idx + direction, 0, item)
  return true
}

const removeItem = (idx: number) => {
  val.value.data.mediaItems = val.value.data.mediaItems.filter((_val, index) => index !== idx)
}

const addWidgetId = (): void => {
  val.value.data.widgetIds.push('')
}

const rmWidgetId = (idx: number): void => {
  val.value.data.widgetIds = val.value.data.widgetIds.filter((_val: string, index: number) => index !== idx)
}

watch(val, (newValue: MediaV2EffectData) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
<style scoped lang="scss">
.media-v2-item-edit {
  position: relative;

  .media-v2-item-edit-inner {
    margin-bottom: 10px;
    padding: 5px;
    border: 1px solid #ccc;
    border-radius: 5px;
    background: #efefef;
  }

  &.is-selected .media-v2-item-edit-inner {
    border-color: black;
    background: #d0d0d0;
  }
}
.g-1 {
  gap: 1em;
}
.font-select {
  select {
    width: 0px !important;
    padding-right: 2em !important;
  }
}

.table tr:first-of-type td:first-of-type {
  width: 150px;
}
</style>
