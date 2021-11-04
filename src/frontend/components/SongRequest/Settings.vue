<template>
  <div>
    <table class="table is-striped" ref="table" v-if="settings">
      <tbody>
        <tr>
          <td><code>settings.volume</code></td>
          <td>
            <volume-slider v-model="settings.volume" @update:modelValue="sendSettings" />
          </td>
          <td>Base volume for all songs played</td>
        </tr>
        <tr>
          <td><code>settings.hideVideoImage</code></td>
          <td>
            <div v-if="settings.hideVideoImage.file" class="mb-1">
              <responsive-image
                :src="settings.hideVideoImage.file"
                :title="settings.hideVideoImage.filename"
                width="100px"
                height="50px"
                style="display: inline-block"
              />
              <br />
              <button
                class="button is-small"
                @click="hideVideoImageRemoved"
              >
                <i class="fa fa-remove mr-1" /> Remove Image
              </button>
            </div>
            <upload
              @uploaded="hideVideoImageUploaded"
              accept="image/*"
              label="Upload Image"
            />
          </td>
          <td>Image to display when a video is hidden.</td>
        </tr>
        <tr>
          <td><code>settings.showProgressBar</code></td>
          <td>
            <input type="checkbox" v-model="settings.showProgressBar" @update:modelValue="sendSettings" />
          </td>
          <td>Show a progress bar in the bottom part of the video in the widget.</td>
        </tr>
        <tr>
          <td><code>settings.customCss</code></td>
          <td>
            <codearea v-model="settings.customCss" @update:modelValue="sendSettings"></codearea>
          </td>
          <td>
            <p>Classes that can be used for styling:</p>
            <table class="table">
              <thead>
                <tr><th>Class</th><th>Description</th></tr>
              </thead>
              <tbody>
                <tr v-for="(ex, idx) in css.classExamples" :key="idx">
                  <td><code>{{ex.class}}</code></td>
                  <td>{{ex.desc}}</td>
                </tr>
              </tbody>
            </table>

            <p><b>Examples:</b></p>
            <p v-for="(ex, idx) in css.codeExamples" :key="idx">
              {{ex.desc}}
              <pre><code>{{ ex.code }}</code></pre>
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
<script lang="ts">
import { defineComponent, PropType } from "vue";
import { SongrequestModuleSettings } from "../../../mod/modules/SongrequestModule";
import { UploadedFile } from "../../../types";

interface ComponentData {
  settings: SongrequestModuleSettings;
  css: {
    classExamples: { class: string; desc: string }[];
    codeExamples: { code: string; desc: string }[];
  };
}

export default defineComponent({
  props: {
    modelValue: {
      type: Object as PropType<SongrequestModuleSettings>,
      required: true,
    },
  },
  emits: {
    "update:modelValue": null,
  },
  created() {
    this.settings = this.modelValue;
  },
  methods: {
    hideVideoImageRemoved() {
      this.settings.hideVideoImage = {
        filename: "",
        file: "",
      };
      this.sendSettings();
    },
    hideVideoImageUploaded(file: UploadedFile) {
      this.settings.hideVideoImage = {
        filename: file.originalname,
        file: file.filename,
      };
      this.sendSettings();
    },
    sendSettings() {
      this.$emit("update:modelValue", this.settings);
    },
  },
  data: (): ComponentData => ({
    settings: {
      volume: 100,
      hideVideoImage: {
        file: "",
        filename: "",
      },
      showProgressBar: false,
      customCssPresets: [],
      customCss: "",
    },
    css: {
      classExamples: [
        { class: ".wrapper", desc: "Wrapper for everything" },
        { class: ".player", desc: "The player" },
        { class: ".list", desc: "The playlist" },
        { class: ".item", desc: "A playlist item" },
        { class: ".playing", desc: "Currently playing item" },
        { class: ".not-playing", desc: "Queued items" },
        { class: ".title", desc: "Wrapper for the title of a playlist item" },
        { class: ".title-content", desc: "Title texts" },
        {
          class: ".title-orig",
          desc: "Title text displayed by default",
        },
        {
          class: ".title-dupl",
          desc: "Title text duplicated, useful for marquee effect",
        },
        { class: ".vote", desc: "Vote elements" },
        { class: ".vote-up", desc: "Up vote element" },
        { class: ".vote-down", desc: "Down vote element" },
        { class: ".meta", desc: "Meta info about an item" },
        { class: ".meta-user", desc: "User who requested the song" },
        { class: ".meta-plays", desc: "How many times the song was played" },
      ],
      codeExamples: [
        {
          desc: "Hide Player:",
          code: `.player { position: absolute; }`,
        },
        {
          desc: "Change font to external font:",
          code: `@import url('https://fonts.googleapis.com/css2?family=Shadows+Into+Light');
body { font-family: 'Shadows into Light'; font-size: 30px; }`,
        },
        {
          desc: "Change colors of items:",
          code: `.playing { background: #222; color: #bbb; }
.not-playing { background: #eee; color: #444; }`,
        },
        {
          desc: "Display something in front of the currently playing item title:",
          code: `.playing .title:before { content: '🎶 Now Playing 🎶 ' }`,
        },
        {
          desc: "Add a margin between the items:",
          code: `.item { margin-bottom: 20px; }`,
        },
        {
          desc: "Hide votes and meta:",
          code: `.vote, .meta { display: none; }`,
        },
        {
          desc: "Hide down votes:",
          code: `.vote-down { display: none; }`,
        },
        {
          desc: "Hite all items starting from the 6th:",
          code: `.item:nth-child(n+6) { display: none; }`,
        },
        {
          desc: "Show only titles and marquee the current song:",
          code: `.playing .title { animation: init 10s linear forwards, back 10s 0s linear infinite; }
.title { margin: 1em 0; white-space: nowrap; }
.not-playing .title { text-overflow: ellipsis; overflow: hidden; }
.meta, .vote { display: none; }
@keyframes back {
    from { transform: translateX(100%); }
    to { transform: translateX(-100%); }
}
@keyframes init {
    to { transform: translateX(-100%); }
}`,
        },
        {
          desc: "Show only titles and marquee the current song (better version):",
          code: `.playing .title { overflow: hidden; white-space: nowrap; height: 20px; line-height: 20px; }
.playing .title-content { position: absolute; padding: 0 10px; min-width: 100%; animation: init 5s linear, back 10s linear 5s infinite; }
.playing .title-content.title-dupl { display: block; animation: back 10s linear 0s infinite; }
.vote, .meta { display: none; }
@keyframes back {
    from { transform: translateX(100%); }
    to { transform: translateX(-100%); }
}
@keyframes init {
    to { transform: translateX(-100%); }
}`,
        },
      ],
    },
  }),
});
</script>

<style scoped>
pre {
  padding: 0.5em 1em;
}
.textarea:not([rows]) {
  min-width: 500px;
  min-height: 800px;
}
</style>
