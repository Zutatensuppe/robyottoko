<template>
  <div id="app">
    <div id="top" ref="top">
      <navbar />
      <div id="actionbar" class="p-1">
        <a class="button is-small" :href="widgetUrl" target="_blank"
          >Open widget</a
        >
      </div>
    </div>
    <div id="main" ref="main" v-if="settings">
      <table class="table is-striped">
        <thead>
          <tr>
            <th></th>
            <th></th>
            <th>Preview</th>
            <th>Name</th>
            <th></th>
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
                <button class="button is-small" @click="duplicate(index)">
                  <i class="fa fa-clone" />
                </button>
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

      <span class="button is-small" @click="addAvatar">Add avatar</span>
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
} from "../../mod/modules/AvatarModule";
import user from "../user";
import WsClient from "../WsClient";

interface ComponentData {
  editIdx: number;
  editEntity: AvatarModuleAvatarDefinition | null;

  unchangedJson: string;
  changedJson: string;
  settings: AvatarModuleSettings | null;
  defaultSettings: AvatarModuleSettings | null;
  ws: WsClient | null;

  $me: any;
}

export default defineComponent({
  data: (): ComponentData => ({
    editIdx: -1,
    editEntity: null,

    unchangedJson: "{}",
    changedJson: "{}",
    settings: null,
    defaultSettings: null,
    ws: null,

    $me: null,
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
        stateDefinitions: [
          { value: "default", deletable: false },
          { value: "speaking", deletable: false },
        ],
        slotDefinitions: [],
      };
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
  created() {
    this.$me = user.getMe();
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
