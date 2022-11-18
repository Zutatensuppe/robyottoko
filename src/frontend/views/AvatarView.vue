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
          @update:modelValue="updatedAvatar"
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
import AvatarEditor from "../components/Avatar/AvatarEditor.vue";
import AvatarPreview from "../components/Avatar/AvatarPreview.vue";
import util from "../util";
import WsClient from "../WsClient";
import DoubleclickButton from '../components/DoubleclickButton.vue'
import NavbarElement from '../components/NavbarElement.vue'

import hyottokoChan from "./avatar_hyottoko_chan";

interface TabDefinition {
  tab: "settings" | "avatars";
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

  controlWidgetUrl: string;
  displayWidgetUrl: string;
}

export default defineComponent({
    components: { AvatarPreview, AvatarEditor, DoubleclickButton, NavbarElement },
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
        controlWidgetUrl: "",
        displayWidgetUrl: "",
    }),
    computed: {
        changed(): boolean {
            return this.unchangedJson !== this.changedJson;
        },
    },
    watch: {
        settings: {
            deep: true,
            handler(ch) {
                this.changedJson = JSON.stringify(ch);
            },
        },
    },
    async mounted() {
        this.ws = util.wsClient("avatar");
        this.ws.onMessage("init", (data: AvatarModuleWsInitData) => {
            this.settings = data.settings;
            this.unchangedJson = JSON.stringify(data.settings);
            this.controlWidgetUrl = data.controlWidgetUrl;
            this.displayWidgetUrl = data.displayWidgetUrl;
            this.inited = true;
        });
        this.ws.connect();
    },
    unmounted() {
        if (this.ws) {
            this.ws.disconnect();
        }
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
            this.settings.avatarDefinitions = this.settings.avatarDefinitions.filter((val, index) => index !== idx);
            this.sendSave();
        },
        duplicate(idx: number) {
            if (!this.settings) {
                console.warn("duplicate: this.settings not initialized");
                return;
            }
            this.editIdx = this.settings.avatarDefinitions.length;
            this.editEntity = JSON.parse(JSON.stringify(this.settings.avatarDefinitions[idx]));
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
                state: {
                    slots: {},
                    lockedState: "default",
                },
            };
            this.editIdx = this.settings.avatarDefinitions.length;
            this.editEntity = avatar;
        },
        addExampleAvatar() {
            const avatar = JSON.parse(JSON.stringify(hyottokoChan)) as AvatarModuleAvatarDefinition;
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
        dragEnd(evt: {
            oldIndex: number;
            newIndex: number;
        }) {
            if (!this.settings) {
                console.warn("dragEnd: this.settings not initialized");
                return;
            }
            this.settings.avatarDefinitions = fn.arrayMove(this.settings.avatarDefinitions, evt.oldIndex, evt.newIndex);
            this.sendSave();
        },
    }
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
