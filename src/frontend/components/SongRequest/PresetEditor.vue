<template>
  <div
    ref="el"
    class="modal is-active"
  >
    <div
      class="modal-background"
      @click="onOverlayClick"
    />
    <div class="modal-card">
      <header class="modal-card-head">
        <div class="modal-card-title">
          Edit Preset
        </div>
        <button
          class="delete"
          aria-label="close"
          @click="onCloseClick"
        />
      </header>
      <section class="modal-card-body">
        <table class="table is-striped is-fullwidth">
          <tr>
            <td>Title</td>
            <td>
              <StringInput
                v-model="val.name"
              />
            </td>
          </tr>
          <tr>
            <td>Show progress bar</td>
            <td>
              <CheckboxInput
                v-model="val.showProgressBar"
              />
            </td>
            <td>Render a progress bar in the bottom part of the video in the widget.</td>
          </tr>
          <tr>
            <td>Show thumbnails</td>
            <td>
              <label class="mr-1"><input
                v-model="val.showThumbnails"
                class="mr-1"
                type="radio"
                :value="false"
              >Off</label>
              <label class="mr-1"><input
                v-model="val.showThumbnails"
                class="mr-1"
                type="radio"
                :value="'left'"
              >Left</label>
              <label class="mr-1"><input
                v-model="val.showThumbnails"
                class="mr-1"
                type="radio"
                :value="'right'"
              >Right</label>
            </td>
            <td>Render video thumbnails in the widget.</td>
          </tr>
          <tr>
            <td>Timestamp Format</td>
            <td>
              <StringInput
                v-model="val.timestampFormat"
              />
            </td>
            <td>
              Define how to display the timestamp. <br>
              Leave empty to not display the timestamp. <br>

              Example: <code>YYYY-MM-DD hh:mm:ss</code> <br>

              Reference: <br>
              <code>YYYY</code> Year <br>
              <code>MM</code> Month <br>
              <code>DD</code> Day <br>
              <code>hh</code> Hour <br>
              <code>mm</code> Minute <br>
              <code>ss</code> Second <br>
            </td>
          </tr>
          <tr>
            <td>Maximum number of playlist items displayed</td>
            <td>
              <input
                v-model="val.maxItemsShown"
                type="number"
                min="-1"
              >
            </td>
            <td>Max. number of items displayed in the playlist. Set to -1 for no limit.</td>
          </tr>
          <tr>
            <td>Custom CSS</td>
            <td>
              <textarea
                v-model="val.css"
                class="textarea"
              />
            </td>
            <td>
              <p>Classes that can be used for styling:</p>
              <table class="table">
                <thead>
                  <tr><th>Class</th><th>Description</th></tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(ex, idx) in css.classExamples"
                    :key="idx"
                  >
                    <td><code>{{ ex.class }}</code></td>
                    <td>{{ ex.desc }}</td>
                  </tr>
                </tbody>
              </table>

              <p><b>Examples:</b></p>
              <p
                v-for="(ex, idx) in css.codeExamples"
                :key="idx"
              >
                {{ ex.desc }}
                <pre><code>{{ ex.code }}</code></pre>
              </p>
            </td>
          </tr>
        </table>
      </section>
      <footer class="modal-card-foot">
        <button
          class="button is-small is-primary"
          @click="onSaveClick"
        >
          Save
        </button>
        <button
          class="button is-small is-primary"
          @click="onSaveAndCloseClick"
        >
          Save and close
        </button>
        <button
          class="button is-small"
          @click="onCancelClick"
        >
          Cancel
        </button>
      </footer>
    </div>
  </div>
</template>
<script setup lang="ts">
import { nextTick, onMounted, Ref, ref } from 'vue';
import { SongrequestModuleCustomCssPreset } from '../../../mod/modules/SongrequestModuleCommon'
import CheckboxInput from '../CheckboxInput.vue';
import StringInput from '../StringInput.vue';

const props = defineProps<{
  modelValue: SongrequestModuleCustomCssPreset,
}>()

const val = ref<SongrequestModuleCustomCssPreset>(props.modelValue)

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'save', val: SongrequestModuleCustomCssPreset): void
  (e: 'save-and-close', val: SongrequestModuleCustomCssPreset): void
}>()

const el = ref<HTMLDivElement>() as Ref<HTMLDivElement>

