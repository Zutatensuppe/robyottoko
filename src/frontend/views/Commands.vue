<template>
  <div id="app">
    <div id="top" ref="top">
      <navbar />
    </div>
    <div id="main" ref="main">
      <command-edit
        v-if="editCommand"
        :globalVariables="globalVariables"
        :modelValue="editCommand"
        :mode="editIdx >= commands.length ? 'create' : 'edit'"
        :baseVolume="baseVolume"
        @update:modelValue="editedCommand"
        @cancel="editCommand = null"
      />

      <div class="tabs">
        <ul>
          <li
            :class="{ 'is-active': tab === 'commands' }"
            @click="tab = 'commands'"
          >
            <a>Commands</a>
          </li>
          <li
            :class="{ 'is-active': tab === 'settings' }"
            @click="tab = 'settings'"
          >
            <a>Settings</a>
          </li>
        </ul>
      </div>

      <div v-if="inited && tab === 'commands'">
        <div class="actions">
          <div class="mr-1">Filter:</div>
          <div class="field has-addons mr-1 mb-0">
            <div class="control">
              <input class="input is-small" v-model="filter.search" />
            </div>
          </div>
          <label
            class="mr-1"
            v-for="(possibleAction, idx) in possibleActions"
            :key="idx"
            ><input
              class="mr-1"
              type="checkbox"
              :value="possibleAction"
              v-model="filter.actions"
            />{{ possibleAction }} ({{ commandCount(possibleAction) }})</label
          >
          <div
            class="dropdown"
            :class="{ 'is-active': addDropdownActive }"
            ref="addDropdown"
          >
            <div class="dropdown-trigger">
              <button
                class="button is-small mr-1"
                aria-haspopup="true"
                aria-controls="dropdown-menu"
                :disabled="inited ? null : true"
                @click="openDropdown"
              >
                <span>Add command</span>
                <span class="icon is-small">
                  <i class="fa fa-angle-down" aria-hidden="true"></i>
                </span>
              </button>
            </div>
            <div class="dropdown-menu" id="dropdown-menu" role="menu">
              <div class="dropdown-content">
                <a
                  href="#"
                  class="dropdown-item"
                  v-for="(possibleCommand, idx) in possibleCommands"
                  :key="idx"
                  @click="
                    closeDropdown();
                    add(possibleCommand.action);
                  "
                  :title="possibleCommand.title"
                >
                  {{ possibleCommand.text }}
                </a>
              </div>
            </div>
          </div>
          <a class="button is-small" :href="widgetUrl" target="_blank"
            >Open Media widget</a
          >
        </div>

        <div class="table-container" v-if="commands.length > 0">
          <table class="table is-striped" ref="table">
            <thead>
              <tr>
                <th></th>
                <th></th>
                <th>Trigger</th>
                <th>
                  Response
                  <label>
                    <input
                      type="checkbox"
                      v-model="adminSettings.showImages"
                      @update:modelValue="sendSave"
                    />
                    Show images
                  </label>
                </th>
                <th>Type</th>
                <th>Permissions</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <draggable
              :modelValue="commands"
              @end="dragEnd"
              tag="tbody"
              handle=".handle"
              item-key="id"
            >
              <template #item="{ element, index }">
                <tr v-show="!filteredOut(element)">
                  <td class="pt-4 handle">
                    <i class="fa fa-arrows"></i>
                  </td>
                  <td class="pl-0 pr-0">
                    <button class="button is-small" @click="edit(index)">
                      <i class="fa fa-pencil" />
                    </button>
                  </td>
                  <td class="col-triggers">
                    <div
                      v-for="(trigger, idx2) in element.triggers"
                      :key="idx2"
                      class="spacerow"
                    >
                      <div>
                        <code
                          v-if="element.triggers[idx2].type === 'command'"
                          >{{ element.triggers[idx2].data.command }}</code
                        >
                      </div>
                      <div v-if="element.triggers[idx2].type === 'timer'">
                        <span class="is-small">Timer: </span>
                        <code
                          >{{ element.triggers[idx2].data.minLines }} lines,
                          <duration
                            :value="element.triggers[idx2].data.minInterval"
                        /></code>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div v-if="element.action === 'dict_lookup'">
                      Outputs the translation for the searched word.
                    </div>
                    <div v-if="element.action === 'madochan_createword'">
                      Creates a word for a definition.
                    </div>
                    <div v-if="element.action === 'chatters'">
                      Outputs the people who chatted during the stream.
                    </div>
                    <div v-if="element.action === 'text'">
                      <template
                        v-for="(txt, idx2) in element.data.text"
                        :key="idx2"
                        class="field has-addons"
                      >
                        <code>{{ element.data.text[idx2] }}</code>
                        <span v-if="idx2 < element.data.text.length - 1"
                          >or</span
                        >
                      </template>
                    </div>
                    <div
                      v-if="element.action === 'media'"
                      :class="element.action"
                    >
                      <div
                        class="spacerow media-holder media-holder-inline"
                        v-if="
                          element.data.image.file || element.data.sound.file
                        "
                      >
                        <responsive-image
                          v-if="
                            element.data.image.file && adminSettings.showImages
                          "
                          :src="element.data.image.file"
                          :title="element.data.image.filename"
                          width="100px"
                          height="50px"
                          style="display: inline-block"
                        />
                        <code v-else-if="element.data.image.file">{{
                          element.data.image.filename
                        }}</code>

                        <i
                          class="fa fa-plus is-justify-content-center mr-2 ml-2"
                          v-if="
                            element.data.image.file && element.data.sound.file
                          "
                        />
                        <player
                          :src="element.data.sound.file"
                          :name="element.data.sound.filename"
                          :volume="element.data.sound.volume"
                          :baseVolume="baseVolume"
                          class="button is-small is-justify-content-center"
                        />
                        <span
                          class="ml-2"
                          v-if="
                            element.data.image.file && element.data.sound.file
                          "
                          >for at least
                          <duration :value="element.data.minDurationMs"
                        /></span>
                        <span class="ml-2" v-else-if="element.data.image.file"
                          >for <duration :value="element.data.minDurationMs"
                        /></span>
                      </div>
                    </div>
                    <div v-if="element.action === 'countdown'">
                      <div v-if="(element.data.type || 'auto') === 'auto'">
                        <code>{{ element.data.intro }}</code>
                        <span>→</span>
                        <code>{{ element.data.steps }}</code> ✕
                        <duration :value="element.data.interval" />
                        <span>→</span>
                        <code>{{ element.data.outro }}</code>
                      </div>
                      <div v-else>
                        <template
                          v-for="(a, idxActions) in element.data.actions"
                          :key="idxActions"
                        >
                          <duration
                            v-if="a.type === 'delay'"
                            :value="a.value"
                          />
                          <code v-if="a.type === 'text'">{{ a.value }}</code>
                          <code v-if="a.type === 'media'">
                            Media(<span v-if="a.value.image.file">{{
                              a.value.image.filename
                            }}</span
                            ><span
                              v-if="a.value.image.file && a.value.sound.file"
                              >+</span
                            ><span v-if="a.value.sound.file">{{
                              a.value.sound.filename
                            }}</span
                            >)
                          </code>
                          <span
                            v-if="idxActions < element.data.actions.length - 1"
                            >→</span
                          >
                        </template>
                      </div>
                    </div>
                  </td>
                  <td>
                    {{ element.action }}
                  </td>
                  <td>
                    {{ permissionsStr(element) }}
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
        </div>
        <div v-else>No commands set up</div>
      </div>
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
import commands from "../commands";
import fn from "../../common/fn";
import {
  GeneralModuleAdminSettings,
  GeneralModuleSettings,
  GeneralModuleWsEventData,
  GeneralSaveEventData,
} from "../../mod/modules/GeneralModule";
import { Command, GlobalVariable } from "../../types";

