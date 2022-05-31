<template>
  <button class="doubleclick-button" @click="onClick">
    <slot />
    <span class="doubleclick-button-message mr-2 p-1 has-text-danger" v-if="timer">
      {{ message }}
      <span class="doubleclick-button-timout-indicator" :style="indicatorStyle"></span>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

const time = ref<number | null>(null)
const timer = ref<any>(null)

const emit = defineEmits(['click', 'doubleclick'])

const props = defineProps<{
  message: string,
  timeout: number,
}>()

const indicatorStyle = computed(() => {
  if (timer.value === null || time.value === null) {
    return {};
  }
  return {
    width: `${(time.value / props.timeout) * 100}%`,
  };
})

const onClick = () => {
  if (timer.value === null) {
    emit("click");
    time.value = props.timeout;
    timer.value = setInterval(() => {
      if (time.value) {
        time.value -= 10;
      }
      if (!time.value || time.value <= 0) {
        clearInterval(timer.value);
        timer.value = null;
        time.value = null;
      }
    }, 10);
  } else {
    emit("doubleclick");
    if (timer.value) {
      clearInterval(timer.value);
      timer.value = null;
      time.value = null;
    }
  }
}
</script>

<style scoped>
.doubleclick-button {
  position: relative;
}

.doubleclick-button-message {
  position: absolute;
  right: 100%;
  margin-right: 1em;
  background: #fff;
  border-style: solid;
  border-color: #dbdbdb;
  border-width: 1px;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.2);
}

.doubleclick-button-timout-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  display: block;
  height: 0;
  border-top: 2px solid;
}
</style>
