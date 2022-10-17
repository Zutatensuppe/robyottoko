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
            <tr>
              <td>Effects:</td>
              <td>
                <EffectsEditor
                  v-model="item.effects"
                  :item-variables="item.variables"
                  :global-variables="globalVariables"
                  :base-volume="baseVolume"
                  :widget-url="widgetUrl"
                />
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
  isValidEffect,
  newTrigger,
} from "../../../common/commands";
import {
  CommandTrigger,
  CommandVariable,
  GlobalVariable,
  RandomTextCommand,
} from "../../../types";
import { possibleTriggerActions } from "../../../common/triggers";
import StringInput from "../StringInput.vue";
import EffectsEditor from "./EffectsEditor.vue";

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
  components: { StringInput, EffectsEditor },
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
    baseVolume: {
      default: 100,
    },
    widgetUrl: {
      type: String,
      required: false,
      default: "",
    },
  },
  emits: ["update:modelValue", "cancel"],
  data: (): ComponentData => ({
    item: null,
    variableChangeFocusIdx: -1,
    possiblePermissions: permissions,
  }),
  computed: {
    possibleTriggerActions() {
      return possibleTriggerActions();
    },
    valid(): boolean {
      if (!this.item) {
        return false
      }

      if (this.item.triggers.length === 0) {
        return false
      }

      for (const trigger of this.item.triggers) {
        if (!isValidTrigger(trigger)) {
          return false
        }
      }

      if (this.item.effects.length === 0) {
        return false
      }

      for (const effect of this.item.effects) {
        if (!isValidEffect(effect)) {
          return false
        }
      }

      return true
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
    addtrigger(trigger: any): void {
      if (!this.item) {
        console.warn("addtrigger: this.item not initialized");
        return;
      }
      this.item.triggers.push(newTrigger(trigger.type));
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
  }
});
</script>
