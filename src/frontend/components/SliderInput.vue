<template>
  <div class="columns">
    <div class="column is-four-fifth">
      <div class="control has-icons-left has-icons-right range slider">
        <input
          v-model="curVal"
          type="range"
          class="input is-small"
          :min="min"
          :max="max"
          @input="valChange"
        >
        <span class="icon is-small is-left">
          <i
            class="fa"
            :class="iconLeft"
          />
        </span>
        <span class="icon is-small is-right">
          <i
            class="fa"
            :class="iconRight"
          />
        </span>
      </div>
    </div>
    <div class="column is-one-fifth">
      <input
        v-model="curVal"
        type="number"
        class="input is-small"
        @input="valChange"
      >
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps({
  modelValue: { type: Number, required: true },
  iconLeft: String,
  iconRight: String,
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
})
const emit = defineEmits<{
  (e: 'update:modelValue', val: number): void
}>()
const curVal = ref<number>(props.modelValue)
const valChange = () => {
  emit('update:modelValue', parseInt(`${curVal.value}`, 10))
}
</script>
<style lang="scss" scoped>
@import "../vars.scss";

input[type="range"]::-webkit-slider-thumb {
  height: 16px;
  width: 16px;
  margin-top: -7px;
}

.slider {
  clear: none;
  /* display: inline-block; */
  /* width: 140px; */
  min-width: 100px;
  vertical-align: text-bottom;
}

.slider.control.has-icons-left .icon,
.slider.control.has-icons-right .icon {
  color: $main_color;
}

.slider input[type="range"]::-ms-track {
  background: $slider_color;
  height: 2px;
}

.slider input[type="range"]::-moz-range-track {
  background: $slider_color;
  height: 2px;
}

.slider input[type="range"]::-webkit-slider-runnable-track {
  background: $slider_color;
  height: 2px;
}
</style>
