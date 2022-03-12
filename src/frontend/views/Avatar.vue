<template>
  <div class="view">
    <div id="top" ref="top">
      <navbar />
      <div id="actionbar" class="p-1">
        <a class="button is-small mr-1" :href="controlWidgetUrl" target="_blank"
          >Open control widget</a
        >
        <a class="button is-small mr-1" :href="displayWidgetUrl" target="_blank"
          >Open display widget</a
        >
      </div>
    </div>
    <div id="main" ref="main" v-if="inited">
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
      <table class="table is-striped" v-if="tab === 'settings'">
        <tbody>
          <tr>
            <td colspan="3">General</td>
          </tr>
          <tr>
            <td><code>settings.style.bgColor</code></td>
            <td>
              <input
                class="input is-small"
                type="color"
                v-model="settings.styles.bgColor"
                @update:modelValue="sendSave"
              />
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
              <input
                type="checkbox"
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
              <th></th>
              <th></th>
              <th>Preview</th>
              <th>Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <draggable
            :modelValue="settings.avatarDefinitions"
            @end="dragEnd"
            tag="tbody"
            handle=".handle"
            item-key="id"
          >
            <template #item="{ element, index }">
              <tr>
                <td class="pt-4 handle">
                  <i class="fa fa-arrows"></i>
                </td>
                <td class="pl-0 pr-0">
                  <button class="button is-small" @click="edit(index)">
                    <i class="fa fa-pencil" />
                  </button>
                </td>
                <td>
                  <avatar-preview :avatar="element" />
                </td>
                <td>
                  {{ element.name }}
                </td>
                <td class="pl-0 pr-0">
                  <doubleclick-button
                    class="button is-small mr-1"
                    message="Are you sure?"
                    :timeout="1000"
                    @doubleclick="remove(index)"
                    ><i class="fa fa-trash"
                  /></doubleclick-button>
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
                    ><i class="fa fa-external-link mr-1" /> Control widget</a
                  >
                  <a
                    class="button is-small"
                    :href="displayWidgetUrl + '?avatar=' + element.name"
                    target="_blank"
                    ><i class="fa fa-external-link mr-1" /> Display widget</a
                  >
                </td>
              </tr>
            </template>
          </draggable>
        </table>

        <avatar-editor
          v-if="editEntity"
          :modelValue="editEntity"
          @update:modelValue="updatedAvatar"
          @cancel="editEntity = null"
        />

        <span class="button is-small mr-1" @click="addAvatar"
          >Add new avatar</span
        >
        <span class="button is-small" @click="addExampleAvatar"
          >Add example avatar (Hyottoko-Chan)</span
        >
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import fn from "../../common/fn";
import {
  AvatarModuleAvatarDefinition,
  AvatarModuleSettings,
  AvatarModuleWsInitData,
  AvatarModuleWsSaveData,
  default_settings,
} from "../../mod/modules/AvatarModuleCommon";
import util from "../util";
import WsClient from "../WsClient";

import hyottokoChan from "./avatar_hyottoko_chan.js";

interface TabDefinition {
  tab: string;
  title: string;
}

interface ComponentData {
  editIdx: number;
  editEntity: AvatarModuleAvatarDefinition | null;

  unchangedJson: string;
  changedJson: string;
  settings: AvatarModuleSettings;
  defaultSettings: AvatarModuleSettings;
  ws: WsClient | null;

  inited: boolean;

  tabDefinitions: TabDefinition[];
  tab: "settings" | "avatars";
}

export default defineComponent({
  data: (): ComponentData => ({
    editIdx: -1,
    editEntity: null,

    unchangedJson: "{}",
    changedJson: "{}",
    settings: default_settings(),
    defaultSettings: default_settings(),
    ws: null,
    inited: false,
    tabDefinitions: [
      { tab: "avatars", title: "Avatars" },
      { tab: "settings", title: "Settings" },
    ],
    tab: "avatars",
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
    controlWidgetUrl(): string {
      return util.widgetUrl("avatar");
    },
    displayWidgetUrl(): string {
      return util.widgetUrl("avatar_receive");
    },
  },
  methods: {
    edit(idx: number) {
      if (!this.settings) {
        console.warn("edit: this.settings not initialized");
        return;
      }
      this.editIdx = idx;
      this.editEntity = this.settings.avatarDefinitions[idx];
    },
    remove(idx: number) {
      if (!this.settings) {
        console.warn("remove: this.settings not initialized");
        return;
      }
      this.settings.avatarDefinitions = this.settings.avatarDefinitions.filter(
        (val, index) => index !== idx
      );
      this.sendSave();
    },
    duplicate(idx: number) {
      if (!this.settings) {
        console.warn("duplicate: this.settings not initialized");
        return;
      }
      this.editIdx = this.settings.avatarDefinitions.length;
      this.editEntity = JSON.parse(
        JSON.stringify(this.settings.avatarDefinitions[idx])
      );
    },
    updatedAvatar(avatar: AvatarModuleAvatarDefinition) {
      if (!this.settings) {
        console.warn("updateAvatar: this.settings not initialized");
        return;
      }
      this.settings.avatarDefinitions[this.editIdx] = avatar;
      this.sendSave();
    },
    addAvatar() {
      if (!this.settings) {
        console.warn("addAvatar: this.settings not initialized");
        return;
      }
      const avatar: AvatarModuleAvatarDefinition = {
        name: "Unnamed Avatar",
        width: 64,
        height: 64,
        stateDefinitions: [
          { value: "default", deletable: false },
          { value: "speaking", deletable: false },
        ],
        slotDefinitions: [],
      };
      this.editIdx = this.settings.avatarDefinitions.length;
      this.editEntity = avatar;
    },

    addExampleAvatar() {
      const avatar = JSON.parse(
        JSON.stringify(hyottokoChan)
      ) as AvatarModuleAvatarDefinition;
      this.editIdx = this.settings.avatarDefinitions.length;
      this.editEntity = avatar;
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
    dragEnd(evt: { oldIndex: number; newIndex: number }) {
      if (!this.settings) {
        console.warn("dragEnd: this.settings not initialized");
        return;
      }
      this.settings.avatarDefinitions = fn.arrayMove(
        this.settings.avatarDefinitions,
        evt.oldIndex,
        evt.newIndex
      );
      this.sendSave();
    },
  },
  async mounted() {
    this.ws = util.wsClient("avatar");
    this.ws.onMessage("init", (data: AvatarModuleWsInitData) => {
      this.settings = data.settings;
      this.unchangedJson = JSON.stringify(data.settings);
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
<style>
.avatar-editor .modal-card {
  width: calc(100% - 2em);
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
</style>
