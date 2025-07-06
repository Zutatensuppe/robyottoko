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
        <button
          class="button is-small"
          @click="splitEntry(idx)"
        >
          Split
        </button>
        <button
          class="button is-small"
          @click="duplicateEntry(idx)"
        >
          Duplicate
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
  // Blues (32 shades)
  "#001219", "#001524", "#00182e", "#001b39", "#001e44", "#00214f", "#00245a", "#002866",
  "#002b71", "#002e7c", "#003187", "#003493", "#00379e", "#003aa9", "#003db4", "#0040c0",
  "#0052cc", "#0065d9", "#0077e6", "#008af2", "#009cff", "#19a5ff", "#33adff", "#4db6ff",
  "#66bfff", "#80c8ff", "#99d1ff", "#b3daff", "#cce3ff", "#e6f0ff", "#f0f7ff", "#f5faff",

  // Teals and Cyans (24 shades)
  "#006466", "#065a60", "#0b525b", "#144552", "#1b3a4b", "#212f45", "#272640", "#312244",
  "#3e1f47", "#4d194d", "#00b4d8", "#0096c7", "#0077b6", "#023e8a", "#03045e", "#0fa3b1",
  "#12b5c3", "#15c7d4", "#18d9e6", "#1becf8", "#4df0fa", "#7ff4fb", "#b2f7fd", "#e5fbfe",

  // Greens (32 shades)
  "#002800", "#003700", "#004600", "#005500", "#006400", "#007300", "#008200", "#009100",
  "#00a000", "#00af00", "#00be00", "#00cd00", "#00dc00", "#00eb00", "#00fa00", "#1aff1a",
  "#33ff33", "#4dff4d", "#66ff66", "#80ff80", "#99ff99", "#b3ffb3", "#ccffcc", "#e6ffe6",
  "#d8f3dc", "#b7e4c7", "#95d5b2", "#74c69d", "#52b788", "#40916c", "#2d6a4f", "#1b4332",

  // Yellows and Golds (24 shades)
  "#553900", "#664400", "#775000", "#885c00", "#996800", "#aa7400", "#bb8000", "#cc8c00",
  "#dd9800", "#eea400", "#ffb000", "#ffbb1a", "#ffc533", "#ffd04d", "#ffda66", "#ffe480",
  "#ffee99", "#fff8b3", "#fffccc", "#ffffe6", "#ffffd1", "#ffffbd", "#ffffa8", "#ffff94",

  // Oranges and Peaches (24 shades)
  "#4d1500", "#5c1900", "#6b1e00", "#7a2300", "#892800", "#982c00", "#a73100", "#b63600",
  "#c53b00", "#d44000", "#e34400", "#f24900", "#ff4e00", "#ff6219", "#ff7733", "#ff8b4d",
  "#ff9f66", "#ffb380", "#ffc799", "#ffdbb3", "#ffefcc", "#fff5e6", "#ffe8d6", "#ffdcc5",

  // Reds and Pinks (32 shades)
  "#3a0000", "#490000", "#580000", "#670000", "#760000", "#850000", "#940000", "#a30000",
  "#b20000", "#c10000", "#d00000", "#df0000", "#ee0000", "#fd0000", "#ff1a1a", "#ff3333",
  "#ff4d4d", "#ff6666", "#ff8080", "#ff9999", "#ffb3b3", "#ffcccc", "#ffe6e6", "#fff0f0",
  "#ffccd5", "#ffb3c1", "#ff99ac", "#ff8096", "#ff6681", "#ff4d6b", "#ff3356", "#ff1a40",

  // Purples and Lavenders (32 shades)
  "#240046", "#2b0057", "#320068", "#3a0078", "#420089", "#4b009a", "#5300ab", "#5c00bc",
  "#6400cc", "#6e00dd", "#7700ee", "#8000ff", "#8f1aff", "#9e33ff", "#ad4dff", "#bc66ff",
  "#cb80ff", "#da99ff", "#e9b3ff", "#f8ccff", "#f5e6ff", "#e0cfff", "#ccb9ff", "#b8a2ff",
  "#a48cff", "#9175ff", "#7d5fff", "#6a48ff", "#5632ff", "#431bf9", "#2f0bd3", "#1c00ad",

  // Browns and Earth Tones (24 shades)
  "#582f0e", "#6f4518", "#7f5539", "#936639", "#a68a64", "#b6ad90", "#c2c5aa", "#656d4a",
  "#414833", "#333d29", "#432818", "#543a21", "#6b4f2a", "#826034", "#9a723d", "#b18446",
  "#c89550", "#dea659", "#f4b762", "#f9c97c", "#ffd695", "#ffe2af", "#ffedc8", "#fff8e2",

  // Grays and Neutrals (32 shades)
  "#000000", "#0d0d0d", "#1a1a1a", "#262626", "#333333", "#404040", "#4d4d4d", "#595959",
  "#666666", "#737373", "#808080", "#8c8c8c", "#999999", "#a6a6a6", "#b3b3b3", "#bfbfbf",
  "#cccccc", "#d9d9d9", "#e6e6e6", "#f2f2f2", "#f5f5f5", "#f8f8f8", "#fafafa", "#fcfcfc",
  "#edede9", "#d6ccc2", "#e3d5ca", "#f5ebe0", "#f8edeb", "#fcd5ce", "#f9dcc4", "#fec89a"
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

const splitEntry = (idx: number): void => {
  if (idx < 0 || idx >= val.value.data.entries.length) {
    return
  }
  const entry = val.value.data.entries[idx]
  if (entry.weight <= 1) {
    return
  }
  const weight1 = Math.floor(entry.weight / 2)
  const weight2 = entry.weight - weight1

  // create two new entries with the same text and color, but different weights
  const newEntry1 = { text: entry.text, weight: weight1, color: entry.color }
  const newEntry2 = { text: entry.text, weight: weight2, color: entry.color }

  // replace the original entry with the two new entries
  val.value.data.entries.splice(idx, 1, newEntry1, newEntry2)
}

const duplicateEntry = (idx: number): void => {
  if (idx < 0 || idx >= val.value.data.entries.length) {
    return
  }
  const entry = val.value.data.entries[idx]
  const newEntry = { ...entry }
  val.value.data.entries.splice(idx + 1, 0, newEntry)
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
