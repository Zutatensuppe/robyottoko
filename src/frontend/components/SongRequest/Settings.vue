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
            <VolumeSlider
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
            <ImageUpload
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
            <DurationInput
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
            <DurationInput
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
            <DurationInput
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
            <DoubleclickButton
              message="Are you sure?"
              :timeout="1000"
              class="button is-small ml-1"
              @doubleclick="removePreset(idx)"
            >
              <i class="fa fa-remove" />
            </DoubleclickButton>
            <button
              class="button is-small ml-1"
              @click="duplicatePreset(idx)"
            >
              <i class="fa fa-clone" />
            </button>
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
<script setup lang="ts">
import { ref } from "vue"
import { MediaFile } from "../../../types"
import {
  default_custom_css_preset,
  SongrequestModuleCustomCssPreset,
  SongrequestModuleSettings,
} from "../../../mod/modules/SongrequestModuleCommon"
import CheckboxInput from "../CheckboxInput.vue"
import DoubleclickButton from "../DoubleclickButton.vue"
import DurationInput from "../DurationInput.vue"
import ImageUpload from "../ImageUpload.vue"
import PresetEditor from "./PresetEditor.vue"
import VolumeSlider from "../VolumeSlider.vue"
import { presets } from "../../../mod/modules/SongrequestPresets"

const props = defineProps<{
  modelValue: SongrequestModuleSettings
}>()

const settings = ref<SongrequestModuleSettings>(props.modelValue)
const editPresetIdx = ref<null | number>(null)
const editPreset = ref<null | SongrequestModuleCustomCssPreset>(null)

const emit = defineEmits<{
  (e: 'update:modelValue', val: SongrequestModuleSettings): void
}>()

const startEditPreset = (idx: number): void => {
  editPresetIdx.value = idx
  editPreset.value = settings.value.customCssPresets[idx]
}

const presetSave = (preset: SongrequestModuleCustomCssPreset): void => {
  if (editPresetIdx.value === null) {
    return
  }
  if (editPresetIdx.value === -1) {
    // put new commands on top of the list
    settings.value.customCssPresets.unshift(preset)
    editPresetIdx.value = 0
    settings.value.customCssPresetIdx += 1
  }
  else {
    // otherwise edit the edited command
    settings.value.customCssPresets[editPresetIdx.value] = preset
  }
  sendSettings()
}

const presetSaveAndClose = (preset: SongrequestModuleCustomCssPreset): void => {
  presetSave(preset)
  editPresetIdx.value = null
  editPreset.value = null
}

const loadPreset = (idx: number): void => {
  settings.value.customCssPresetIdx = idx
  sendSettings()
}

const duplicatePreset = (idx: number): void => {
  editPresetIdx.value = -1
  const preset = default_custom_css_preset(settings.value.customCssPresets[idx])
  preset.name = `Copy of ${preset.name}`
  editPreset.value = preset
}

const removePreset = (idx: number): void => {
  settings.value.customCssPresets = settings.value.customCssPresets.filter((_preset, _idx) => _idx !== idx)
  if (settings.value.customCssPresets.length === 0) {
    settings.value.customCssPresets.push(...presets)
    settings.value.customCssPresetIdx = 0
  } else {
    if (idx === settings.value.customCssPresetIdx) {
      settings.value.customCssPresetIdx = 0
    } else if (idx < settings.value.customCssPresetIdx) {
      settings.value.customCssPresetIdx -= 1
    }
  }
  sendSettings()
}

const addPreset = (): void => {
  editPresetIdx.value = -1
  editPreset.value = default_custom_css_preset()
}

const hideVideoImageChanged = (file: MediaFile): void => {
  settings.value.hideVideoImage = file
  sendSettings()
}

const sendSettings = (): void => {
  emit('update:modelValue', settings.value)
}
</script>
