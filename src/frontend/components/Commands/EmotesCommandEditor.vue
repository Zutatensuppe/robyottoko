<template>
  <div
    v-if="item"
    class="modal is-active"
  >
    <div
      class="modal-background"
      @click="onOverlayClick"
    />
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">
          {{ title }}
        </p>
        <button
          class="delete"
          aria-label="close"
          @click="onCloseClick"
        />
      </header>
      <section class="modal-card-body">
        <table class="table is-striped">
          <tbody>
            <tr>
              <td>Triggers:</td>
              <td>
                <trigger-editor
                  v-for="(trigger, idx) in item.triggers"
                  :key="idx"
                  class="spacerow"
                  :model-value="trigger"
                  :channel-points-custom-rewards="channelPointsCustomRewards"
                  :removable="item.triggers.length > 1"
                  @update:modelValue="item.triggers[idx] = $event"
                  @remove="rmtrigger(idx)"
                />
                <dropdown-button
                  :actions="possibleTriggerActions"
                  label="Add trigger"
                  @click="addtrigger"
                />
              </td>
            </tr>
            <tr v-if="actionDescription">
              <td>Description:</td>
              <td v-html="actionDescription" />
            </tr>
            <tr>
              <td>Display Functions</td>
              <td>
                <div
                  v-for="(displayFn, idx) in item.data.displayFn"
                  :key="idx"
                  class="field has-addons mb-1"
                >
                  <div class="control">
                    <div
                      class="select is-small"
                    >
                      <select v-model="item.data.displayFn[idx].fn">
                        <option
                          v-for="(fn, idx2) in possibleEmoteDisplayFunctions"
                          :key="idx2"
                          :value="fn"
                        >
                          {{ fn }}
                        </option>
                      </select>
                    </div>
                  </div>
                  <button
                    class="button is-small"
                    @click="rmFn(idx)"
                  >
                    <i class="fa fa-remove" />
                  </button>
                </div>
                <button
                  class="button is-small"
                  @click="addFn()"
                >
                  <i class="fa fa-plus mr-1" /> Add
                </button>
              </td>
            </tr>
            <tr>
              <td>Emotes</td>
              <td>
                <div class="emote-select">
                  <img
                    v-for="(emote, idx) in item.data.emotes"
                    :key="idx"
                    :src="emote.url"
                    @click="removeEmote(idx)"
                  >
                </div>
                <div class="field has-addons">
                  <div class="control">
                    <StringInput v-model="channelNameInput" />
                  </div>
                  <button
                    class="button is-small"
                    @click="loadChannelEmotes"
                  >
                    <i class="fa fa-plus mr-1" /> Add emotes from channel
                  </button>
                </div>
                <div class="emote-select">
                  Select emotes to display:
                  <div
                    v-for="(emotesSet, idx) in possibleEmoteSets"
                    :key="idx"
                  >
                    <div>{{ emotesSet.name }}</div>
                    <img
                      v-for="(emote, idx2) in emotesSet.emotes"
                      :key="idx2"
                      :src="emote"
                      @click="addEmote(emote)"
                    >
                  </div>
                </div>
              </td>
            </tr>
            <tr v-if="requiresAccessToken">
              <td>Attention:</td>
              <td>
                <div class="help">
                  This requires <code>Access Token</code> to be set in the user
                  settings.
                </div>
              </td>
            </tr>
            <tr>
              <td>Variables:</td>
              <td>
                <table v-if="item.variables.length > 0">
                  <thead>
                    <tr>
                      <td>Name</td>
                      <td>Value</td>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(v, idx) in item.variables"
                      :key="idx"
                    >
                      <td>
                        <StringInput v-model="v.name" />
                      </td>
                      <td>
                        <StringInput v-model="v.value" />
                      </td>
                      <td>
                        <button
                          class="button is-small"
                          @click="rmVariable(idx)"
                        >
                          <i class="fa fa-remove" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <span
                  class="button is-small"
                  @click="onAddVariable"
                >Add Variable</span>
                <div class="help">
                  Variables can be used from the command with
                  <code>$var(variable_name)</code>. If the referenced variable
                  is not defined here,
                  <a
                    href="/variables/"
                    target="_blank"
                  >global variables</a> are
                  used.
                </div>
              </td>
            </tr>
            <tr>
              <td>Variable changes:</td>
              <td>
                <table v-if="item.variableChanges.length > 0">
                  <thead>
                    <tr>
                      <td>Name</td>
                      <td>Change</td>
                      <td>Value</td>
                      <td />
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(v, idx) in item.variableChanges"
                      :key="idx"
                    >
                      <td>
                        <dropdown-input
                          v-model="v.name"
                          :values="autocompletableVariables().map(a => ({ value: a.var.name, label: `${a.var.name} (${a.type}), <code>${a.var.value}</code>` }))"
                        />
                      </td>
                      <td>
                        <div class="select is-small">
                          <select v-model="v.change">
                            <option value="set">
                              set
                            </option>
                            <option value="increase_by">
                              increase by
                            </option>
                            <option value="decrease_by">
                              decrease by
                            </option>
                          </select>
                        </div>
                      </td>
                      <td>
                        <StringInput v-model="v.value" />
                      </td>
                      <td>
                        <button
                          class="button is-small"
                          @click="rmVariableChange(idx)"
                        >
                          <i class="fa fa-remove" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <span
                  class="button is-small"
                  @click="onAddVariableChange"
                >Add Variable Change</span>
                <div class="help">
                  Variable changes are performed when the command is executed,
                  before anything else.
                </div>
              </td>
            </tr>
            <tr>
              <td>Permissions:</td>
              <td>
                <label
                  v-for="(perm, idx) in possiblePermissions"
                  :key="idx"
                  class="mr-1"
                >
                  <input
                    v-model="item.restrict_to"
                    type="checkbox"
                    :value="perm.value"
                  >
                  {{ perm.label }}
                </label>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
      <footer class="modal-card-foot">
        <button
          class="button is-small is-primary"
          :disabled="!valid"
          @click="onSaveClick"
        >
          Save changes
        </button>
        <button
          class="button is-small"
          @click="onCancelClick"
        >
          Cancel
        </button>
      </footer>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";

