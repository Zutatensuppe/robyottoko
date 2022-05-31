<template>
  <div class="modal is-active">
    <div class="modal-background" @click="onClose"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Problems</p>
      </header>
      <section class="modal-card-body">
        <ol class="pl-4">
          <li v-for="(problem, idx) in problems" :key="idx">
            <div v-if="problem.message === 'access_token_invalid'">
              The Access Token for channel <b>{{ problem.details.channel_name }}</b> is invalid. Please go to
              <router-link :to="{ name: 'settings' }">Settings</router-link> and update the
              token.
            </div>
            <div v-else>{{ problem }}</div>
          </li>
        </ol>
      </section>
      <footer class="modal-card-foot">
        <button class="button is-small" @click="onClose">Close</button>
      </footer>
    </div>
  </div>
</template>
<script setup lang="ts">
import { PropType } from 'vue'
defineProps({
  problems: {
    type: Array as PropType<any[]>,
    required: true,
  },
})
const emit = defineEmits(['close'])
const onClose = () => {
  emit('close')
}
</script>
