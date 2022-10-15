<template>
  <div>
    <table
      v-if="settings"
      ref="table"
      class="table is-striped"
    >
      <tbody>
        <tr>
          <td colspan="3">
            General
          </td>
        </tr>
        <tr>
          <td><code>settings.volume</code></td>
          <td>
            <volume-slider
              v-model="settings.volume"
              @update:modelValue="sendSettings"
            />
          </td>
          <td>Base volume for all songs played.</td>
        </tr>
        <tr>
          <td><code>settings.initAutoplay</code></td>
          <td>
            <CheckboxInput
              v-model="settings.initAutoplay"
              @update:modelValue="sendSettings"
            />
          </td>
          <td>If checked, the widget will autoplay when first opened.</td>
        </tr>
        <tr>
          <td><code>settings.hideVideoImage</code></td>
          <td>
            <image-upload
              v-model="settings.hideVideoImage"
              width="100px"
              height="50px"
              class="mb-1"
              @update:modelValue="hideVideoImageChanged"
            />
          </td>
          <td>Image to display when a video is hidden.</td>
        </tr>
        <tr>
          <td><code>settings.maxSongLength.viewer</code></td>
          <td>
            <duration-input
              v-model="settings.maxSongLength.viewer"
              @update:modelValue="sendSettings"
            />
          </td>
          <td>
            Limits the maximum duration of songs that viewers can add/request.
            (<code>0</code> = unlimited, for example: <code>5m</code>, <code>1h</code>, ...)
          </td>
        </tr>
        <tr>
          <td><code>settings.maxSongLength.mod</code></td>
          <td>
            <duration-input
              v-model="settings.maxSongLength.mod"
              @update:modelValue="sendSettings"
            />
          </td>
          <td>
            Limits the maximum duration of songs that mods can add/request.
            (<code>0</code> = unlimited, for example: <code>5m</code>, <code>1h</code>, ...)
          </td>
        </tr>
        <tr>
          <td><code>settings.maxSongLength.sub</code></td>
          <td>
            <duration-input
              v-model="settings.maxSongLength.sub"
              @update:modelValue="sendSettings"
            />
          </td>
          <td>
            Limits the maximum duration of songs that subscribers can add/request.
            (<code>0</code> = unlimited, for example: <code>5m</code>, <code>1h</code>, ...)
          </td>
        </tr>
        <tr>
          <td><code>settings.maxSongsQueued.viewer</code></td>
          <td>
            <input
              v-model="settings.maxSongsQueued.viewer"
              class="input is-small"
              type="number"
              @update:modelValue="sendSettings"
            >
          </td>
          <td>Number of new songs that viewers can request. (0 = unlimited)</td>
        </tr>
        <tr>
          <td><code>settings.maxSongsQueued.mod</code></td>
          <td>
            <input
              v-model="settings.maxSongsQueued.mod"
              class="input is-small"
              type="number"
              @update:modelValue="sendSettings"
            >
          </td>
          <td>Number of new songs that mods can request. (0 = unlimited)</td>
        </tr>
        <tr>
          <td><code>settings.maxSongsQueued.sub</code></td>
          <td>
            <input
              v-model="settings.maxSongsQueued.sub"
              class="input is-small"
              type="number"
              @update:modelValue="sendSettings"
            >
          </td>
          <td>Number of new songs that subscribers can request. (0 = unlimited)</td>
        </tr>
        <tr>
          <td colspan="3">
            Visuals
          </td>
        </tr>
        <tr>
          <td><code>settings.showProgressBar</code></td>
          <td>
            <CheckboxInput
              v-model="settings.showProgressBar"
              @update:modelValue="sendSettings"
            />
          </td>
          <td>Render a progress bar in the bottom part of the video in the widget.</td>
        </tr>
        <tr>
          <td><code>settings.showThumbnails</code></td>
          <td>
            <label class="mr-1"><input
              v-model="settings.showThumbnails"
              class="mr-1"
              type="radio"
              :value="false"
              @change="sendSettings"
            >Off</label>
            <label class="mr-1"><input
              v-model="settings.showThumbnails"
              class="mr-1"
              type="radio"
              :value="'left'"
              @change="sendSettings"
            >Left</label>
            <label class="mr-1"><input
              v-model="settings.showThumbnails"
              class="mr-1"
              type="radio"
              :value="'right'"
              @change="sendSettings"
            >Right</label>
          </td>
          <td>Render video thumbnails in the widget.</td>
        </tr>
        <tr>
          <td><code>settings.timestampFormat</code></td>
          <td>
            <StringInput
              v-model="settings.timestampFormat"
              @update:modelValue="sendSettings"
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
          <td><code>settings.maxItemsShown</code></td>
          <td>
            <input
              v-model="settings.maxItemsShown"
              type="number"
              min="-1"
              @update:modelValue="sendSettings"
            >
          </td>
          <td>Max. number of items displayed in the playlist. Set to -1 for no limit.</td>
        </tr>
        <tr>
          <td>
            <code>settings.customCss</code>

            <div class="field has-addons mr-1">
              <div class="control is-expanded">
                <input
                  v-model="cssPresetName"
                  class="input is-small"
                  @focus="cssPresetDropdownActive = true"
                  @blur="cssPresetDropdownActive = false"
                >
              </div>
              <div class="control">
                <span
                  class="button is-small"
                  @click="savePreset"
                >Save preset</span>
              </div>
            </div>

            <div
              v-for="(preset, idx) in settings.customCssPresets"
              :key="idx"
              class="mb-1"
            >
              <span
                class="button is-small"
                @click="loadPreset(preset.name)"
              >{{ preset.name }}</span>
              <span
                class="button is-small ml-1"
                @click="removePreset(preset.name)"
              ><i class="fa fa-remove" /></span>
            </div>
          </td>
          <td>
            <textarea
              v-model="settings.customCss"
              class="textarea"
              @update:modelValue="sendSettings"
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
      </tbody>
    </table>
  </div>
