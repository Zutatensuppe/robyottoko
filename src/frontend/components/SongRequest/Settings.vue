<template>
  <div>
    <table
      v-if="settings"
      class="table is-striped is-fullwidth"
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
      </tbody>
    </table>
    <div>
      Visuals
      <span
        class="button is-small"
        @click="addPreset"
      >Add preset</span>
    </div>
    <table class="table is-striped">
      <tbody>
        <tr
          v-for="(preset, idx) in settings.customCssPresets"
          :key="idx"
        >
          <td>
            {{ preset.name }}
          </td>
          <td>
            <span
              class="button is-small"
              :disabled="idx === settings.customCssPresetIdx ? true : undefined"
              @click="loadPreset(idx)"
            ><i
              v-if="idx === settings.customCssPresetIdx"
              class="fa fa-check has-text-success mr-1"
            />{{ idx === settings.customCssPresetIdx ? 'This is the current preset' : 'Use this preset' }}</span>
          </td>
          <td>
            <span
              class="button is-small"
              @click="startEditPreset(idx)"
            ><i class="fa fa-pencil" /></span>
            <span
              class="button is-small ml-1"
              @click="removePreset(idx)"
            ><i class="fa fa-remove" /></span>
          </td>
        </tr>
      </tbody>
    </table>
    <PresetEditor
      v-if="editPreset"
      v-model="editPreset"
      @save="presetSave"
      @save-and-close="presetSaveAndClose"
      @cancel="editPreset = null"
    />
  </div>
</template>
<script lang="ts">
import { defineComponent, PropType } from "vue";
import {
  default_settings,
  default_custom_css_preset,
  SongrequestModuleCustomCssPreset,
  SongrequestModuleSettings,
} from "../../../mod/modules/SongrequestModuleCommon";
import { MediaFile } from "../../../types";
import CheckboxInput from "../CheckboxInput.vue";
import PresetEditor from "./PresetEditor.vue";

interface ComponentData {
  settings: SongrequestModuleSettings
  cssPresetName: string
  editPresetIdx: null | number
  editPreset: null | SongrequestModuleCustomCssPreset
}

export default defineComponent({
  components: { CheckboxInput, PresetEditor },
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
    settings: default_settings(),
    editPresetIdx: null,
    editPreset: null,
  }),
  created() {
    this.settings = this.modelValue;
  },
  methods: {
    startEditPreset(idx: number) {
      this.editPresetIdx = idx;
      this.editPreset = this.settings.customCssPresets[idx];
    },
    presetSave(preset: SongrequestModuleCustomCssPreset) {
      if (this.editPresetIdx === null) {
        return;
      }
      if (this.editPresetIdx === -1) {
        // put new commands on top of the list
        this.settings.customCssPresets.unshift(preset);
        this.settings.customCssPresetIdx += 1;
        this.editPresetIdx = this.settings.customCssPresetIdx
      }
      else {
        // otherwise edit the edited command
        this.settings.customCssPresets[this.editPresetIdx] = preset;
      }
      this.sendSettings();
    },
    presetSaveAndClose(preset: SongrequestModuleCustomCssPreset) {
      this.presetSave(preset)
      this.editPresetIdx = null
      this.editPreset = null
    },
    loadPreset(idx: number) {
      this.settings.customCssPresetIdx = idx
      this.sendSettings()
    },
    removePreset(idx: number) {
      this.settings.customCssPresets = this.settings.customCssPresets.filter((_preset, _idx) => _idx !== idx);
      if (this.settings.customCssPresets.length === 0) {
        const preset = default_custom_css_preset({ name: 'default' })
        this.settings.customCssPresets.push(preset)
        this.settings.customCssPresetIdx = 0
      } else {
        if (idx === this.settings.customCssPresetIdx) {
          this.settings.customCssPresetIdx = 0
        } else if (idx < this.settings.customCssPresetIdx) {
          this.settings.customCssPresetIdx -= 1
        }
      }
      this.sendSettings();
    },
    addPreset() {
      this.editPresetIdx = -1
      this.editPreset = default_custom_css_preset()
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
