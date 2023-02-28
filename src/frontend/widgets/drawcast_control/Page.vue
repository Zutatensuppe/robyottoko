<template>
  <div class="p-2">
    <h1 class="title">
      Drawings awaiting approval
    </h1>
    <div v-if="manualApproval.items.length">
      <div
        v-for="(url, idx2) in manualApproval.items"
        :key="idx2"
        class="image-to-approve card mr-1"
      >
        <div class="card-body">
          <img
            :src="url"
            class="thumbnail mr-1"
          >
        </div>
        <div class="card-footer">
          <span
            class="card-footer-item button is-small is-success is-light"
            @click="approveImage(url)"
          >
            Approve!
          </span>
          <span
            class="card-footer-item button is-small is-danger is-light"
            @click="denyImage(url)"
          >
            Deny!
          </span>
        </div>
      </div>
    </div>
    <div v-else>
      Currently there are no drawings awaiting approval.
    </div>
  </div>
</template>
<script setup lang="ts">
import { ApiUserData, DrawcastData } from '../../../types'
import { DrawcastImage } from '../../../mod/modules/DrawcastModuleCommon'
import { onMounted, onUnmounted, ref } from 'vue'
import util, { WidgetApiData } from '../util'
import WsClient from '../../WsClient'
import user from '../../user'

const props = defineProps<{
  wdata: WidgetApiData,
}>()

let ws: WsClient | null = null
let me: ApiUserData | null = null
const notificationSoundAudio = ref<any>(null)
const manualApproval = ref<{ items: string[] }>({ items: [] })

// @ts-ignore
import('./main.scss')

const approveImage = (path: string) => {
  sendMsg({ event: 'approve_image', path })
}

const denyImage = (path: string) => {
  sendMsg({ event: 'deny_image', path })
}

const sendMsg = (data: any) => {
  if (!ws) {
    console.warn('sendMsg: ws not initialized')
    return
  }
  if (!me) {
    console.warn('sendMsg: me not initialized')
    return
  }
  ws.send(JSON.stringify(Object.assign({}, data, {
    token: me.token
  })))
}

onMounted(() => {
  me = user.getMe()
  if (!me) {
    return
  }
  ws = util.wsClient(props.wdata)
  ws.onMessage('init', async (data: DrawcastData) => {
    sendMsg({ event: 'get_all_images' })

    if (data.settings.notificationSound) {
      notificationSoundAudio.value = new Audio(
        data.settings.notificationSound.urlpath
      )
      notificationSoundAudio.value.volume =
        data.settings.notificationSound.volume / 100.0
    }
  })
  ws.onMessage(
    'all_images',
    (data: { images: DrawcastImage[] }) => {
    manualApproval.value.items = data.images
      .filter((item: DrawcastImage) => !item.approved)
      .map((item: DrawcastImage) => item.path)
    }
  ),
  ws.onMessage(
    'approved_image_received',
    (data: { nonce: string; img: string; mayNotify: boolean }) => {
      manualApproval.value.items = manualApproval.value.items.filter(
        (img) => img !== data.img
      )
    }
  )
  ws.onMessage(
    'denied_image_received',
    (data: { nonce: string; img: string; mayNotify: boolean }) => {
      manualApproval.value.items = manualApproval.value.items.filter(
        (img) => img !== data.img
      )
    }
  )
  ws.onMessage(
    'image_received',
    (data: { nonce: string; img: string; mayNotify: boolean }) => {
      manualApproval.value.items = manualApproval.value.items.filter(
        (img) => img !== data.img
      )

      manualApproval.value.items.push(data.img)
      manualApproval.value.items = manualApproval.value.items.slice()

      if (data.mayNotify && notificationSoundAudio.value) {
        notificationSoundAudio.value.play()
      }
    }
  )
  ws.connect()
})

onUnmounted(() => {
  if (ws) {
    ws.disconnect()
  }
})
</script>
