<template>
  <div ref="el">
    <div>
      Widgets:
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
      <div>
        <p class="help">
          Define in which widgets this media should show up in.
          Leave the list empty to only show in the default widget.
        </p>
      </div>
    </div>
    <div class="mb-2">
      <div v-for="(item, idx) in val.data.mediaItems" :key="idx" class="media-v2-item-edit">
        <div class="media-v2-item-edit-inner">
          <template v-if="item.type === 'image'">
            <div class="is-flex">
              Image:
              <ImageUpload v-model="item.image" />
            </div>
            <div class="is-flex">
              Image URL: <input v-model="item.imageUrl" type="text" class="input is-small">
            </div>
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
            <div class="is-flex mb-1">
              text: <input v-model="item.text" type="text" class="input is-small">
            </div>
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
                <input v-model="item.outlineWidth" class="input is-small" type="number">
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

        <div class="action-buttons">
          <button
            class="button is-small"
            @click="moveItem(idx, -1)"
          >
            <i class="fa fa-chevron-up" />
          </button>
          <button
            class="button is-small"
            @click="moveItem(idx, 1)"
          >
            <i class="fa fa-chevron-down" />
          </button>
          <button
            class="button is-small"
            @click="removeItem(idx)"
          >
            <i class="fa fa-remove" />
          </button>
        </div>
      </div>
    </div>
    <div class="mb-2 buttons">
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

    <MediaV2EditArea v-model="val.data.mediaItems" />
  </div>
</template>
<script setup lang="ts">
import { newMediaV2Image, newMediaV2Sound, newMediaV2Text, newMediaV2Video } from '../../../../common/commands'
import { MediaV2EffectData } from '../../../../types'
import { Ref, ref, watch } from 'vue'
import MediaV2EditArea from './MediaV2EditArea.vue'
import ImageUpload from '../../ImageUpload.vue'
import SoundUpload from '../../SoundUpload.vue'
import StringInput from '../../StringInput.vue'
import VolumeSlider from '../../VolumeSlider.vue'
import { getAvailableFonts } from '../../../util'
import CheckboxInput from '../../CheckboxInput.vue'

const availableFonts = ref<string[]>(getAvailableFonts())

const props = defineProps<{
  modelValue: MediaV2EffectData,
  widgetUrl: string,
  baseVolume: number,
}>()

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

const moveItem = (idx: number, direction: number) => {
  if (idx + direction < 0 || idx + direction >= val.value.data.mediaItems.length) {
    return
  }
  const item = val.value.data.mediaItems[idx]
  val.value.data.mediaItems.splice(idx, 1)
  val.value.data.mediaItems.splice(idx + direction, 0, item)
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
  padding-right: 8em;

  .media-v2-item-edit-inner {
    margin-bottom: 10px;
    padding: 5px;
    border: 1px solid #ccc;
    border-radius: 5px;
    background: #efefef;
  }

  .action-buttons {
    position: absolute;
    right: -2px;
    top: 0;
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
</style>
