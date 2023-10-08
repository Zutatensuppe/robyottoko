<template>
  <div ref="el">
    <div>
      Widgets:
      <div
        v-if="val.data.widgetIds.length === 0"
        class="field has-addons"
      >
        This roulette will show in the&nbsp;
        <a
          :href="`${widgetUrl}`"
          target="_blank"
        >default widget</a>.
      </div>
      <div
        v-for="(id, idx) in val.data.widgetIds"
        :key="idx"
        class="field has-addons"
      >
        <div class="control mr-1">
          <StringInput v-model="val.data.widgetIds[idx]" />
        </div>
        <a
          class="button is-small mr-1"
          :href="`${widgetUrl}?id=${encodeURIComponent(id)}`"
          target="_blank"
        >Open widget</a>
        <button
          class="button is-small"
          @click="rmWidgetId(idx)"
        >
          <i class="fa fa-remove" />
        </button>
      </div>
      <div class="field">
        <button
          class="button is-small"
          @click="addWidgetId"
        >
          <i class="fa fa-plus mr-1" /> Add widget
        </button>
      </div>
      <div>
        <p class="help">
          Define in which widgets this roulette should show up in.
          Leave the list empty to only show in the default widget.
        </p>
      </div>
    </div>
    <div>
      Theme
      <div class="field has-addons">
        <div class="control">
          <div
            class="select is-small"
          >
            <select v-model="val.data.theme">
              <option value="default">
                default (hyottoko)
              </option>
              <option value="trickOrTreat">
                trick or treat
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>
    <div>
      Entries:
      <div
        v-for="(entry, idx) in val.data.entries"
        :key="idx"
        class="field has-addons"
      >
        <div class="control">
          <StringInput v-model="entry.text" />
        </div>
        <div class="control">
          <IntegerInput v-model="entry.weight" />
        </div>
        <div class="control">
          <input
            v-model="entry.color"
            class="input is-small"
            type="color"
          >
        </div>
        <button
          class="button is-small"
          @click="removeEntry(idx)"
        >
          <i class="fa fa-remove" />
        </button>
      </div>
      <div class="field">
        <button
          class="button is-small"
          @click="addEntry"
        >
          <i class="fa fa-plus mr-1" /> Add entry
        </button>
      </div>
    </div>
    <div>
      Spin Duration:
      <DurationInput v-model="val.data.spinDurationMs" />
    </div>
    <div>
      Winner Display Duration:
      <DurationInput v-model="val.data.winnerDisplayDurationMs" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { RouletteEffectData } from '../../../../types'
import { newRouletteEntry } from '../../../../common/commands'
import StringInput from '../../StringInput.vue'
import IntegerInput from '../../IntegerInput.vue'
import DurationInput from '../../DurationInput.vue'

const props = defineProps<{
  modelValue: RouletteEffectData,
  widgetUrl: string,
}>()

const val = ref<RouletteEffectData>(props.modelValue)

const addWidgetId = (): void => {
  val.value.data.widgetIds.push('')
}

const rmWidgetId = (idx: number): void => {
  val.value.data.widgetIds = val.value.data.widgetIds.filter((_val: string, index: number) => index !== idx)
}

const addEntry = (): void => {
  val.value.data.entries.push(newRouletteEntry())
}

const removeEntry = (idx: number): void => {
  val.value.data.entries = val.value.data.entries.filter((_val: any, index: number) => index !== idx)
}
</script>