import { permissions } from "../../../common/permissions";
import {
  commands,
  isValidTrigger,
  newTrigger,
} from "../../../common/commands";
import {
  CommandTrigger,
  CommandVariable,
  CommandVariableChange,
  EmotesCommand,
  GlobalVariable,
} from "../../../types";
import { possibleTriggerActions } from "../../../common/triggers";
import StringInput from "../StringInput.vue";
import { EMOTE_DISPLAY_FN } from "../../../mod/modules/GeneralModuleCommon";
import api from '../../api'

interface AutocompletableVariable {
  var: CommandVariable | GlobalVariable;
  type: string;
}

interface ComponentDataPermission {
  value: string;
  label: string;
}

interface ComponentData {
  item: EmotesCommand | null
  variableChangeFocusIdx: number
  channelNameInput: string
  possiblePermissions: ComponentDataPermission[]
  possibleEmoteDisplayFunctions: EMOTE_DISPLAY_FN[]
  possibleEmoteSets: {
    name: string
    emotes: string[]
  }[]
}

export default defineComponent({
  components: { StringInput },
  props: {
    modelValue: {
      type: Object as PropType<EmotesCommand>,
      required: true,
    },
    mode: {
      type: String as PropType<"create" | "edit">,
      required: true,
    },
    globalVariables: {
      type: Array as PropType<GlobalVariable[]>,
      required: true,
    },
    channelPointsCustomRewards: {
      type: Object as PropType<Record<string, string[]>>,
      required: true,
    },
  },
  emits: ["update:modelValue", "cancel"],
  data: (): ComponentData => ({
    item: null,
    variableChangeFocusIdx: -1,
    possiblePermissions: permissions,
    possibleEmoteDisplayFunctions: [
      EMOTE_DISPLAY_FN.BALLOON,
      EMOTE_DISPLAY_FN.BOUNCY,
      EMOTE_DISPLAY_FN.EXPLODE,
      EMOTE_DISPLAY_FN.FLOATING_SPACE,
      EMOTE_DISPLAY_FN.FOUNTAIN,
      EMOTE_DISPLAY_FN.RAIN,
      EMOTE_DISPLAY_FN.RANDOM_BEZIER,
    ],
    channelNameInput: '',
    possibleEmoteSets: []
    // [
    //   // default emotes

    //   // emotes from channels

    //   // unicode emotes 🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞🐞

    //   // 'https://static-cdn.jtvnw.net/emoticons/v2/160401/default/dark/2.0',
    //   // 'https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_ad4a8fd9089e4a1ca32d4210e9fea6da/default/dark/2.0',
    //   // 'https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_9e4dc93d7f8c4bbfbd131d1ef9052db6/default/dark/2.0',
    //   // 'https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_9fb4c620616841d5b8ee6072070dfac7/default/dark/2.0',
    //   // 'https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_783ce3fc0013443695c62933da3669c5/default/dark/2.0',
    //   // 'https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_8a87841061234510b354ebd3bc3ae524/default/dark/2.0',
    // ],
  }),
  computed: {
    requiresAccessToken(): boolean {
      if (!this.item) {
        return false;
      }
      return commands[this.item.action].RequiresAccessToken();
    },
    possibleTriggerActions() {
      return possibleTriggerActions();
    },
    valid(): boolean {
      if (!this.item) {
        return false;
      }
      // check if all triggers are correct
      for (const trigger of this.item.triggers) {
        if (!isValidTrigger(trigger)) {
          return false;
        }
      }
      return true;
    },
    actionDescription(): string {
      if (!this.item) {
        return "";
      }
      return commands[this.item.action].Description();
    },
    title(): string {
      if (!this.item) {
        return "";
      }
      const verb = {
        create: "Create new ",
        edit: "Edit ",
      };
      return `${verb[this.mode]}${commands[this.item.action].Name()}`;
    },
  },
  watch: {
    modelValue: {
      handler(v) {
        this.item = JSON.parse(JSON.stringify(v));
      },
    },
  },
  async created() {
    this.possibleEmoteSets = []
    const res = await api.getGeneralGlobalEmotes()
    const json = await res.json()
    this.possibleEmoteSets.push({
      name: 'global',
      emotes: json.data.map((emoteData: any) => `https://static-cdn.jtvnw.net/emoticons/v2/${emoteData.id}/default/dark/3.0`),
    })
  },
  mounted() {
    this.item = JSON.parse(JSON.stringify(this.modelValue));
    this.$nextTick(() => {
      const el = this.$el.querySelector("input[type=\"text\"]");
      el.focus();
    });
  },
  methods: {
    async loadChannelEmotes(): Promise<void> {
      const channelName = this.channelNameInput
      if (this.possibleEmoteSets.find(set => set.name === channelName)) {
        return
      }

      const res = await api.getGeneralChannelEmotes(channelName)
      const json = await res.json()
      this.possibleEmoteSets.unshift({
        name: channelName,
        emotes: json.data.map((emoteData: any) => `https://static-cdn.jtvnw.net/emoticons/v2/${emoteData.id}/default/dark/3.0`),
      })
    },
    rmFn(idx: number): void {
      if (!this.item) {
        console.warn("addtrigger: this.item not initialized");
        return;
      }
      this.item.data.displayFn = this.item.data.displayFn.filter((_value, index) => index !== idx)
    },
    addFn(): void {
      if (!this.item) {
        console.warn("addtrigger: this.item not initialized");
        return;
      }
      this.item.data.displayFn.push({
        fn: EMOTE_DISPLAY_FN.FLOATING_SPACE,
        args: []
      })
    },
    removeEmote(idx: number): void {
      if (!this.item) {
        console.warn("addtrigger: this.item not initialized");
        return;
      }
      this.item.data.emotes = this.item.data.emotes.filter((_value, index) => index !== idx)
    },
    addEmote(url: string): void {
      if (!this.item) {
        console.warn("addtrigger: this.item not initialized");
        return;
      }
      this.item.data.emotes.push({ url })
    },
    addtrigger(trigger: any): void {
      if (!this.item) {
        console.warn("addtrigger: this.item not initialized");
        return;
      }
      this.item.triggers.push(newTrigger(trigger.type));
    },
    onAddVariableChange(): void {
      if (!this.item) {
        console.warn("onAddVariableChange: this.item not initialized");
        return;
      }
      this.item.variableChanges.push({
        name: "",
        change: "set",
        value: "",
      });
    },
    rmVariableChange(idx: number): void {
      if (!this.item) {
        console.warn("rmVariableChange: this.item not initialized");
        return;
      }
      this.item.variableChanges = this.item.variableChanges.filter((_val: CommandVariableChange, index: number) => index !== idx);
    },
    onAddVariable(): void {
      if (!this.item) {
        console.warn("onAddVariable: this.item not initialized");
        return;
      }
      this.item.variables.push({
        name: "",
        value: "",
      });
    },
    rmVariable(idx: number): void {
      if (!this.item) {
        console.warn("rmVariable: this.item not initialized");
        return;
      }
      this.item.variables = this.item.variables.filter((_val: CommandVariable, index: number) => index !== idx);
    },
    onSaveClick(): void {
      this.$emit("update:modelValue", this.item);
    },
    onCancelClick(): void {
      this.$emit("cancel");
    },
    onCloseClick(): void {
      this.$emit("cancel");
    },
    onOverlayClick(): void {
      this.$emit("cancel");
    },
    rmtrigger(idx: number): void {
      if (!this.item) {
        console.warn("rmtrigger: this.item not initialized");
        return;
      }
      this.item.triggers = this.item.triggers.filter((_val: CommandTrigger, index: number) => index !== idx);
    },
    autocompletableVariables(): AutocompletableVariable[] {
      if (!this.item) {
        console.warn("autocompletableVariables: this.item not initialized");
        return [];
      }
      const variables: AutocompletableVariable[] = this.item.variables.slice().map((localVar: CommandVariable) => {
        return {
          var: localVar,
          type: "local",
        };
      });
      this.globalVariables.forEach((globalVar: GlobalVariable) => {
        if (!variables.find((localVar) => localVar.var.name === globalVar.name)) {
          variables.push({
            var: globalVar,
            type: "global",
          });
        }
      });
      return variables;
    },
  }
});
</script>
<style lang="scss">
.emote-select {
  img { width: 32px; }
}
</style>
