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
    <div>
      Type:
      <div>
        <label class="mr-1"><input
          v-model="type"
          type="radio"
          value="image"
        > Image</label>
        <label class="mr-1"><input
          v-model="type"
          type="radio"
          value="image,sound"
        > Image + Sound</label>
        <label class="mr-1"><input
          v-model="type"
          type="radio"
          value="sound"
        > Sound</label>
        <label class="mr-1"><input
          v-model="type"
          type="radio"
          value="video"
        > Video</label>
      </div>
    </div>
    <div v-if="type === 'image' || type === 'image,sound'">
      Display-Duration:
      <div class="control has-icons-left">
        <DurationInput
          :model-value="val.data.minDurationMs"
          @update:modelValue="val.data.minDurationMs = $event"
        />
        <span class="icon is-small is-left">
          <i class="fa fa-hourglass" />
        </span>
      </div>
      <div class="help">
        The minimum duration that images will be displayed.
        Sound will always play for their full length
        regardless of this setting.
      </div>
    </div>
    <div v-if="type === 'image' || type === 'image,sound'">
      Image:
      <div>
        <ImageUpload
          v-model="val.data.image"
          @update:modelValue="mediaImgChanged"
        />
      </div>
    </div>
    <div v-if="type === 'image' || type === 'image,sound'">
      Image (by URL):
      <div>
        <StringInput v-model="val.data.image_url" />
      </div>
      <div>
        <span
          class="button is-small"
          @click="
            val.data.image_url = '$user($args).profile_image_url'
          "
        >Twitch profile image of user given by args</span>
        <span
          class="button is-small"
          @click="val.data.image_url = '$user.profile_image_url'"
        >Twitch profile
          image
          of user who executes the command</span>
      </div>
    </div>
    <div v-if="type === 'sound' || type === 'image,sound'">
      Sound:
      <div>
        <SoundUpload
          v-model="val.data.sound"
          :base-volume="baseVolume"
          @update:modelValue="mediaSndChanged"
        />
      </div>
    </div>
    <div v-if="type === 'video'">
      Video:

      <table>
        <tr>
          <td>Url:</td>
          <td>
            <StringInput v-model="val.data.video.url" />
          </td>
        </tr>
        <tr>
          <td>Volume:</td>
          <td>
            <VolumeSlider v-model="val.data.video.volume" />
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
      <div>
        <span
          class="button is-small"
          @click="
            val.data.video.url = '$user($args).recent_clip_url'
          "
        >A recent twitch clip of user given by args</span>
        <span
          class="button is-small"
          @click="val.data.video.url = '$user.recent_clip_url'"
        >A recent
          twitch clip of user who executes the command</span>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">

import { MediaEffect, MediaFile, SoundMediaFile } from '../../../../types';
import { nextTick, onBeforeMount, Ref, ref, watch } from 'vue';
import StringInput from '../../StringInput.vue';
import VolumeSlider from '../../VolumeSlider.vue';
import ImageUpload from '../../ImageUpload.vue';
import SoundUpload from '../../SoundUpload.vue';
import DurationInput from '../../DurationInput.vue';

const props = defineProps<{
  modelValue: MediaEffect,
  widgetUrl: string,
  baseVolume: number,
}>()

const val = ref<MediaEffect>(props.modelValue)

const emit = defineEmits<{
  (e: 'update:modelValue', val: MediaEffect): void
}>()

const type = ref<string>('')

const mediaSndChanged = (file: SoundMediaFile): void => {
  val.value.data.sound = file;
}

const mediaImgChanged = (file: MediaFile): void => {
  val.value.data.image = file;
}

const addWidgetId = (): void => {
  val.value.data.widgetIds.push("")
}

const rmWidgetId = (idx: number): void => {
  val.value.data.widgetIds = val.value.data.widgetIds.filter((_val: string, index: number) => index !== idx)
}

const el = ref<HTMLElement>() as Ref<HTMLElement>

onBeforeMount(() => {
  if (val.value.data.video.url) {
    type.value = "video";
  }
  else if (val.value.data.sound.file) {
    if (val.value.data.image.file || val.value.data.image_url) {
      type.value = "image,sound";
    }
    else {
      type.value = "sound";
    }
  }
  else {
    type.value = "image";
  }
  nextTick(() => {
    const inputEl = el.value.querySelector("input[type=\"text\"]")
    if (inputEl) {
      (inputEl as HTMLInputElement).focus();
    }
  });
})
watch(val, (newValue: MediaEffect) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
