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
              <td>Response:</td>
              <td>
                <div
                  v-for="(txt, idx) in item.data.text"
                  :key="idx"
                  class="field textarea-holder"
                >
                  <textarea
                    v-model="item.data.text[idx]"
                    class="textarea"
                    :class="{
                      'has-background-danger-light': !item.data.text[idx],
                      'has-text-danger-dark': !item.data.text[idx],
                    }"
                  />
                  <div class="help">
                    <macro-select @selected="insertMacro(idx, $event)" />
                  </div>
                  <button
                    class="button is-small"
                    :disabled="item.data.text.length <= 1"
                    @click="rmtxt(idx)"
                  >
                    <i class="fa fa-remove" />
                  </button>
                </div>
                <div class="field">
                  <button
                    class="button is-small"
                    @click="addtxt"
                  >
                    <i class="fa fa-plus mr-1" /> Add response
                  </button>
                </div>
                <div>
                  <p class="help">
                    If multiple responses exist, a random one will be used when
                    the command is triggered.
                  </p>
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
  newText,
  newTrigger,
} from "../../../common/commands";
import {
  CommandTrigger,
  CommandVariable,
  CommandVariableChange,
  GlobalVariable,
  RandomTextCommand,
} from "../../../types";
import { possibleTriggerActions } from "../../../common/triggers";
import StringInput from "../StringInput.vue";

interface AutocompletableVariable {
  var: CommandVariable | GlobalVariable;
  type: string;
}

interface ComponentDataPermission {
  value: string;
  label: string;
}

interface ComponentData {
  item: RandomTextCommand | null;
  variableChangeFocusIdx: number;
  possiblePermissions: ComponentDataPermission[];
}

export default defineComponent({
  props: {
    modelValue: {
      type: Object as PropType<RandomTextCommand>,
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
      // check if settings are correct
      for (const t of this.item.data.text) {
        if (t === "") {
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
  mounted() {
    this.item = JSON.parse(JSON.stringify(this.modelValue));
    this.$nextTick(() => {
      const el = this.$el.querySelector("input[type=\"text\"]");
      el.focus();
    });
  },
  methods: {
    addtxt(): void {
      if (!this.item) {
        console.warn("addtxt: this.item not initialized");
        return;
      }
      this.item.data.text.push(newText());
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
    rmtxt(idx: number): void {
      if (!this.item) {
        console.warn("rmtxt: this.item not initialized");
        return;
      }
      this.item.data.text = this.item.data.text.filter((_val: string, index: number) => index !== idx);
    },
    rmtrigger(idx: number): void {
      if (!this.item) {
        console.warn("rmtrigger: this.item not initialized");
        return;
      }
      this.item.triggers = this.item.triggers.filter((_val: CommandTrigger, index: number) => index !== idx);
    },
    insertMacro(idx: number, macro: {
      value: string;
      title: string;
    }): void {
      if (!this.item) {
        console.warn("insertMacro: this.item not initialized");
        return;
      }
      this.item.data.text[idx] += macro.value;
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
  },
  components: { StringInput }
});
</script>
<style scoped>
.textarea-holder {
  position: relative;
  padding-right: 2em;
}

.textarea-holder .button {
  position: absolute;
  right: -2px;
  top: 0;
}
</style>
