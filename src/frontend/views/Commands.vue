<template>
  <div id="app">
    <div id="top" ref="top">
      <navbar />
    </div>
    <div id="main" ref="main">
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
            <a class="button is-small mr-1" :href="widgetUrl" target="_blank"
              >Open Media widget</a
            >
          </li>
        </ul>
      </div>
      <commands-editor
        v-if="inited && tab === 'commands'"
        v-model="commands"
        @update:modelValue="sendSave"
        :globalVariables="globalVariables"
        :possibleActions="possibleActions"
        :baseVolume="baseVolume"
        :showToggleImages="true"
        :showFilterActions="true"
        :showImages="adminSettings.showImages"
        @showImagesChange="updateShowImages"
      />
      <div v-if="inited && tab === 'settings'">
        <table class="table is-striped" ref="table" v-if="settings">
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
<script lang="ts">
import { defineComponent } from "vue";

import WsClient from "../WsClient";
import {
  GeneralModuleAdminSettings,
  GeneralModuleSettings,
  GeneralModuleWsEventData,
  GeneralSaveEventData,
} from "../../mod/modules/GeneralModule";
import { Command, CommandAction, GlobalVariable } from "../../types";
import util from "../util";

interface TabDefinition {
  tab: string;
  title: string;
}

interface ComponentData {
  commands: Command[];
  settings: GeneralModuleSettings;
  adminSettings: GeneralModuleAdminSettings;
  globalVariables: GlobalVariable[];
  ws: WsClient | null;
  inited: boolean;
  possibleActions: CommandAction[];
  tabDefinitions: TabDefinition[];
  tab: "commands" | "settings";
}

export default defineComponent({
  data: (): ComponentData => ({
    commands: [],
    settings: {
      volume: 100,
    },
    adminSettings: {
      showImages: true,
    },
    globalVariables: [],
    ws: null,

    possibleActions: [
      "text",
      "media",
      "media_volume",
      "countdown",
      "dict_lookup",
      "madochan_createword",
      "chatters",
    ],

    tabDefinitions: [
      { tab: "commands", title: "Commands" },
      { tab: "settings", title: "Settings" },
    ],

    inited: false,

    tab: "commands",
  }),
  computed: {
    baseVolume() {
      return this.settings.volume;
    },
    widgetUrl(): string {
      return util.widgetUrl("media");
    },
  },
  methods: {
    updateShowImages(showImages: boolean) {
      this.adminSettings.showImages = showImages;
      this.sendSave();
    },
    sendSave() {
      this.sendMsg({
        event: "save",
        commands: this.commands,
        settings: this.settings,
        adminSettings: this.adminSettings,
      });
    },
    sendMsg(data: GeneralSaveEventData) {
      if (!this.ws) {
        console.warn("sendMsg: this.ws not initialized");
        return;
      }
      this.ws.send(JSON.stringify(data));
    },
  },
  async mounted() {
    this.ws = util.wsClient("general");
    this.ws.onMessage("init", (data: GeneralModuleWsEventData) => {
      this.commands = data.commands;
      this.settings = data.settings;
      this.adminSettings = data.adminSettings;
      this.globalVariables = data.globalVariables;
      this.inited = true;
    });
    this.ws.connect();
  },
  unmounted() {
    if (this.ws) {
      this.ws.disconnect();
    }
  },
});
</script>
