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
        board="bug-reports"
        board-token="38ecafc6-b250-8593-19bc-91eaac7710cd"
        base-path="/feedback/bug-reports"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import CannyWidget from '../components/CannyWidget.vue'
import NavbarElement from '../components/NavbarElement.vue'
</script>
