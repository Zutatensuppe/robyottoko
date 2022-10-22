<template>
  <div
    ref="el"
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
            <tr v-if="item.action === 'sr_addtag'">
              <td>Tag:</td>
              <td>
                <input
                  v-model="item.data.tag"
                  class="input is-small spaceinput mb-1"
                >
                <span
                  class="button is-small mr-1"
                  @click="item.data.tag = ''"
                >All args</span>
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

<script setup lang="ts">
import { computed, nextTick, onMounted, Ref, ref, watch } from "vue";

import { permissions } from "../../../common/permissions";
import {
  commands,
  isValidTrigger,
  newTrigger,
} from "../../../common/commands";
import {
  Command,
  CommandTrigger,
  CommandVariable,
  GlobalVariable,
} from "../../../types";
import { possibleTriggerActions } from "../../../common/triggers";
import StringInput from "../StringInput.vue";
import EffectsEditor from "./EffectsEditor.vue";

interface ComponentDataPermission {
  value: string;
  label: string;
}

const props = defineProps<{
  modelValue: any,
  mode: 'create' | 'edit',
  globalVariables: GlobalVariable[],
  channelPointsCustomRewards: Record<string, string[]>,
  baseVolume: any, // number | undefined ???
  widgetUrl: string,
}>()

const emit = defineEmits(["update:modelValue", "cancel"])

const item = ref<Command>(JSON.parse(JSON.stringify(props.modelValue)))
const el = ref<HTMLDivElement | null>(null) as Ref<HTMLDivElement>
const possiblePermissions = ref<ComponentDataPermission[]>(permissions)

const valid = computed((): boolean => {
  // check if all triggers are correct
  for (const trigger of item.value.triggers) {
    if (!isValidTrigger(trigger)) {
      return false;
    }
  }
  return true;
})

const actionDescription = commands[item.value.action].Description()

const verb = {
  create: "Create new ",
  edit: "Edit ",
};
const title = `${verb[props.mode]}${commands[item.value.action].Name()}`;

const addtrigger = (trigger: any): void => {
  item.value.triggers.push(newTrigger(trigger.type));
}

const onAddVariable = (): void => {
  item.value.variables.push({
    name: "",
    value: "",
  });
}

const rmVariable = (idx: number): void => {
  item.value.variables = item.value.variables.filter((_val: CommandVariable, index: number) => index !== idx);
}

const onSaveClick = (): void => {
  emit("update:modelValue", item.value);
}

const onCancelClick = (): void => {
  emit("cancel");
}

const onCloseClick = (): void => {
  emit("cancel");
}

const onOverlayClick = (): void => {
  emit("cancel");
}

const rmtrigger = (idx: number): void => {
  item.value.triggers = item.value.triggers.filter((_val: CommandTrigger, index: number) => index !== idx);
}

watch(() => props.modelValue, (newValue: Command) => {
  item.value = JSON.parse(JSON.stringify(newValue));
}, { deep: true })

onMounted(() => {
  nextTick(() => {
    const inputEl = el.value.querySelector("input[type=\"text\"]");
    if (inputEl) {
      (inputEl as HTMLInputElement).focus();
    }
  })
})
</script>