</template>
<script lang="ts">
import { defineComponent, PropType } from "vue";
import {
  default_settings,
  SongrequestModuleSettings,
} from "../../../mod/modules/SongrequestModuleCommon";
import { MediaFile } from "../../../types";
import CheckboxInput from "../CheckboxInput.vue";
import StringInput from "../StringInput.vue";

interface ComponentData {
  settings: SongrequestModuleSettings;
  cssPresetName: string;
  cssPresetDropdownActive: boolean;
  css: {
    classExamples: { class: string; desc: string }[];
    codeExamples: { code: string; desc: string }[];
  };
}

export default defineComponent({
    components: { CheckboxInput, StringInput },
    props: {
        modelValue: {
            type: Object as PropType<SongrequestModuleSettings>,
            required: true,
        },
    },
    emits: {
        "update:modelValue": null,
    },
    data: (): ComponentData => ({
        cssPresetName: "",
        cssPresetDropdownActive: false,
        settings: default_settings(),
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
        },
    }),
    created() {
        this.settings = this.modelValue;
    },
    methods: {
        loadPreset(presetName: string) {
            const preset = this.settings.customCssPresets.find((preset) => preset.name === presetName);
            if (preset) {
                this.settings.customCss = preset.css;
                this.settings.showProgressBar = preset.showProgressBar;
                this.settings.showThumbnails = preset.showThumbnails;
                this.settings.maxItemsShown = preset.maxItemsShown;
                this.settings.timestampFormat = preset.timestampFormat;
            }
            else {
                console.warn(`preset not found: ${presetName}`);
            }
            this.sendSettings();
        },
        removePreset(presetName: string) {
            this.settings.customCssPresets = this.settings.customCssPresets.filter((preset) => preset.name !== presetName);
            this.sendSettings();
        },
        savePreset() {
            const idx = this.settings.customCssPresets.findIndex((preset) => preset.name === this.cssPresetName);
            if (idx >= 0) {
                this.settings.customCssPresets[idx].css = this.settings.customCss;
                this.settings.customCssPresets[idx].showProgressBar =
                    this.settings.showProgressBar;
                this.settings.customCssPresets[idx].showThumbnails =
                    this.settings.showThumbnails;
                this.settings.customCssPresets[idx].maxItemsShown =
                    this.settings.maxItemsShown;
                this.settings.customCssPresets[idx].timestampFormat =
                    this.settings.timestampFormat;
            }
            else {
                this.settings.customCssPresets.push({
                    name: this.cssPresetName,
                    css: this.settings.customCss,
                    showProgressBar: this.settings.showProgressBar,
                    showThumbnails: this.settings.showThumbnails,
                    maxItemsShown: this.settings.maxItemsShown,
                    timestampFormat: this.settings.timestampFormat,
                });
            }
            this.sendSettings();
        },
        hideVideoImageChanged(file: MediaFile) {
            this.settings.hideVideoImage = file;
            this.sendSettings();
        },
        sendSettings() {
            this.$emit("update:modelValue", this.settings);
        },
    }
});
</script>

<style scoped>
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
