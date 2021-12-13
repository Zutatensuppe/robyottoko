<template>
  <div>
    <div class="control">
      <label class="radio">
        <input type="radio" value="manual" v-model="countdown.type" />
        Manual
      </label>
      <label class="radio">
        <input type="radio" value="auto" v-model="countdown.type" />
        Auto
      </label>
    </div>

    <div v-if="countdown.type === 'auto'">
      <div class="spacerow">
        <label class="spacelabel">Steps </label>
        <input class="input is-small spaceinput" v-model="countdown.steps" />
      </div>
      <div class="spacerow">
        <label class="spacelabel">Interval </label>
        <duration-input
          :modelValue="countdown.interval"
          @update:modelValue="countdown.interval = $event"
        />
      </div>
      <div class="spacerow">
        <label class="spacelabel">Intro </label>
        <input class="input is-small spaceinput" v-model="countdown.intro" />
      </div>
      <div class="spacerow">
        <label class="spacelabel">Outro </label>
        <input class="input is-small spaceinput" v-model="countdown.outro" />
      </div>
    </div>
    <div v-else>
      <draggable
        :modelValue="countdown.actions"
        @end="dragEnd"
        handle=".handle"
        item-key="id"
      >
        <template #item="{ element, index }">
          <div class="field has-addons mr-1">
            <span class="handle p-2"><i class="fa fa-arrows"></i></span>

            <div class="control has-icons-left" v-if="element.type === 'delay'">
              <duration-input
                :modelValue="element.value"
                @update:modelValue="element.value = $event"
              />
              <span class="icon is-small is-left">
                <i class="fa fa-hourglass"></i>
              </span>
            </div>
            <div
              class="control has-icons-left"
              v-else-if="element.type === 'text'"
            >
              <input
                class="input is-small"
                type="text"
                v-model="element.value"
              />
              <span class="icon is-small is-left">
                <i class="fa fa-comments-o"></i>
              </span>
            </div>
            <div
              class="control has-icons-left"
              v-else-if="element.type === 'media'"
            >
              <table>
                <tr>
                  <td>Image:</td>
                  <td>
                    <responsive-image
                      v-if="element.value.image.file"
                      :src="element.value.image.file"
                      :title="element.value.image.filename"
                      width="100%"
                      height="90px"
                      style="display: block"
                    />
                    <button
                      v-if="element.value.image.file"
                      class="button is-small"
                      @click="element.value.image.file = null"
                    >
                      <i class="fa fa-remove mr-1" /> Remove
                    </button>
                    <br v-if="element.value.image.file" />
                    <upload
                      @uploaded="mediaImgUploaded(index, $event)"
                      accept="image/*"
                      label="Upload Image"
                      :class="{ 'mt-1': element.value.image.file }"
                    />
                  </td>
                </tr>
                <tr>
                  <td>Sound:</td>
                  <td>
                    <player
                      v-if="element.value.sound.file"
                      :src="element.value.sound.file"
                      :name="element.value.sound.filename"
                      :volume="element.value.sound.volume"
                      :baseVolume="baseVolume"
                      class="button is-small"
                    />
                    <volume-slider
                      v-if="element.value.sound.file"
                      v-model="element.value.sound.volume"
                    />
                    <button
                      v-if="element.value.sound.file"
                      class="button is-small"
                      @click="element.value.sound.file = null"
                    >
                      <i class="fa fa-remove mr-1" /> Remove
                    </button>
                    <br v-if="element.value.sound.file" />
                    <upload
                      @uploaded="mediaSndUploaded(index, $event)"
                      accept="audio/*"
                      label="Upload Sound"
                      :class="{ 'mt-1': element.value.sound.file }"
                    />
                  </td>
                </tr>
                <tr>
                  <td>Duration:</td>
                  <td>
                    <div class="control has-icons-left">
                      <duration-input
                        :modelValue="element.value.minDurationMs"
                        @update:modelValue="
                          element.value.minDurationMs = $event
                        "
                      />
                      <span class="icon is-small is-left">
                        <i class="fa fa-hourglass"></i>
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
            </div>
            <div class="control">
              <button class="button is-small" @click="rmaction(index)">
                <i class="fa fa-remove" />
              </button>
            </div>
          </div>
        </template>
      </draggable>
      <button class="button is-small" @click="onAddDelay">
        <i class="fa fa-hourglass mr-1" /> Add Delay
      </button>
      <button class="button is-small" @click="onAddText">
        <i class="fa fa-comments-o mr-1" /> Add Chat
      </button>
      <button class="button is-small" @click="onAddMedia">
        <i class="fa fa-picture-o mr-1" /> Add Media
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import commands from "../../commands";
import fn from "../../../common/fn";
import { CountdownAction } from "../../../types";

export default defineComponent({
  name: "countdown-edit",
  props: {
    baseVolume: {
      default: 100,
    },
    modelValue: {
      type: Object,
      required: true,
    },
  },
  data: () => ({
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
  methods: {
    dragEnd(evt) {
      this.countdown.actions = fn.arrayMove(
        this.countdown.actions,
        evt.oldIndex,
        evt.newIndex
      );
    },
    onAddDelay() {
      this.countdown.actions.push({ type: "delay", value: "1s" });
    },
    onAddText() {
      this.countdown.actions.push({ type: "text", value: commands.newText() });
    },
    onAddMedia() {
      this.countdown.actions.push({
        type: "media",
        value: commands.newMedia(),
      });
    },
    rmaction(idx: number) {
      this.countdown.actions = this.countdown.actions.filter(
        (val, index) => index !== idx
      );
    },
    mediaSndUploaded(idx: number, data) {
      this.countdown.actions[idx].value.sound.filename = data.originalname;
      this.countdown.actions[idx].value.sound.file = data.filename;
    },
    mediaImgUploaded(idx: number, data) {
      this.countdown.actions[idx].value.image.filename = data.originalname;
      this.countdown.actions[idx].value.image.file = data.filename;
    },
  },
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
});
</script>