interface ComponentData {
  commands: Command[];
  settings: GeneralModuleSettings;
  adminSettings: GeneralModuleAdminSettings;
  globalVariables: GlobalVariable[];
  ws: WsClient | null;
  editIdx: number | null;
  editCommand: Command | null;
  inited: boolean;

  addDropdownActive: boolean;
  possibleCommands: { action: string; title: string; text: string }[];
  possibleActions: string[];
  filter: {
    search: string;
    actions: string[];
  };
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

    editIdx: null,
    editCommand: null,

    addDropdownActive: false,
    possibleCommands: [
      { action: "text", title: "Send a message to chat", text: "Add text" },
      {
        action: "media",
        title: "Display an image and/or play a sound",
        text: "Add media",
      },
      {
        action: "countdown",
        title: "Add a countdown or messages spaced by time intervals",
        text: "Add countdown",
      },
      {
        action: "dict_lookup",
        title: "Lookup a translation of a word",
        text: "Add dict_lookup",
      },
      {
        action: "madochan_createword",
        title: "Create a word with madochan",
        text: "Add madochan",
      },
      {
        action: "chatters",
        title: "Displays users who chatted during the stream",
        text: "Add chatters",
      },
    ],
    possibleActions: [
      "text",
      "media",
      "countdown",
      "dict_lookup",
      "madochan_createword",
      "chatters",
    ],
    filter: {
      search: "",
      actions: [
        "text",
        "media",
        "countdown",
        "dict_lookup",
        "madochan_createword",
        "chatters",
      ],
    },

