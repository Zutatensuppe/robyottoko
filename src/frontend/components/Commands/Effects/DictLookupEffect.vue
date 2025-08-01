<template>
  <div>
    <table>
      <tr>
        <td>
          Language:
        </td>
        <td>
          <input
            v-model="val.data.lang"
            class="input is-small spaceinput mb-1"
          >
        </td>
        <td>
          <MacroSelect
            class="help"
            @selected="val.data.lang += $event.value"
          />
        </td>
      </tr>
      <tr>
        <td colspan="3">
          <span
            v-for="(lang, idx) in dictLangs"
            :key="idx"
            class="button is-small mr-1"
            :title="lang.title"
            @click="val.data.lang = lang.value"
          >{{ lang.flag }}</span>
        </td>
      </tr>
      <tr>
        <td>
          Phrase:
        </td>
        <td>
          <input
            v-model="val.data.phrase"
            class="input is-small spaceinput mb-1"
          >
        </td>
        <td>
          <MacroSelect
            class="help"
            @selected="val.data.phrase += $event.value"
          />
        </td>
      </tr>
      <tr>
        <td>
          Response:
        </td>
        <td colspan="2">
          <div class="help">
            Outputs the translation for the input phrase. The
            translation is always from/to english. <br>
            To let the user decide on the language use
            <code>$args(0)</code> as language, and
            <code>$args(1:)</code> as phrase. <br>
            If phrase is left empty, all arguments to the command will
            be used as the phrase.
          </div>
        </td>
      </tr>
    </table>
  </div>
</template>
<script setup lang="ts">
import type { DictLookupEffectData } from '../../../../types'
import { ref, watch } from 'vue'
import MacroSelect from '../../MacroSelect.vue'

const props = defineProps<{
  modelValue: DictLookupEffectData,
}>()

const dictLangs = [
  { value: 'ja', flag: '🇯🇵', title: 'Japanese' },
  { value: 'ru', flag: '🇷🇺', title: 'Russian' },
  { value: 'de', flag: '🇩🇪', title: 'German' },
  { value: 'es', flag: '🇪🇸', title: 'Spanish' },
  { value: 'fr', flag: '🇫🇷', title: 'French' },
  { value: 'it', flag: '🇮🇹', title: 'Italian' },
  { value: 'pt', flag: '🇵🇹/🇧🇷', title: 'Portuguese' },
]
const val = ref<DictLookupEffectData>(props.modelValue)

const emit = defineEmits<{
  (e: 'update:modelValue', val: DictLookupEffectData): void
}>()

watch(val, (newValue: DictLookupEffectData) => {
  emit('update:modelValue', newValue)
}, { deep: true })
</script>
