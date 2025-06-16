<template>
  <div>
    <table class="table">
      <tr
        v-for="(item, idx) in val"
        :key="idx"
      >
        <td><code>{{ item.type }}</code></td>
        <td>
          <EffectEditor
            v-model="val[idx]"
            :item-variables="itemVariables"
            :global-variables="globalVariables"
            :base-volume="baseVolume"
            :media-widget-url="mediaWidgetUrl"
            :media-v2-widget-url="mediaV2WidgetUrl"
            :roulette-widget-url="rouletteWidgetUrl"
          />
        </td>
        <td>
          <DoubleclickButton
            class="button is-small mr-1"
            message="Are you sure?"
            :timeout="1000"
            @doubleclick="onRmEffectClick(idx)"
          >
            <i class="fa fa-trash" />
          </DoubleclickButton>
        </td>
      </tr>
    </table>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { CommandEffectData, CommandVariable, GlobalVariable } from '../../../types'
import DoubleclickButton from '../DoubleclickButton.vue'
import EffectEditor from './EffectEditor.vue'

export interface AutocompletableVariable {
  var: CommandVariable | GlobalVariable;
  type: string;
}

const props = defineProps<{
  modelValue: CommandEffectData[]
  itemVariables: CommandVariable[]
  globalVariables: GlobalVariable[]
  baseVolume: number
  mediaWidgetUrl: string
  mediaV2WidgetUrl: string
  rouletteWidgetUrl: string
}>()

const val = ref<CommandEffectData[]>(props.modelValue)

const emit = defineEmits<{
  (e: 'update:modelValue', val: CommandEffectData[]): void
}>()

const onRmEffectClick = (idx: number) => {
  val.value = val.value.filter((_v, tmpIdx) => tmpIdx !== idx)
}

watch(val, (newValue: CommandEffectData[]) => {
  emit('update:modelValue', newValue)
})
</script>
