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
        <a
          class="button is-small mr-1"
          :href="controlWidgetUrl"
          target="_blank"
        >Open control widget</a>
        <a
          class="button is-small mr-1"
          :href="displayWidgetUrl"
          target="_blank"
        >Open display widget</a>
      </div>
    </div>
    <div
      v-if="inited"
      id="main"
      ref="main"
    >
      <div class="tabs">
        <ul>
          <li
            v-for="(def, idx) in tabDefinitions"
            :key="idx"
            :class="{ 'is-active': tab === def.tab }"
            @click="tab = def.tab"
          >
            <a>{{ def.title }}</a>
          </li>
        </ul>
      </div>
      <table
        v-if="tab === 'settings'"
        class="table is-striped"
      >
        <tbody>
          <tr>
            <td colspan="3">
              General
            </td>
          </tr>
          <tr>
            <td><code>settings.style.bgColor</code></td>
            <td>
              <input
                v-model="settings.styles.bgColor"
                class="input is-small"
                type="color"
                @update:modelValue="sendSave"
              >
            </td>
            <td>
              <button
                class="button is-small"
                :disabled="
                  settings.styles.bgColor === defaultSettings.styles.bgColor
                "
                @click="
                  settings.styles.bgColor = defaultSettings.styles.bgColor
                "
              >
                Reset to default
              </button>
            </td>
          </tr>
          <tr>
            <td><code>settings.style.bgColorEnabled</code></td>
            <td>
              <CheckboxInput
                v-model="settings.styles.bgColorEnabled"
                @update:modelValue="sendSave"
              />
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="tab === 'avatars'">
        <table class="table is-striped">
          <thead>
            <tr>
              <th />
              <th />
              <th>Preview</th>
              <th>Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <vue-draggable
            :model-value="settings.avatarDefinitions"
            tag="tbody"
            handle=".handle"
            item-key="id"
            @end="dragEnd"
          >
            <template #item="{ element, index }">
              <tr>
                <td class="pt-4 handle">
                  <i class="fa fa-arrows" />
                </td>
                <td class="pl-0 pr-0">
                  <button
                    class="button is-small"
                    @click="edit(index)"
                  >
                    <i class="fa fa-pencil" />
                  </button>
                </td>
                <td>
                  <AvatarPreview :avatar="element" />
                </td>
                <td>
                  {{ element.name }}
                </td>
                <td class="pl-0 pr-0">
                  <DoubleclickButton
                    class="button is-small mr-1"
                    message="Are you sure?"
                    :timeout="1000"
                    @doubleclick="remove(index)"
                  >
                    <i class="fa fa-trash" />
                  </DoubleclickButton>
                  <button
                    class="button is-small mr-1"
                    @click="duplicate(index)"
                  >
                    <i class="fa fa-clone" />
                  </button>
                  <a
                    class="button is-small mr-1"
                    :href="controlWidgetUrl + '?avatar=' + element.name"
                    target="_blank"
                  ><i class="fa fa-external-link mr-1" /> Control widget</a>
                  <a
                    class="button is-small"
                    :href="displayWidgetUrl + '?avatar=' + element.name"
                    target="_blank"
                  ><i
                    class="fa fa-external-link mr-1"
                  /> Display widget</a>
                </td>
              </tr>
            </template>
          </vue-draggable>
        </table>

        <AvatarEditor
          v-if="editEntity"
          :model-value="editEntity"
          @update:model-value="updatedAvatar"
          @cancel="editEntity = null"
        />

        <span
          class="button is-small mr-1"
          @click="addAvatar"
        >Add new avatar</span>
        <span
          class="button is-small"
          @click="addExampleAvatar"
        >Add example avatar (Hyottoko-Chan)</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import fn, { logger } from '../../common/fn'
import {
  AvatarModuleAvatarDefinition,
  AvatarModuleSettings,
  AvatarModuleWsInitData,
  AvatarModuleWsSaveData,
  default_settings,
} from '../../mod/modules/AvatarModuleCommon'
import AvatarEditor from '../components/Avatar/AvatarEditor.vue'
import AvatarPreview from '../components/Avatar/AvatarPreview.vue'
import util from '../util'
import WsClient from '../WsClient'
import DoubleclickButton from '../components/DoubleclickButton.vue'
import NavbarElement from '../components/NavbarElement.vue'
import hyottokoChan from './avatar_hyottoko_chan'
import CheckboxInput from '../components/CheckboxInput.vue'

const log = logger('AvatarView.vue')

interface TabDefinition {
  tab: 'settings' | 'avatars';
  title: string;
}

const tabDefinitions: TabDefinition[] = [
  { tab: 'avatars', title: 'Avatars' },
  { tab: 'settings', title: 'Settings' },
]

let ws: WsClient | null = null
const editIdx = ref<number>(-1)
const editEntity = ref<AvatarModuleAvatarDefinition | null>(null)
const settings = ref<AvatarModuleSettings>(default_settings())
const defaultSettings = ref<AvatarModuleSettings>(default_settings())
const inited = ref<boolean>(false)
const tab = ref<'avatars' | 'settings'>('avatars')
const controlWidgetUrl = ref<string>('')
const displayWidgetUrl = ref<string>('')

