<template>
  <div class="view">
    <div
      id="top"
      ref="top"
    >
      <NavbarElement />
      <div
        id="actionbar"
        class="p-1"
      >
        <button
          class="button is-small is-primary mr-1"
          :disabled="!changed"
          @click="sendSave"
        >
          Save
        </button>
        <a
          class="button is-small mr-1"
          :href="receiveWidgetUrl"
          target="_blank"
        >Open widget</a>
        <a
          class="button is-small"
          :href="drawUrl"
          target="_blank"
        >Open draw</a>
      </div>
    </div>
    <div
      id="main"
      ref="main"
    >
      <table
        v-if="inited"
        ref="table"
        class="table is-striped"
      >
        <tbody>
          <tr>
            <td colspan="3">
              General
            </td>
          </tr>
          <tr>
            <td><code>settings.canvasWidth</code></td>
            <td>
              <IntegerInput v-model="settings.canvasWidth" />
            </td>
            <td>
              Width of the drawing area.<br>
              Caution: changing this will clear the area for currenty connected
              users.
            </td>
          </tr>
          <tr>
            <td><code>settings.canvasHeight</code></td>
            <td>
              <IntegerInput v-model="settings.canvasHeight" />
            </td>
            <td>
              Height of the drawing area.<br>
              Caution: changing this will clear the area for currenty connected
              users.
            </td>
          </tr>
          <tr>
            <td><code>settings.displayDuration</code></td>
            <td>
              <IntegerInput v-model="settings.displayDuration" />
            </td>
            <td>
              The duration in Milliseconds that each drawing will be shown
            </td>
          </tr>
          <tr>
            <td>
              <code>settings.moderationAdmins</code>
            </td>
            <td>
              <StringsInput v-model="settings.moderationAdmins" />
            </td>
            <td>
              Add names of users who may moderate the drawcast.
              The users need to be logged in to hyottoko.club. <br>
              <strong>Moderation includes:</strong>
              <ul class="list">
                <li>deleting images on the drawcast page</li>
                <li>accepting/denying drawings if requireManualApproval is set (see below)</li>
              </ul>
            </td>
          </tr>
          <tr>
            <td>
              <code>settings.requireManualApproval</code>
            </td>
            <td>
              <CheckboxInput v-model="settings.requireManualApproval" />
            </td>
            <td>
              If checked, new drawings need to be approved before being
              displayed for anyone.
            </td>
          </tr>
          <tr>
            <td>
              Pending approval
              <br>
              <a
                class="button is-small mr-1"
                :href="controlWidgetUrl"
                target="_blank"
              >Open in separate tab</a>
            </td>
            <td>
              <div v-if="manualApproval.items.length">
                <div
                  v-for="(url, idx2) in manualApproval.items"
                  :key="idx2"
                  class="image-to-approve card mr-1"
                >
                  <div class="card-body">
                    <img
                      :src="url"
                      width="250"
                      class="thumbnail mr-1"
                    >
                  </div>
                  <div class="card-footer">
                    <span
                      class="
                        card-footer-item
                        button
                        is-small is-success is-light
                      "
                      @click="approveImage(url)"
                    >
                      Approve!
                    </span>
                    <span
                      class="
                        card-footer-item
                        button
                        is-small is-danger is-light
                      "
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
            </td>
            <td />
          </tr>
          <tr>
            <td><code>settings.displayLatestForever</code></td>
            <td>
              <CheckboxInput v-model="settings.displayLatestForever" />
            </td>
            <td>If checked, the latest drawing will be shown indefinately.</td>
          </tr>
          <tr>
            <td><code>settings.displayLatestAutomatically</code></td>
            <td>
              <CheckboxInput v-model="settings.displayLatestAutomatically" />
            </td>
            <td>
              If checked, the latest drawing will be shown in widget
              automatically.
            </td>
          </tr>
          <tr>
            <td><code>settings.autofillLatest</code></td>
            <td>
              <CheckboxInput v-model="settings.autofillLatest" />
            </td>
            <td>
              Fill the latest submitted drawing into the draw panel when opening
              the draw page.
            </td>
          </tr>
          <tr>
            <td><code>settings.submitButtonText</code></td>
            <td>
              <StringInput v-model="settings.submitButtonText" />
            </td>
            <td />
          </tr>
          <tr>
            <td><code>settings.submitConfirm</code></td>
            <td>
              <StringInput v-model="settings.submitConfirm" />
            </td>
            <td>
              Leave empty if no confirm is required by user before sending.
            </td>
          </tr>
          <tr>
            <td><code>settings.recentImagesTitle</code></td>
            <td>
              <StringInput v-model="settings.recentImagesTitle" />
            </td>
            <td>Title for the recently submitted images gallery.</td>
          </tr>
          <tr>
            <td><code>settings.customDescription</code></td>
            <td>
              <textarea
                v-model="settings.customDescription"
                class="textarea"
              />
            </td>
            <td>Description text below the drawing panel.</td>
          </tr>
          <tr>
            <td><code>settings.customProfileImage</code></td>
            <td>
              <ImageUpload
                v-model="settings.customProfileImage"
                width="100px"
                height="50px"
                class="spacerow media-holder"
                @update:model-value="customProfileImageChanged"
              />
            </td>
            <td>
              Profile image that will be displayed next to the
              <code>settings.customDescription</code>.
            </td>
          </tr>
          <tr>
            <td><code>settings.notificationSound</code></td>
            <td>
              <SoundUpload
                v-model="settings.notificationSound"
                class="spacerow media-holder"
                @update:model-value="notificationSoundChanged"
              />
            </td>
            <td>
              Add a sound here that plays when new drawings arrive. <br>
              This is played in this window, if approval is necessary, otherwise
              it will play in the display widget. It won't play in the draw
              widget.
            </td>
          </tr>
          <tr>
            <td>
              <div><code>settings.favoriteLists</code></div>
              <div>
                <span
                  class="button is-small"
                  @click="addFavoriteList"
                >Add a list</span>
              </div>
              <div class="preview">
                <img
                  v-if="favoriteSelection.hovered"
                  :src="favoriteSelection.hovered"
                >
              </div>
            </td>
            <td>
              <div
                v-for="(favoriteList, idx) in settings.favoriteLists"
                :key="idx"
                class="card p-2 mb-2"
              >
                <div v-if="settings.favoriteLists.length > 1">
                  <span
                    class="button is-small ml-1"
                    :class="{ 'is-disabled': idx > 0 }"
                    @click="moveFavoriteListUp(idx)"
                  ><i class="fa fa-chevron-up" /></span>
                  <span
                    class="button is-small ml-1"
                    :class="{
                      'is-disabled': idx < settings.favoriteLists.length - 1,
                    }"
                    @click="moveFavoriteListDown(idx)"
                  ><i class="fa fa-chevron-down" /></span>
                  <span
                    class="button is-small ml-1"
                    @click="removeFavoriteList(idx)"
                  ><i class="fa fa-trash" /></span>
                </div>
                <table>
                  <tr>
                    <td>Title:</td>
                    <td>
                      <StringInput v-model="favoriteList.title" />
                    </td>
                  </tr>
                  <tr>
                    <td>Currently selected favorites:</td>
                    <td>
                      <div class="favorites">
                        <img
                          v-for="(url, idx2) in favoriteList.list"
                          :key="idx2"
                          :src="url"
                          width="50"
                          height="50"
                          class="thumbnail is-favorited mr-1"
                          @click="toggleFavorite(idx, url)"
                          @mouseover="favoriteSelection.hovered = url"
                          @mouseleave="favoriteSelection.hovered = ''"
                        >
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td>All images:</td>
                    <td>
                      <div class="favorites-select">
                        <template
                          v-for="(url, idx2) in currentFavoriteSelectionItems"
                          :key="idx2"
                        >
                          <div class="favorites-select-image">
                            <img
                              :src="url"
                              width="100"
                              height="100"
                              class="thumbnail mr-1"
                              :class="{
                                'is-favorited': favoriteList.list.includes(url),
                              }"
                              @mouseover="favoriteSelection.hovered = url"
                              @mouseleave="favoriteSelection.hovered = ''"
                            >
                            <div class="buttons">
                              <span
                                class="button is-small"
                                @click="toggleFavorite(idx, url)"
                              >
                                <i
                                  class="fa fa-star"
                                  :class="{
                                    'has-text-warning': favoriteList.list.includes(url),
                                  }"
                                />
                              </span>
                              <DoubleclickButton
                                class="button is-small"
                                message="Are you sure?"
                                :timeout="1000"
                                @doubleclick="deleteImage(url)"
                              >
                                <i class="fa fa-trash" />
                              </DoubleclickButton>
                            </div>
                          </div>
                        </template>
                      </div>
                      <span
                        class="button is-small mr-1"
                        :disabled="
                          favoriteSelection.pagination.page > 1 ? undefined : true
                        "
                        @click="
                          favoriteSelection.pagination.page =
                            favoriteSelection.pagination.page - 1
                        "
                      >Prev</span>
                      <span
                        class="button is-small"
                        :disabled="
                          favoriteSelection.pagination.page <
                            favoriteSelectionTotalPages
                            ? undefined
                            : true
                        "
                        @click="
                          favoriteSelection.pagination.page =
                            favoriteSelection.pagination.page + 1
                        "
                      >Next</span>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
            <td>
              The favorites will always be displayed at the beginning of the
              gallery in the draw widget.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, computed, ref, watch, onBeforeUnmount } from 'vue'
