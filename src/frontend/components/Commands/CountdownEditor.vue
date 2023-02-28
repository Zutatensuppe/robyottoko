<template>
  <div>
    <div class="control">
      <label class="radio">
        <input
          v-model="countdown.type"
          type="radio"
          value="manual"
        >
        Manual
      </label>
      <label class="radio">
        <input
          v-model="countdown.type"
          type="radio"
          value="auto"
        >
        Auto
      </label>
    </div>

    <div v-if="countdown.type === 'auto'">
      <div class="spacerow">
        <label class="spacelabel">Steps </label>
        <input
          v-model="countdown.steps"
          class="input is-small spaceinput"
        >
      </div>
      <div class="spacerow">
        <label class="spacelabel">Interval </label>
        <DurationInput
          :model-value="countdown.interval"
          @update:modelValue="countdown.interval = $event"
        />
      </div>
      <div class="spacerow">
        <label class="spacelabel">Intro </label>
        <input
          v-model="countdown.intro"
          class="input is-small spaceinput"
        >
      </div>
      <div class="spacerow">
        <label class="spacelabel">Outro </label>
        <input
          v-model="countdown.outro"
          class="input is-small spaceinput"
        >
      </div>
    </div>
    <div v-else>
      <vue-draggable
        :model-value="countdown.actions"
        handle=".handle"
        item-key="id"
        @end="dragEnd"
      >
        <template #item="{ element, index }">
          <div class="field has-addons mr-1">
            <span class="handle p-2"><i class="fa fa-arrows" /></span>

            <div
              v-if="element.type === 'delay'"
              class="control has-icons-left"
            >
              <DurationInput
                :model-value="element.value"
                @update:modelValue="element.value = $event"
              />
              <span class="icon is-small is-left">
                <i class="fa fa-hourglass" />
              </span>
            </div>
            <div
              v-else-if="element.type === 'text'"
              class="control has-icons-left"
            >
              <StringInput v-model="element.value" />
              <span class="icon is-small is-left">
                <i class="fa fa-comments-o" />
              </span>
            </div>
            <div
              v-else-if="element.type === 'media'"
              class="control has-icons-left"
            >
              <table>
                <tr>
                  <td>Image:</td>
                  <td>
                    <ImageUpload
                      v-model="element.value.image"
                      @update:modelValue="mediaImgChanged(index, $event)"
                    />
                  </td>
                </tr>
                <tr>
                  <td>Sound:</td>
                  <td>
                    <SoundUpload
                      v-model="element.value.sound"
                      :base-volume="baseVolume"
                      @update:modelValue="mediaSndChanged(index, $event)"
                    />
                  </td>
                </tr>
                <tr>
                  <td>Duration:</td>
                  <td>
                    <div class="control has-icons-left">
                      <DurationInput
                        :model-value="element.value.minDurationMs"
                        @update:modelValue="
                          element.value.minDurationMs = $event
                        "
                      />
                      <span class="icon is-small is-left">
                        <i class="fa fa-hourglass" />
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
            </div>
            <div class="control">
              <button
                class="button is-small"
                @click="rmaction(index)"
              >
                <i class="fa fa-remove" />
              </button>
            </div>
          </div>
        </template>
      </vue-draggable>
      <button
        class="button is-small"
        @click="onAddDelay"
      >
        <i class="fa fa-hourglass mr-1" /> Add Delay
      </button>
      <button
        class="button is-small"
        @click="onAddText"
      >
        <i class="fa fa-comments-o mr-1" /> Add Chat
      </button>
      <button
        class="button is-small"
        @click="onAddMedia"
      >
        <i class="fa fa-picture-o mr-1" /> Add Media
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CountdownAction, CountdownCommandData, DragEndEvent, MediaFile, SoundMediaFile } from '../../../types'
import { newCountdownDelay, newCountdownText, newCountdownMedia } from '../../../common/commands'
import { ref, watch } from 'vue'
import DurationInput from '../DurationInput.vue'
import fn from '../../../common/fn'
import ImageUpload from '../ImageUpload.vue'
import SoundUpload from '../SoundUpload.vue'
import StringInput from '../StringInput.vue'

const props = withDefaults(defineProps<{
  modelValue: CountdownCommandData,
  baseVolume?: number,
}>(), {
  baseVolume: 100,
})

const countdown = ref<CountdownCommandData>({
  // old countdowns are automatic
  type: props.modelValue.type || 'auto',
  // settings for manual
  actions: props.modelValue.actions || [],
  step: props.modelValue.step,
  // settings for auto (old style)
  steps: props.modelValue.steps,
  interval: props.modelValue.interval,
  intro: props.modelValue.intro,
  outro: props.modelValue.outro,
})

const emit = defineEmits<{
  (e: 'update:modelValue', val: CountdownCommandData): void
}>()

watch(countdown, () => {
  emit('update:modelValue', {
    type: countdown.value.type,
    actions: countdown.value.actions,
    step: countdown.value.step,
    steps: countdown.value.steps,
    interval: countdown.value.interval,
    intro: countdown.value.intro,
    outro: countdown.value.outro,
  })
}, { deep: true })

const dragEnd = (evt: DragEndEvent): void => {
  countdown.value.actions = fn.arrayMove(countdown.value.actions, evt.oldIndex, evt.newIndex)
}
const onAddDelay = (): void => {
  countdown.value.actions.push(newCountdownDelay())
}
const onAddText = (): void => {
  countdown.value.actions.push(newCountdownText())
}
const onAddMedia = (): void => {
  countdown.value.actions.push(newCountdownMedia())
}
const rmaction = (idx: number): void => {
  countdown.value.actions = countdown.value.actions.filter((_val: CountdownAction, index: number) => index !== idx)
}
const mediaSndChanged = (idx: number, file: SoundMediaFile): void => {
  // @ts-ignore
  countdown.value.actions[idx].value.sound = file
}
const mediaImgChanged = (idx: number, file: MediaFile): void => {
  // @ts-ignore
  countdown.value.actions[idx].value.image = file
}
</script>