const edit = (idx: number) => {
  editIdx.value = idx
  editEntity.value = settings.value.avatarDefinitions[idx]
}

const remove = (idx: number) => {
  settings.value.avatarDefinitions = settings.value.avatarDefinitions.filter((val, index) => index !== idx)
  sendSave()
}

const duplicate = (idx: number) => {
  editIdx.value = settings.value.avatarDefinitions.length
  editEntity.value = JSON.parse(JSON.stringify(settings.value.avatarDefinitions[idx]))
}

const updatedAvatar = (avatar: AvatarModuleAvatarDefinition) => {
  settings.value.avatarDefinitions[editIdx.value] = avatar
  sendSave()
}

const addAvatar = () => {
  const avatar: AvatarModuleAvatarDefinition = {
    name: 'Unnamed Avatar',
    width: 64,
    height: 64,
    stateDefinitions: [
      { value: 'default', deletable: false },
      { value: 'speaking', deletable: false },
    ],
    slotDefinitions: [],
    state: {
      slots: {},
      lockedState: 'default',
    },
  }
  editIdx.value = settings.value.avatarDefinitions.length
  editEntity.value = avatar
}

const addExampleAvatar = () => {
  const avatar = JSON.parse(JSON.stringify(hyottokoChan)) as AvatarModuleAvatarDefinition
  editIdx.value = settings.value.avatarDefinitions.length
  editEntity.value = avatar
}

const sendSave = () => {
  sendMsg({ event: 'save', settings: settings.value })
}

const sendMsg = (data: AvatarModuleWsSaveData) => {
  if (!ws) {
    log.warn('sendMsg: ws not initialized')
    return
  }
  ws.send(JSON.stringify(data))
}

const dragEnd = (evt: {
  oldIndex: number;
  newIndex: number;
}) => {
  settings.value.avatarDefinitions = fn.arrayMove(settings.value.avatarDefinitions, evt.oldIndex, evt.newIndex)
  sendSave()
}

onMounted(() => {
  ws = util.wsClient('avatar')
  ws.onMessage('init', (data: AvatarModuleWsInitData) => {
    settings.value = data.settings
    controlWidgetUrl.value = data.controlWidgetUrl
    displayWidgetUrl.value = data.displayWidgetUrl
    inited.value = true
  })
  ws.connect()
})

onUnmounted(() => {
  if (ws) {
    ws.disconnect()
  }
})
</script>
<style>
.avatar-editor .modal-card {
  width: calc(100vw - 40px);
  height: calc(100vh - 40px);
}

.avatar-editor .modal-card-body {
  overflow-y: scroll;
  padding: 0;
}

.avatar-all-images {
  position: sticky;
  top: 0;
  overflow: scroll;
}

.avatar-all-images img {
  background: #efefef;
  height: 64px;
  vertical-align: bottom;
}

.avatar-animation-frame {
  border: dashed 2px transparent;
}

.avatar-animation-frame.dragging-over {
  border: dashed 2px #444;
}

.avatar-preview {
  position: relative;
}

.avatar-preview .avatar-animation {
  position: absolute;
  top: 0;
  left: 0;
}

.avatar-slot-definition-editor-title-input {
  font-weight: bold;
  font-size: 20px !important;
}

.avatar-slot-definition-editor {
  border: solid 1px hsl(0, 0%, 86%);
}

.avatar-slot-definition-editor-title {
  background: #efefef;
  border-bottom: solid 1px hsl(0, 0%, 86%);
}

.avatar-slot-item-editor-title {
  font-weight: bold;
  font-size: 14px !important;
}

.avatar-slot-item-editor {
  background: #efefef;
  border: solid 1px hsl(0, 0%, 86%);
}

.avatar-slot-item-state-editor {
  display: inline-block;
  border: solid 1px hsl(0, 0%, 86%);
}

.avatar-slot-item-state-editor.dragging-over {
  border-style: dashed;
  border-color: #444;
}

.avatar-slot-item-state-editor-title {
  text-align: center;
  font-weight: bold;
  background: #efefef;
  border-bottom: solid 1px hsl(0, 0%, 86%);
}

.avatar-animation-card {
  display: inline-block;
  width: 64px;
  vertical-align: top;
}

.avatar-animation-frame {
  display: inline-block;
  position: relative;
  background: #efefef;
}

.avatar-animation-frame img {
  vertical-align: bottom;
}

.avatar-animation-frame-upload {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  text-align: center;
  z-index: 1;
}

.avatar-animation-frame-upload .button {
  margin: 0 auto;
}

.avatar-animation-frame-remove {
  position: absolute;
  right: 0;
  top: 0;
  display: none;
  z-index: 2;
}

.avatar-animation-frame:hover .avatar-animation-frame-remove {
  display: inline-block;
}

.avatar-animation-frame input[type="text"] {
  max-width: 100px;
}

.avatar-fallback-animation {
  opacity: 0.7;
}
</style>
