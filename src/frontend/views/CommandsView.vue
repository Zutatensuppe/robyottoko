<template>
  <div class="view">
    <div
      id="top"
      ref="top"
    >
      <navbar-element />
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
              :href="widgetUrl"
              target="_blank"
            >Open Media widget</a>
          </li>
        </ul>
      </div>
      <CommandsEditor
        v-if="inited && tab === 'commands'"
        v-model="commands"
        :global-variables="globalVariables"
        :channel-points-custom-rewards="channelPointsCustomRewards"
        :possible-actions="possibleActions"
        :base-volume="baseVolume"
        :show-toggle-images="true"
        :show-filter-actions="true"
        :widget-url="widgetUrl"
        :show-images="adminSettings.showImages"
        @update:modelValue="sendSave"
        @showImagesChange="updateShowImages"
      />
      <div v-if="inited && tab === 'settings'">
        <table
          v-if="settings"
          ref="table"
          class="table is-striped"
        >
          <tbody>
            <tr>
              <td><code>settings.volume</code></td>
              <td>
                <volume-slider
                  v-model="settings.volume"
                  @update:modelValue="sendSave"
                />
              </td>
              <td>Base volume for all media playing from commands</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

import WsClient from "../WsClient";
import {
  default_admin_settings,
  default_settings,
  GeneralModuleAdminSettings,
  GeneralModuleSettings,
  GeneralModuleWsEventData,
  GeneralSaveEventData,
} from "../../mod/modules/GeneralModuleCommon";
import { Command, CommandAction, GlobalVariable } from "../../types";
import util from "../util";
import CommandsEditor from "../components/Commands/CommandsEditor.vue";

type TabType = "commands" | "settings"
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
  CommandAction.TEXT,
  CommandAction.MEDIA_VOLUME,
  CommandAction.COUNTDOWN,
]
const tabDefinitions: TabDefinition[] = [
  { tab: "commands", title: "Commands" },
  { tab: "settings", title: "Settings" },
]
const inited = ref<boolean>(false)
const tab = ref<TabType>("commands")
const widgetUrl = ref<string>("")

const baseVolume = computed(() => {
  return settings.value.volume
})

const updateShowImages = (showImages: boolean) => {
  adminSettings.value.showImages = showImages;
  sendSave();
}
const sendSave = () => {
  sendMsg({
    event: "save",
    commands: commands.value,
    settings: settings.value,
    adminSettings: adminSettings.value,
  });
}
const sendMsg = (data: GeneralSaveEventData) => {
  if (!ws) {
    console.warn("sendMsg: this.ws not initialized");
    return;
  }
  ws.send(JSON.stringify(data));
}

onMounted(() => {
  ws = util.wsClient("general");
  ws.onMessage("init", (data: GeneralModuleWsEventData) => {
    commands.value = data.commands;
    settings.value = data.settings;
    widgetUrl.value = data.mediaWidgetUrl;
    adminSettings.value = data.adminSettings;
    globalVariables.value = data.globalVariables;
    channelPointsCustomRewards.value = data.channelPointsCustomRewards;
    inited.value = true;
  });
  ws.connect();
})

onUnmounted(() => {
  if (ws) {
    ws.disconnect();
  }
})
</script>
