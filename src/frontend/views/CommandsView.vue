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
          <li>
            <a
              class="button is-small mr-1"
              :href="mediaWidgetUrl"
              target="_blank"
            >Open Media widget</a>
          </li>
          <li>
            <a
              class="button is-small mr-1"
              :href="emoteWallWidgetUrl"
              target="_blank"
            >Open Emote Wall widget</a>
          </li>
          <li>
            <a
              class="button is-small mr-1"
              :href="rouletteWidgetUrl"
              target="_blank"
            >Open Roulette widget</a>
          </li>
        </ul>
      </div>
      <CommandsEditor
        v-if="inited && tab === 'commands'"
        v-model="commands"
        :global-variables="globalVariables"
        :channel-points-custom-rewards="channelPointsCustomRewards"
        :possible-actions="possibleActions"
        :possible-effects="possibleEffects"
        :base-volume="baseVolume"
        :show-toggle-images="true"
        :show-filters="true"
        :media-widget-url="mediaWidgetUrl"
        :roulette-widget-url="rouletteWidgetUrl"
        :show-images="adminSettings.showImages"
        @update:model-value="sendSave"
        @show-images-change="updateShowImages"
      />
      <Settings
        v-if="inited && tab === 'settings'"
        v-model="settings"
        @update:model-value="sendSave"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import WsClient from '../WsClient'
import {
  default_admin_settings,
  default_settings,
  GeneralModuleAdminSettings,
  GeneralModuleSettings,
  GeneralModuleWsEventData,
  GeneralSaveEventData,
} from '../../mod/modules/GeneralModuleCommon'
import { Command, CommandAction, CommandEffectType, GlobalVariable } from '../../types'
import util from '../util'
import CommandsEditor from '../components/Commands/CommandsEditor.vue'
import NavbarElement from '../components/NavbarElement.vue'
import Settings from '../components/Commands/Settings.vue'

type TabType = 'commands' | 'settings'
interface TabDefinition {
  tab: TabType;
  title: string;
}

const commands = ref<Command[]>([])
const settings = ref<GeneralModuleSettings>(default_settings())
const adminSettings = ref<GeneralModuleAdminSettings>(default_admin_settings())
const globalVariables = ref<GlobalVariable[]>([])
const channelPointsCustomRewards = ref<Record<string, string[]>>({})
let ws: WsClient | null = null
const possibleActions: CommandAction[] = [
  CommandAction.GENERAL,
]
const possibleEffects: CommandEffectType[] = [
  CommandEffectType.VARIABLE_CHANGE,
  CommandEffectType.CHAT,
  CommandEffectType.DICT_LOOKUP,
  CommandEffectType.EMOTES,
  CommandEffectType.ROULETTE,
  CommandEffectType.MEDIA,
  CommandEffectType.SET_CHANNEL_TITLE,
  CommandEffectType.SET_CHANNEL_GAME_ID,
  CommandEffectType.ADD_STREAM_TAGS,
  CommandEffectType.REMOVE_STREAM_TAGS,
  CommandEffectType.CHATTERS,
  CommandEffectType.COUNTDOWN,
  CommandEffectType.MEDIA_VOLUME,
]
const tabDefinitions: TabDefinition[] = [
  { tab: 'commands', title: 'Commands' },
  { tab: 'settings', title: 'Settings' },
]
const inited = ref<boolean>(false)
const tab = ref<TabType>('commands')
const mediaWidgetUrl = ref<string>('')
const emoteWallWidgetUrl = ref<string>('')
const rouletteWidgetUrl = ref<string>('')

const baseVolume = computed(() => {
  return settings.value.volume
})

const updateShowImages = (showImages: boolean) => {
  adminSettings.value.showImages = showImages
  sendSave()
}
const sendSave = () => {
  sendMsg({
    event: 'save',
    commands: commands.value,
    settings: settings.value,
    adminSettings: adminSettings.value,
  })
}
const sendMsg = (data: GeneralSaveEventData) => {
  if (!ws) {
    console.warn('sendMsg: this.ws not initialized')
    return
  }
  ws.send(JSON.stringify(data))
}

onMounted(() => {
  ws = util.wsClient('general')
  ws.onMessage('init', (data: GeneralModuleWsEventData) => {
    commands.value = data.commands
    settings.value = data.settings
    mediaWidgetUrl.value = data.mediaWidgetUrl
    emoteWallWidgetUrl.value = data.emoteWallWidgetUrl
    rouletteWidgetUrl.value = data.rouletteWidgetUrl
    adminSettings.value = data.adminSettings
    globalVariables.value = data.globalVariables
    channelPointsCustomRewards.value = data.channelPointsCustomRewards
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
