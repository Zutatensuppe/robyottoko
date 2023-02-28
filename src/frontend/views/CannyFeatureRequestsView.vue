<template>
  <div class="view">
    <div
      id="top"
      ref="top"
    >
      <NavbarElement />
    </div>
    <div
      id="main"
      ref="main"
    >
      <CannyWidget
        board="feature-requests"
        board-token="027f078d-5633-2d64-9f7f-10fd7b43a500"
        base-path="/feedback/feature-requests"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import CannyWidget from '../components/CannyWidget.vue'
import NavbarElement from '../components/NavbarElement.vue'
import user from '../user'

const showLogin = ref<boolean>(false)

const onInit = () => {
  showLogin.value = false
}

onMounted(() => {
  user.eventBus.on('login', onInit)
})

onBeforeUnmount(() => {
  user.eventBus.off('login', onInit)
})
</script>
