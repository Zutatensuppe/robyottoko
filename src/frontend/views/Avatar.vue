<template>
  <div id="app">
    <div id="top" ref="top">
      <navbar />
      <div id="actionbar" class="p-1">
        <button
          class="button is-small is-primary mr-1"
          :disabled="!changed"
          @click="sendSave"
        >
          Save
        </button>
        <a class="button is-small" :href="widgetUrl" target="_blank"
          >Open widget</a
        >
      </div>
    </div>
    <div id="main" ref="main" v-if="settings">
      <avatar-editor
        v-for="(avatarDefinition, idx) in settings.avatarDefinitions"
        :key="idx"
        :modelValue="avatarDefinition"
        @update:modelValue="updateAvatar(idx, $event)"
      />

      <input
        class="input is-small"
        type="text"
        v-model="newAvatarName"
        placeholder="Avatar name"
      />
      <span class="button is-small" @click="addAvatar">Add avatar</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import {
  AvatarModuleAvatarDefinition,
  AvatarModuleSettings,
  AvatarModuleWsInitData,
  AvatarModuleWsSaveData,
} from "../../mod/modules/AvatarModule";
import WsClient from "../WsClient";

interface ComponentData {
  newAvatarName: string;

  unchangedJson: string;
  changedJson: string;
  settings: AvatarModuleSettings | null;
  defaultSettings: AvatarModuleSettings | null;
  ws: WsClient | null;
}

export default defineComponent({
  data: (): ComponentData => ({
    newAvatarName: "Unnamed Avatar",

    unchangedJson: "{}",
    changedJson: "{}",
    settings: null,
    defaultSettings: null,
    ws: null,
  }),
  watch: {
    settings: {
      deep: true,
      handler(ch) {
        this.changedJson = JSON.stringify(ch);
      },
    },
  },
  computed: {
    changed(): boolean {
      return this.unchangedJson !== this.changedJson;
    },
    widgetUrl(): string {
      return `${location.protocol}//${location.host}/widget/avatar/${this.$me.widgetToken}/`;
    },
  },
  methods: {
    updateAvatar(idx, $evt) {
      console.log(idx, $evt);
    },
    addAvatar() {
      if (!this.settings) {
        console.warn("addAvatar: this.settings not initialized");
        return;
      }
      const avatar: AvatarModuleAvatarDefinition = {
        name: this.newAvatarName,
        stateDefinitions: [
          { value: "default", deletable: false },
          { value: "speaking", deletable: false },
        ],
        slotDefinitions: [],
      };
      this.settings.avatarDefinitions.push(avatar);
    },

    sendSave() {
      if (!this.settings) {
        console.warn("sendSave: this.settings not initialized");
        return;
      }
      this.sendMsg({ event: "save", settings: this.settings });
    },
    sendMsg(data: AvatarModuleWsSaveData) {
      if (!this.ws) {
        console.warn("sendMsg: this.ws not initialized");
        return;
      }
      this.ws.send(JSON.stringify(data));
    },
  },
  async mounted() {
    this.ws = new WsClient(this.$conf.wsBase + "/avatar", this.$me.token);

    this.ws.onMessage("init", (data: AvatarModuleWsInitData) => {
      this.settings = data.settings;
      this.defaultSettings = data.defaultSettings;
      this.unchangedJson = JSON.stringify(data.settings);
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
<style>
.avatar-slot-definition-editor {
  border: solid 1px;
}
.avatar-slot-item-editor {
  border: solid 1px red;
}
.is-default {
  background: yellow;
}
</style>
