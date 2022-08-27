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
        <duration-input
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
              <duration-input
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
              <input
                v-model="element.value"
                class="input is-small"
                type="text"
              >
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
                    <image-upload
                      v-model="element.value.image"
                      @update:modelValue="mediaImgChanged(index, $event)"
                    />
                  </td>
                </tr>
                <tr>
                  <td>Sound:</td>
                  <td>
                    <sound-upload
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
                      <duration-input
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
        </draggable>
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
      </vue-draggable>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import fn from "../../../common/fn";
import { CountdownAction, CountdownCommandData, DragEndEvent, MediaFile, SoundMediaFile } from "../../../types";
import {
  newCountdownDelay,
  newCountdownText,
  newCountdownMedia,
} from "../../../common/commands";

interface ComponentData {
  countdown: {
    type: string

    // settings for manual
    actions: CountdownAction[]

    // settings for auto (old style)
    steps: string | number,
    interval: string | number, // can be human readable string
    intro: string,
    outro: string,
  },
}

export default defineComponent({
  props: {
    baseVolume: {
      default: 100,
    },
    modelValue: {
      type: Object as PropType<CountdownCommandData>,
      required: true,
    },
  },
  data: (): ComponentData => ({
    countdown: {
      type: "manual",

      // settings for manual
      actions: [] as CountdownAction[],

      // settings for auto (old style)
      steps: 3,
      interval: 1000,
      intro: "",
      outro: "",
    },
  }),
  created() {
    // old countdowns are automatic
    this.countdown.type = this.modelValue.type || "auto";

    this.countdown.actions = this.modelValue.actions || [];

    this.countdown.steps = this.modelValue.steps;
    this.countdown.interval = this.modelValue.interval;
    this.countdown.intro = this.modelValue.intro;
    this.countdown.outro = this.modelValue.outro;

    this.$watch(
      "countdown",
      () => {
        this.$emit("update:modelValue", {
          type: this.countdown.type,

          actions: this.countdown.actions,

          steps: this.countdown.steps,
          interval: this.countdown.interval,
          intro: this.countdown.intro,
          outro: this.countdown.outro,
        });
      },
      { deep: true }
    );
  },
  methods: {
    dragEnd(evt: DragEndEvent): void {
      this.countdown.actions = fn.arrayMove(
        this.countdown.actions,
        evt.oldIndex,
        evt.newIndex
      );
    },
    onAddDelay(): void {
      this.countdown.actions.push(newCountdownDelay());
    },
    onAddText(): void {
      this.countdown.actions.push(newCountdownText());
    },
    onAddMedia(): void {
      this.countdown.actions.push(newCountdownMedia());
    },
    rmaction(idx: number): void {
      this.countdown.actions = this.countdown.actions.filter(
        (_val: CountdownAction, index: number) => index !== idx
      );
    },
    mediaSndChanged(idx: number, file: SoundMediaFile): void {
      // @ts-ignore
      this.countdown.actions[idx].value.sound = file
    },
    mediaImgChanged(idx: number, file: MediaFile): void {
      // @ts-ignore
      this.countdown.actions[idx].value.image = file
    },
  },
});
</script>
