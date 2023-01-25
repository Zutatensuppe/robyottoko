<template>
  <div
    :class="`canny-${board}-view`"
  >
    <div data-canny />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { ApiUserData } from '../../types';
import user from '../user'

const me = ref<ApiUserData|null>(null)

const props = defineProps<{
  board: string,
  boardToken: string
  basePath: string,
}>()

const removeIframe = () => {
  const iframe = document.getElementById('canny-iframe')
  if (iframe) {
    iframe.parentElement?.removeChild(iframe)
  }
}
const onInit = () => {
  me.value = user.getMe()
  removeIframe()
  // @ts-ignore
  Canny('render', {
    boardToken: props.boardToken,
    basePath: props.basePath,
    ssoToken: me.value && me.value.cannyToken ? me.value.cannyToken : null,
  });
}

onMounted(() => {
  // @ts-ignore
  (function(w,d,i,s){function l(){if(!d.getElementById(i)){var f=d.getElementsByTagName(s)[0],e=d.createElement(s);e.type="text/javascript",e.async=!0,e.src="https://canny.io/sdk.js",f.parentNode.insertBefore(e,f)}}if("function"!=typeof w.Canny){var c=function(){c.q.push(arguments)};c.q=[],w.Canny=c,"complete"===d.readyState?l():w.attachEvent?w.attachEvent("onload",l):w.addEventListener("load",l,!1)}})(window,document,"canny-jssdk","script");
  onInit()
  user.eventBus.on('login', onInit)
  user.eventBus.on('logout', onInit)
})

onBeforeUnmount(() => {
  user.eventBus.off('login', onInit)
  user.eventBus.off('logout', onInit)
  removeIframe()
})
</script>
