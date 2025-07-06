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
              <option value="achanJp">
                achan_jp
              </option>
              <option value="achanJpSub">
                achan_jp (sub)
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
          @click="moveEntryUp(idx)"
        >
          <i class="fa fa-chevron-up" />
        </button>
        <button
          class="button is-small"
          @click="moveEntryDown(idx)"
        >
          <i class="fa fa-chevron-down" />
        </button>
        <button
          class="button is-small"
          @click="removeEntry(idx)"
        >
          <i class="fa fa-remove" />
        </button>
      </div>
      <div class="field">
        <div class="is-flex g-1">
          <button
            class="button is-small"
            @click="addEntry"
          >
            <i class="fa fa-plus mr-1" /> Add entry
          </button>
          <button
            class="button is-small"
            @click="shuffleEntries"
          >
            Shuffle
          </button>
          <button
            class="button is-small"
            @click="randomColors"
          >
            Random Colors (Grouped by Text)
          </button>
          <button
            class="button is-small"
            @click="superRandomColors"
          >
            Random Colors (completely random)
          </button>
          <button
            class="button is-small"
            @click="splitUpEntries"
          >
            Split Up Entries
          </button>
          <button
            class="button is-small"
            @click="joinEntries"
          >
            Join Entries
          </button>
        </div>
      </div>
      <div class="wheel-preview">
        <RouletteWheel
          :data="val.data"
          :autostart="false"
        />
      </div>
    </div>
    <div>
      Chat message at wheel start:
      <StringInput v-model="val.data.startMessage" />
    </div>
    <div>
      Chat message at wheel end:
      <StringInput v-model="val.data.endMessage" />
      <small>Use $entry.text to include the winning entry.</small>
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
import { shuffle } from '../../../../common/fn'
import RouletteWheel from '../../Roulette/RouletteWheel.vue'

const props = defineProps<{
  modelValue: RouletteEffectData,
  widgetUrl: string,
}>()

const val = ref<RouletteEffectData>(props.modelValue)

// color palette for random colors
const colorPalette: string[] = [
  // Blues
  "#0466c8", "#0353a4", "#023e7d", "#002855", "#001845", "#001233", "#33415c", "#5c677d",
  // Teals and Cyans
  "#7ae7c7", "#5ddeb1", "#41d49c", "#30c487", "#26a96c", "#1e8f5e", "#187b4d", "#14693f",
  // Greens
  "#2dc653", "#57cc99", "#80ed99", "#c7f9cc", "#38b000", "#70e000", "#9ef01a", "#ccff33",
  // Yellows and Golds
  "#ffea00", "#ffdd00", "#ffd000", "#ffc300", "#ffb700", "#ffaa00", "#ff9e00", "#ff9100",
  // Oranges and Peaches
  "#ff8500", "#ff7900", "#ff6d00", "#ff6000", "#ff5400", "#ff4800", "#ff3c00", "#ff3000",
  // Reds and Pinks
  "#ef476f", "#f7567c", "#ff6b8b", "#ff8fa3", "#ffb3c1", "#ffccd5", "#fff0f3", "#ff8fab",
  // Purples and Lavenders
  "#7b2cbf", "#9d4edd", "#c77dff", "#e0aaff", "#6247aa", "#7251b5", "#8566c5", "#9a80d5",
  // Neutrals and Earth Tones
  "#dad7cd", "#a3b18a", "#588157", "#3a5a40", "#344e41", "#6c584c", "#a98467", "#f0ead2"
];

const randomColors = (): void => {
  if (val.value.data.entries.length === 0) {
    return
  }
  // assign a random color from the palette to each entry.
  // if the text was already set, use color of first entry with that text
  const textToColorMap: Map<string, string> = new Map()
  for (const entry of val.value.data.entries) {
    if (textToColorMap.has(entry.text)) {
      entry.color = textToColorMap.get(entry.text)!
    } else {
      // assign a random color from the palette
      const randomIndex = Math.floor(Math.random() * colorPalette.length)
      entry.color = colorPalette[randomIndex]
      textToColorMap.set(entry.text, entry.color)
    }
  }
}

const superRandomColors = (): void => {
  if (val.value.data.entries.length === 0) {
    return
  }
  // assign a random color from the palette to each entry.
  for (const entry of val.value.data.entries) {
    const randomIndex = Math.floor(Math.random() * colorPalette.length)
    entry.color = colorPalette[randomIndex]
  }
}

