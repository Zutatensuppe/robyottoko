<template>
  <div>
    <table
      ref="table"
      class="table is-striped"
    >
      <tbody>
        <tr>
          <td><code>settings.volume</code></td>
          <td>
            <VolumeSlider
              v-model="val.volume"
              class="pr-5"
              @update:modelValue="sendSettings"
            />
          </td>
          <td>Base volume for all media playing from commands</td>
        </tr>
        <tr>
          <td><code>settings.emotes.displayFn</code></td>
          <td>
            <div>
              <div
                v-for="(displayFn, idx) in val.emotes.displayFn"
                :key="idx"
                class="field has-addons mb-1"
              >
                <div class="control">
                  <div
                    class="select is-small"
                  >
                    <select
                      v-model="val.emotes.displayFn[idx].fn"
                      @change="sendSettings"
                    >
                      <option
                        v-for="(fn, idx2) in possibleEmoteDisplayFunctions"
                        :key="idx2"
                        :value="fn"
                      >
                        {{ fn }}
                      </option>
                    </select>
                  </div>
                </div>
                <button
                  class="button is-small"
                  @click="rmFn(idx)"
                >
                  <i class="fa fa-remove" />
                </button>
              </div>
              <button
                class="button is-small"
                @click="addFn()"
              >
                <i class="fa fa-plus mr-1" /> Add
              </button>
            </div>
          </td>
          <td>
            When someone writes an emote in the chat, it will show up on the
            emote wall. <br>
            The functions added here define how the emotes move/behave on
            the emote wall. There needs to be at least one function added
            in order for emotes to display. <br>
            <i>Note:</i> Emote Wall effects on commands have separate settings,
            so whatever is setup here doesn't affect those.
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { EMOTE_DISPLAY_FN, GeneralModuleSettings, possibleEmoteDisplayFunctions } from '../../../mod/modules/GeneralModuleCommon'
import VolumeSlider from '../VolumeSlider.vue'

const props = defineProps<{
  modelValue: GeneralModuleSettings
}>()

const val = ref<GeneralModuleSettings>(JSON.parse(JSON.stringify(props.modelValue)))

const emit = defineEmits<{
  (e: 'update:modelValue', val: GeneralModuleSettings): void
}>()

const rmFn = (idx: number): void => {
  val.value.emotes.displayFn = val.value.emotes.displayFn.filter((_value, index) => index !== idx)
  sendSettings()
}

const addFn = (): void => {
  val.value.emotes.displayFn.push({
    fn: EMOTE_DISPLAY_FN.FLOATING_SPACE,
    args: [],
  })
  sendSettings()
}

watch(() => props.modelValue, (value: GeneralModuleSettings) => {
  val.value = JSON.parse(JSON.stringify(value))
})

const sendSettings = (): void => {
  console.log('send settings...')
  emit('update:modelValue', val.value)
}
</script>
