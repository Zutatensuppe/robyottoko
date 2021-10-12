<template>
  <div class="columns">
    <div class="column is-four-fifth">
      <div class="control has-icons-left has-icons-right range slider">
        <input
          type="range"
          class="input is-small"
          :min="min"
          :max="max"
          v-model="curVal"
          @update:modelValue="valChange"
        />
        <span class="icon is-small is-left">
          <i class="fa" :class="iconLeft" />
        </span>
        <span class="icon is-small is-right">
          <i class="fa" :class="iconRight" />
        </span>
      </div>
    </div>
    <div class="column is-one-fifth">
      <input
        type="number"
        class="input is-small"
        v-model="curVal"
        @update:modelValue="valChange"
      />
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "slider",
  props: {
    modelValue: {
      type: Number,
      required: true,
    },
    iconLeft: String,
    iconRight: String,
    min: {
      type: Number,
      default: 0,
    },
    max: {
      type: Number,
      default: 100,
    },
  },
  data: () => ({
    curVal: 100,
  }),
  methods: {
    valChange() {
      this.$emit("update:modelValue", parseInt(`${this.curVal}`, 10));
    },
  },
  created() {
    this.curVal = this.modelValue;
  },
});
</script>
<style scoped>
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
  color: var(--main-color);
}

.slider input[type="range"]::-ms-track {
  background: var(--link-color);
  height: 2px;
}

.slider input[type="range"]::-moz-range-track {
  background: var(--link-color);
  height: 2px;
}

.slider input[type="range"]::-webkit-slider-runnable-track {
  background: var(--link-color);
  height: 2px;
}
</style>
