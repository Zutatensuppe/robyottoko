<template>
  <tr>
    <td>
      Dict lookup:
      <div>
        Language:
        <div>
          <input
            v-model="val.data.lang"
            class="input is-small spaceinput mb-1"
          >
          <span
            v-for="(lang, idx) in dictLangs"
            :key="idx"
            class="button is-small mr-1"
            :title="lang.title"
            @click="val.data.lang = lang.value"
          >{{ lang.flag }}</span>
          <span
            class="button is-small mr-1"
            @click="val.data.lang = '$args(0)'"
          ><code>$args(0)</code></span>
        </div>
        <div>
          Phrase:
          <div>
            <input
              v-model="val.data.phrase"
              class="input is-small spaceinput mb-1"
            >
            <span
              class="button is-small mr-1"
              @click="val.data.phrase = ''"
            >All args</span>
            <span
              class="button is-small mr-1"
              @click="val.data.phrase = '$args(1:)'"
            ><code>$args(1:)</code></span>
          </div>
        </div>
        <div>
          Response:
          <div class="help">
            Outputs the translation for the input phrase. The
            translation is always from/to english. <br>
            To let the user decide on the language use
            <code>$args(0)</code> as language, and
            <code>$args(1:)</code> as phrase. <br>
            If phrase is left empty, all arguments to the command will
            be used as the phrase.
          </div>
        </div>
      </div>
      <button
        class="button is-small"
        @click="emit('removeClick')"
      >
        <i class="fa fa-remove" />
      </button>
    </td>
  </tr>
</template>
<script setup lang="ts">
import { DictLookupEffect } from '../../../../types';
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: DictLookupEffect,
}>()

const dictLangs = [
  { value: "ja", flag: "🇯🇵", title: "Japanese" },
  { value: "ru", flag: "🇷🇺", title: "Russian" },
  { value: "de", flag: "🇩🇪", title: "German" },
  { value: "es", flag: "🇪🇸", title: "Spanish" },
  { value: "fr", flag: "🇫🇷", title: "French" },
  { value: "it", flag: "🇮🇹", title: "Italian" },
  { value: "pt", flag: "🇵🇹/🇧🇷", title: "Portuguese" },
]
const val = ref<DictLookupEffect>(props.modelValue)

const emit = defineEmits(['update:modelValue', 'removeClick'])

watch(val, (newValue: DictLookupEffect) => {
  emit('update:modelValue', newValue)
})
</script>