import { arraySwap } from '../../common/fn'
import {
  default_settings,
  DrawcastImage,
} from '../../mod/modules/DrawcastModuleCommon'
import {
ApiUserData,
  DrawcastData,
  DrawcastFavoriteList,
  DrawcastSettings,
  MediaFile,
  SoundMediaFile,
} from '../../types'
import util from '../util'
import WsClient from '../WsClient'
import StringInput from '../components/StringInput.vue'
import IntegerInput from '../components/IntegerInput.vue'
import CheckboxInput from '../components/CheckboxInput.vue'
import DoubleclickButton from '../components/DoubleclickButton.vue'
import SoundUpload from '../components/SoundUpload.vue'
import ImageUpload from '../components/ImageUpload.vue'
import NavbarElement from '../components/NavbarElement.vue'
import StringsInput from '../components/StringsInput.vue'
import user from '../user'

interface ManualApproval {
  hovered: string
  items: string[]
}

interface FavoriteSelection {
  hovered: string
  items: string[]
  pagination: {
    page: number
    perPage: number
  }
}

const unchangedJson = ref<string>('{}')
const changedJson = ref<string>('{}')
const inited = ref<boolean>(false)
const settings = ref<DrawcastSettings>(default_settings())
const drawUrl = ref<string>('')
const notificationSoundAudio = ref<any>(null)
const manualApproval = ref<ManualApproval>({
  hovered: '',
  items: [],
})
const favoriteSelection = ref<FavoriteSelection>({
  hovered: '',
  items: [],
  pagination: {
    page: 1,
    perPage: 20,
  },
})
const controlWidgetUrl = ref<string>('')
const receiveWidgetUrl = ref<string>('')