const css = {
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
    { class: ".meta-timestamp", desc: "Time at which the song was requested" },
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
      code: `.playing .title { overflow: hidden; white-space: nowrap; height: 20px; line-height: 20px; }
.playing .title-content { position: absolute; padding: 0 10px; min-width: 100%; animation: init 5s linear, back 10s linear 5s infinite; }
.playing .title-content.title-dupl { display: block; animation: back 10s linear 0s infinite; }
.title { margin-bottom: 0; }
.meta-left, .meta-right, .thumbnail { display: none; }
@keyframes back {
    from { transform: translateX(100%); }
    to { transform: translateX(-100%); }
}
@keyframes init {
    to { transform: translateX(-100%); }
}`,
    },
    {
      desc: "Replace icon for thumbs-up with an image",
      code: `.meta-right .vote-up { background: url('https://hyottoko.club/assets/hyottoko.30d2bcb9.png') no-repeat 0 center; background-size: 1em; padding-left: 1.2em; }
.meta-right .vote-up .fa { display: none; }`,
    },
    {
      desc: "Remove text before/after username",
      code: `.meta-user-text-before,
.meta-user-text-after {display: none}`,
    },
    {
      desc: "Add a fontawesome icon before username (\\f075 is the icon unicode, refer to https://fontawesome.com/v4.7/icons/)",
      code: `.meta-user-name::before { content: "${"\\f"}075"; display: inline-block; font: normal normal normal 14px/1 FontAwesome; font-size: inherit; margin-right: .5em; }`,
    },
    {
      desc: "Add an image icon before username",
      code: `.meta-user-name { background: url('https://hyottoko.club/assets/hyottoko.30d2bcb9.png') no-repeat 0 center; background-size: 1em; padding-left: 1.2em; }`,
    },
    {
      desc: "Add an image icon before username for specific user only",
      code: `[data-user="nc_para_" i] .meta-user-name { background: url('https://hyottoko.club/assets/hyottoko.30d2bcb9.png') no-repeat 0 center; background-size: 1em; padding-left: 1.2em; }`,
    },
    {
      desc: "Change item display depending on username (this one changes background and makes thumbnails black boxes)",
      code: `[data-user="nc_para_" i] { background: #dd0066; }
[data-user="nc_para_" i] .thumbnail img { display: none; }
[data-user="nc_para_" i] .thumbnail { background: black; }`,
    },
    {
      desc: "Show player left of the playlist (and limit its height to 320px)",
      code: `.wrapper { display: grid; grid-template-areas: "player playlist"; grid-template-columns: 50% auto; grid-template-rows: 320px; }
.player iframe { height: 320px; }`,
    },
    {
      desc: "Show thumbnails only, and display meta info above them",
      code: `.item { display: block; position: relative; padding: 0; color: white; }
.title, .meta-left, .meta-right { position: absolute; padding: .2em; background: rgba(244,0,90,.9); }
.meta-left { top: 0; left: 0; font-size: 1em; }
.meta-right { top: 0; right: 0; font-size: 1em; }
.title { bottom: 0; left: 0; right: 0; margin-bottom: 0; }
.thumbnail { width: auto; }`,
    },
    {
      desc: "Align thumbnails to the bottom",
      code: `.thumbnail { align-self: end; }`,
    },
    {
      desc: "Align thumbnails to the center",
      code: `.thumbnail { align-self: center; }`,
    },
    {
      desc: "Add a margin/padding to the thumbnails",
      code: `.thumbnail { padding: 20px; }`,
    },
    {
      desc: "Show number of plays not at player, but in icon form on the right near votes",
      code: `.meta-left .meta-user:after,
.meta-left .meta-plays { display: none; }
.meta-right .meta-plays { display: inline-block; }`,
    },
    {
      desc: "Show the progress bar only, and no video (progress bar above list)",
      code: `
.player { height: 5px; padding-bottom: 0; }
.progress { height: 5px; }`,
    },
    {
      desc: "Show the progress bar only, and no video (progress bar below list)",
      code: `
.wrapper { display: grid; grid-template-areas: "list" "player"; }
.player { height: 5px; padding-bottom: 0; grid-area: player }
.list { grid-area: list }
.progress { height: 5px; }`,
    },
  ],
}

const onSaveClick = (): void => {
  emit("save", val.value);
}

const onSaveAndCloseClick = (): void => {
  emit("save-and-close", val.value);
}

const onCancelClick = (): void => {
  emit("cancel");
}

const onCloseClick = (): void => {
  emit("cancel");
}

const onOverlayClick = (): void => {
  emit("cancel");
}

onMounted(() => {
  nextTick(() => {
    const inputEl = el.value.querySelector("input[type=\"text\"]");
    if (inputEl) {
      (inputEl as HTMLInputElement).focus();
    }
  })
})
</script>
<style scoped>
.modal-card {
  width: calc(100% - 2em);
}
.textarea:not([rows]) {
  min-width: 500px;
  min-height: 800px;
}
pre {
  padding: 0.5em 1em;
  max-width: 30vw;
  overflow: scroll;
}
pre code {
  max-width: none;
  overflow: auto;
  text-overflow: initial;
}
</style>