const shuffleEntries = (): void => {
  if (val.value.data.entries.length > 0) {
    val.value.data.entries = shuffle(val.value.data.entries)
  }
}
const joinEntries = (): void => {
  const entries = val.value.data.entries
  if (entries.length === 0) {
    return
  }

  // count how often each value appears
  const combinedMap = new Map<string, number>()

  let keyMode: 'text|weight' | 'text' = 'text|weight'

  for (const entry of entries) {
    const key = `${entry.text}|${entry.weight}`
    if (combinedMap.has(key)) {
      // increase count for the value
      const existingCount = combinedMap.get(key)!
      combinedMap.set(key, existingCount + 1)
    } else {
      // set count to 1 for the value
      combinedMap.set(key, 1)
    }
  }

  // get maximum count:
  let maxCount = Math.max(...Array.from(combinedMap.values()))

  // if maximum count is <= 1, we try again with just the text as key
  if (maxCount <= 1) {
    keyMode = 'text'
    combinedMap.clear()
    for (const entry of entries) {
      const key = entry.text
      if (combinedMap.has(key)) {
        // increase count for the value
        const existingCount = combinedMap.get(key)!
        combinedMap.set(key, existingCount + 1)
      } else {
        // set count to 1 for the value
        combinedMap.set(key, 1)
      }
    }
    maxCount = Math.max(...Array.from(combinedMap.values()))
  }

  if (maxCount <= 1) {
    return
  }

  // foreach of the values that have maxCount, remove the exactly second occurance of them
  // eg. maxCount: 3, array before is [1,3,2,3,1,3,1,3], it would become [1,3,2,1,3,1]
  for (const [key, count] of combinedMap.entries()) {
    if (count !== maxCount) {
      continue
    }
    const parts = key.split('|')
    const text = parts[0]
    const weight = parseInt(parts[1], 10)

    let firstIndex = -1
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      if (keyMode === 'text') {
        // if we are in text mode, we only compare the text
        if (entry.text === text) {
          // if it is the first occurance, mark its index
          if (firstIndex === -1) {
            firstIndex = i
            continue
          }
          // if it is the second occurance, remove it, and add the weight to the first occurance
          // color is used from the first occurance
          entries[firstIndex].weight += entry.weight
          entries.splice(i, 1)

          // prepare for next pair of entries
          firstIndex = -1
        }
      } else if (entry.text === text && entry.weight === weight) {
        // if it is the first occurance, mark its index
        if (firstIndex === -1) {
          firstIndex = i
          continue
        }
        // if it is the second occurance, remove it, and add the weight to the first occurance
        // color is used from the first occurance
        entries[firstIndex].weight += entry.weight
        entries.splice(i, 1)

        // prepare for next pair of entries
        firstIndex = -1
      }
    }

    val.value.data.entries = shuffle(entries)
  }
}

const splitUpEntries = (): void => {
  if (val.value.data.entries.length === 0) {
    return
  }
  const biggestWeight = Math.max(...val.value.data.entries.map(e => e.weight))
  if (biggestWeight <= 1) {
    return
  }

  const entries = [...val.value.data.entries]
  const newEntries: any[] = []
  for (const entry of entries) {
    if (entry.weight != biggestWeight) {
      newEntries.push(entry)
    } else {
      const weight1 = Math.floor(entry.weight / 2)
      const weight2 = entry.weight - weight1

      newEntries.push({
        text: entry.text,
        weight: weight1,
        color: entry.color,
      })
      newEntries.push({
        text: entry.text,
        weight: weight2,
        color: entry.color,
      })
    }
  }
  val.value.data.entries = shuffle(newEntries)
}

const moveEntryUp = (idx: number): void => {
  moveEntry(idx, -1)
}

const moveEntryDown = (idx: number): void => {
  moveEntry(idx, 1)
}

const moveEntry = (idx: number, direction: -1 | 1): void => {
  if (idx < 0 || idx >= val.value.data.entries.length) {
    return
  }
  const newIdx = idx + direction
  if (newIdx < 0 || newIdx >= val.value.data.entries.length) {
    return
  }
  const entries = [...val.value.data.entries]
  const tmp = entries[idx]
  entries[idx] = entries[newIdx]
  entries[newIdx] = tmp
  val.value.data.entries = entries
}

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
<style lang="scss" scoped>
.wheel-preview {
  max-width: 500px;
}
.g-1 {
  gap: 1em;
}
</style>