let ws: WsClient | null = null
let me: ApiUserData | null = null


const changed = computed((): boolean => {
  return unchangedJson.value !== changedJson.value
})

const favoriteSelectionTotalPages = computed((): number => {
  const fav = favoriteSelection.value
  return (
    Math.floor(fav.items.length / fav.pagination.perPage) +
    (fav.items.length % fav.pagination.perPage === 0 ? 0 : 1)
  )
})

const currentFavoriteSelectionItems = computed((): string[] => {
  const fav = favoriteSelection.value
  const start = (fav.pagination.page - 1) * fav.pagination.perPage
  return fav.items.slice(start, start + fav.pagination.perPage)
})

const deleteImage = (path: string) => {
  sendMsg({ event: 'delete_image', path })
}
const approveImage = (path: string) => {
  sendMsg({ event: 'approve_image', path })
}
const denyImage = (path: string) => {
  sendMsg({ event: 'deny_image', path })
}
const addFavoriteList = (): void => {
  if (!settings.value) {
    console.warn('addFavoriteList: settings not initialized')
    return
  }
  settings.value.favoriteLists.push({
    list: [],
    title: '',
  })
}
const moveFavoriteListUp = (idx: number): void => {
  swapItems(idx - 1, idx)
}
const moveFavoriteListDown = (idx: number): void => {
  swapItems(idx + 1, idx)
}
const swapItems = (idx1: number, idx2: number): void => {
  arraySwap(settings.value.favoriteLists, idx1, idx2)
}
const removeFavoriteList = (index: number): void => {
  if (!settings.value) {
    console.warn('removeFavoriteList: settings not initialized')
    return
  }
  const favLists: DrawcastFavoriteList[] = []
  for (const idx in settings.value.favoriteLists) {
    if (parseInt(idx, 10) === parseInt(`${index}`, 10)) {
      continue
    }
    favLists.push(settings.value.favoriteLists[idx])
  }
  settings.value.favoriteLists = favLists
}
const toggleFavorite = (index: number, url: string): void => {
  if (!settings.value) {
    console.warn('toggleFavorite: settings.value not initialized')
    return
  }
  if (settings.value.favoriteLists[index].list.includes(url)) {
    settings.value.favoriteLists[index].list = settings.value.favoriteLists[index].list.filter((u: string) => u !== url)
  }
  else {
    settings.value.favoriteLists[index].list.push(url)
  }
}
const customProfileImageChanged = (file: MediaFile): void => {
  if (!settings.value) {
    console.warn('customProfileImageChanged: settings not initialized')
    return
  }
  settings.value.customProfileImage = file.file ? file : null
}
const notificationSoundChanged = (file: SoundMediaFile): void => {
  if (!settings.value) {
    console.warn('notificationSoundChanged: settings not initialized')
    return
  }
  settings.value.notificationSound = file.file ? file : null
}
const sendSave = (): void => {
  if (!settings.value) {
    console.warn('sendSave: settings not initialized')
    return
  }
  sendMsg({
    event: 'save',
    settings: {
      canvasWidth: parseInt(`${settings.value.canvasWidth}`, 10) || 720,
      canvasHeight: parseInt(`${settings.value.canvasHeight}`, 10) || 405,
      submitButtonText: settings.value.submitButtonText,
      submitConfirm: settings.value.submitConfirm,
      recentImagesTitle: settings.value.recentImagesTitle,
      customDescription: settings.value.customDescription,
      customProfileImage: settings.value.customProfileImage,
      displayDuration: parseInt(`${settings.value.displayDuration}`, 10) || 5000,
      displayLatestForever: settings.value.displayLatestForever,
      displayLatestAutomatically: settings.value.displayLatestAutomatically,
      autofillLatest: settings.value.autofillLatest,
      requireManualApproval: settings.value.requireManualApproval,
      notificationSound: settings.value.notificationSound,
      favoriteLists: settings.value.favoriteLists,
      moderationAdmins: settings.value.moderationAdmins,
    },
  })
}
const sendMsg = (data: any): void => {
  if (!ws) {
    console.warn('sendMsg: ws not initialized')
    return
  }
  if (!me) {
    console.warn('sendMsg: me not initialized')
    return
  }
  ws.send(JSON.stringify(Object.assign({}, data, {
    token: me.token,
  })))
}

