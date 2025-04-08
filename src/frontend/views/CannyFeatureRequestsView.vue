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
import CannyWidget from '../components/CannyWidget.vue'
import NavbarElement from '../components/NavbarElement.vue'
</script>