    inited: false,

    tab: "commands",
  }),
  computed: {
    baseVolume() {
      return this.settings.volume;
    },
    widgetUrl(): string {
      return `${location.protocol}//${location.host}/widget/media/${this.$me.widgetToken}/`;
    },
  },
  methods: {
    commandCount(action: string): number {
      let count = 0;
      for (const cmd of this.commands) {
        if (cmd.action === action) {
          count++;
        }
      }
      return count;
    },
    filteredOut(item: Command) {
      if (!this.filter.actions.includes(item.action)) {
        return true;
      }
      if (this.filter.search) {
        const search = this.filter.search.toLowerCase();
        if (
          !item.triggers.find(
            ({ type, data }) =>
              type === "command" &&
              data.command.toLowerCase().indexOf(search) >= 0
          )
        ) {
          return true;
        }
      }
      return false;
    },
    permissionsStr(item: Command) {
      if (!item.restrict_to || item.restrict_to.length === 0) {
        return "Everyone";
      }
      const parts = [];
      if (item.restrict_to.includes("broadcaster")) {
        parts.push("Broadcaster");
      }
      if (item.restrict_to.includes("mod")) {
        parts.push("Moderators");
      }
      if (item.restrict_to.includes("sub")) {
        parts.push("Subscribers");
      }
      return parts.join(", ");
    },
    add(type: string) {
      const cmd = commands.newCmd(type);
      if (!cmd) {
        return;
      }
      this.editIdx = this.commands.length;
      this.editCommand = cmd;
    },
    remove(idx: number) {
      this.commands = this.commands.filter((val, index) => index !== idx);
      this.sendSave();
    },
    edit(idx: number) {
      this.editIdx = idx;
      this.editCommand = this.commands[idx];
    },
    duplicate(idx: number) {
      this.editIdx = this.commands.length;
      this.editCommand = JSON.parse(JSON.stringify(this.commands[idx]));
    },
    editedCommand(command: Command): void {
      if (this.editIdx === null) {
        return;
      }
      this.commands[this.editIdx] = command;
      this.sendSave();
      this.editIdx = null;
      this.editCommand = null;
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
      if (this.ws) {
        this.ws.send(JSON.stringify(data));
      } else {
        console.warn("sendMsg: this.ws not initialized");
      }
    },
    dragEnd(evt: { oldIndex: number; newIndex: number }) {
      this.commands = fn.arrayMove(this.commands, evt.oldIndex, evt.newIndex);
      this.sendSave();
    },
    openDropdown() {
      this.addDropdownActive = true;
    },
    closeDropdown() {
      this.addDropdownActive = false;
    },
    hideAddDropdown(e: Event) {
      if (!this.$refs.addDropdown) {
        return;
      }
      const el = this.$refs.addDropdown as HTMLDivElement;
      if (el.contains(e.target as any)) {
        return;
      }
      this.closeDropdown();
    },
  },
  async mounted() {
    this.ws = new WsClient(this.$conf.wsBase + "/general", this.$me.token);
    this.ws.onMessage("init", (data: GeneralModuleWsEventData) => {
      this.commands = data.commands;
      this.settings = data.settings;
      this.adminSettings = data.adminSettings;
      this.globalVariables = data.globalVariables;
      this.inited = true;
    });
    this.ws.connect();
    window.addEventListener("click", this.hideAddDropdown);
  },
  unmounted() {
    if (this.ws) {
      this.ws.disconnect();
    }
    window.removeEventListener("click", this.hideAddDropdown);
  },
});
</script>


<style scoped>
.col-triggers {
  max-width: 200px;
}
.col-triggers > div:not(:last-child) {
  border-bottom: 1px solid #dbdbdb;
  padding-bottom: 0.25em;
  margin-bottom: 0.25em;
}
.actions {
  display: flex;
  align-items: center;
}
</style>