watch(settings, (newValue) => {
  changedJson.value = JSON.stringify(newValue)
}, { deep: true })

onMounted(async () => {
  me = user.getMe()

  ws = util.wsClient('drawcast')
  ws.onMessage('init', async (data: DrawcastData) => {
    settings.value = data.settings
    unchangedJson.value = JSON.stringify(data.settings)
    drawUrl.value = data.drawUrl
    controlWidgetUrl.value = data.controlWidgetUrl
    receiveWidgetUrl.value = data.receiveWidgetUrl

    sendMsg({ event: 'get_all_images' })
  })
  ws.onMessage('all_images', (data: { images: DrawcastImage[] }) => {
    favoriteSelection.value.items = data.images.map((item: DrawcastImage) => item.path)
    if (settings.value.notificationSound) {
      notificationSoundAudio.value = new Audio(settings.value.notificationSound.urlpath)
      notificationSoundAudio.value.volume =
        settings.value.notificationSound.volume / 100
    }
    manualApproval.value.items = data.images
      .filter((item: DrawcastImage) => !item.approved)
      .map((item: DrawcastImage) => item.path)
    inited.value = true
  })
  ws.onMessage('approved_image_received', (data: {
    nonce: string;
    img: string;
    mayNotify: boolean;
  }) => {
    favoriteSelection.value.items = favoriteSelection.value.items.filter((img) => img !== data.img)
    manualApproval.value.items = manualApproval.value.items.filter((img) => img !== data.img)
    favoriteSelection.value.items.unshift(data.img)
    favoriteSelection.value.items = favoriteSelection.value.items.slice()
  })
  ws.onMessage('image_deleted', (data: {
    img: string;
  }) => {
    settings.value.favoriteLists = settings.value.favoriteLists.map(favoriteList => {
      favoriteList.list = favoriteList.list.filter(img => img !== data.img)
      return favoriteList
    })
    favoriteSelection.value.items = favoriteSelection.value.items.filter((img) => img !== data.img)
    manualApproval.value.items = manualApproval.value.items.filter((img) => img !== data.img)
  })
  ws.onMessage('denied_image_received', (data: {
    nonce: string;
    img: string;
    mayNotify: boolean;
  }) => {
    favoriteSelection.value.items = favoriteSelection.value.items.filter((img) => img !== data.img)
    manualApproval.value.items = manualApproval.value.items.filter((img) => img !== data.img)
  })
  ws.onMessage('image_received', (data: {
    nonce: string;
    img: string;
    mayNotify: boolean;
  }) => {
    favoriteSelection.value.items = favoriteSelection.value.items.filter((img) => img !== data.img)
    manualApproval.value.items = manualApproval.value.items.filter((img) => img !== data.img)
    favoriteSelection.value.items.unshift(data.img)
    favoriteSelection.value.items = favoriteSelection.value.items.slice()
    manualApproval.value.items.push(data.img)
    manualApproval.value.items = manualApproval.value.items.slice()
    if (data.mayNotify && notificationSoundAudio.value) {
      notificationSoundAudio.value.play()
    }
  })
  ws.connect()
})

onBeforeUnmount(() => {
  if (ws) {
    ws.disconnect()
  }
})
</script>

<style lang="scss">
.square {
  display: inline-block;
  padding: 1px;
  border: solid 2px #ccc;
  cursor: pointer;
  line-height: 0;
}

.square .square-inner {
  display: inline-block;
  width: 20px;
  height: 20px;
  margin: 1px;
}

.square input {
  display: none;
}

.preview {
  width: 250px;
}

.preview img {
  width: 100%;
}

.favorites-select img {
  border: solid 1px transparent;
}

.is-favorited,
.favorites-select img.is-favorited {
  border: solid 1px black;
}

.favorites-select {
  .favorites-select-image {
    position: relative;
    display: inline-block;

    .buttons {
      display: none;
    }
    &:hover {
      .buttons {
        display: block;
        position: absolute;
        top: 0;
        right: 0;
      }
    }
  }
}

.image-to-approve {
  display: inline-block;
}
</style>
