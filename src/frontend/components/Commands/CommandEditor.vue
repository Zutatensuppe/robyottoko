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
        <div class="modal-card-title">
          {{ title }}
          <div
            v-if="actionDescription"
            class="help"
          >
            <div v-html="actionDescription" />
          </div>
        </div>
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
              <td>
                <div>Triggers:</div>
                <DropdownButton
                  :actions="possibleTriggerActions()"
                  label="Add trigger"
                  @click="addTrigger"
                />
              </td>
              <td>
                <TriggerEditor
                  v-for="(trigger, idx) in item.triggers"
                  :key="idx"
                  class="spacerow"
                  :model-value="trigger"
                  :channel-points-custom-rewards="channelPointsCustomRewards"
                  :removable="item.triggers.length > 1"
                  @update:modelValue="item.triggers[idx] = $event"
                  @remove="rmtrigger(idx)"
                />
              </td>
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
              <td>
                <div>Effects:</div>
                <DropdownButton
                  :actions="possibleEffectActions()"
                  label="Add effect"
                  @click="addEffect"
                />
              </td>
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
              <td>
                <div>Variables:</div>
                <span
                  class="button is-small"
                  @click="onAddVariable"
                >Add Variable</span>
              </td>
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
            <tr>
              <td>
                <div>Disallow Users:</div>
                <span
                  class="button is-small"
                  @click="item.disallow_users.push('')"
                >Add User</span>
              </td>
              <td>
                <div
                  v-for="(user, idx) in item.disallow_users"
                  :key="idx"
                  class="field has-addons"
                >
                  <div class="control">
                    <StringInput v-model="item.disallow_users[idx]" />
                  </div>
                  <button
                    class="button is-small"
                    @click="item.disallow_users = item.disallow_users.filter((x, idx2) => idx2 !== idx)"
                  >
                    <i class="fa fa-remove" />
                  </button>
                </div>
                <div class="help">
                  Users added here will not be able to execute the command.
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div>Allow Users:</div>
                <span
                  class="button is-small"
                  @click="item.allow_users.push('')"
                >Add User</span>
              </td>
              <td>
                <div
                  v-for="(user, idx) in item.allow_users"
                  :key="idx"
                  class="field has-addons"
                >
                  <div class="control">
                    <StringInput v-model="item.allow_users[idx]" />
                  </div>
                  <button
                    class="button is-small"
                    @click="item.allow_users = item.allow_users.filter((x, idx2) => idx2 !== idx)"
                  >
                    <i class="fa fa-remove" />
                  </button>
                </div>
                <div class="help">
                  Users added here will be able to execute the command,
                  regardless of if they are disallowed as well and regardless
                  of their status (eg. mod, sub).
                </div>
              </td>
            </tr>
            <tr>
              <td>
                Cooldown:
              </td>
              <td>
                <table>
                  <tr>
                    <td>Global</td>
                    <td><DurationInput v-model="item.cooldown.global" /></td>
                    <td rowspan="2">
                      <div class="help">
                        If a cooldown is set, the command will not be executed unless
                        the set amount of time has passed since the command was
                        executed the last time.<br>
                        Examples:<br>
                        <code>24h</code> = 24 hours<br>
                        <code>30m</code> = 30 minutes<br>
                        <code>50s</code> = 50 seconds<br>
                        <code>0</code> = no cooldown<br>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td>Per User</td>
                    <td><DurationInput v-model="item.cooldown.perUser" /></td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td>
                Enabled:
              </td>
              <td>
                <CheckboxInput v-model="item.enabled" />
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
          Save
        </button>
        <button
          class="button is-small is-primary"
          :disabled="!valid"
          @click="onSaveAndCloseClick"
        >
          Save and close
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
  newEffect,
  possibleEffectActions
} from "../../../common/commands";
import {
  Command,
  CommandTrigger,
  CommandVariable,
  GlobalVariable,
} from "../../../types";
import { possibleTriggerActions } from "../../../common/triggers";
import DropdownButton from "../DropdownButton.vue";
import DurationInput from "../DurationInput.vue";
import EffectsEditor from "./EffectsEditor.vue";
import StringInput from "../StringInput.vue";
import TriggerEditor from "./TriggerEditor.vue";
import CheckboxInput from "../CheckboxInput.vue";

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

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'save', val: Command): void
  (e: 'save-and-close', val: Command): void
}>()

const item = ref<Command>(JSON.parse(JSON.stringify(props.modelValue)))
const el = ref<HTMLDivElement>() as Ref<HTMLDivElement>
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


const addEffect = (effect: any): void => {
  item.value.effects.push(newEffect(effect.type));
}

const addTrigger = (trigger: any): void => {
  item.value.triggers.push(newTrigger(trigger.type));
}

const onAddVariable = (): void => {
  item.value.variables.push({ name: "", value: "" });
}

const rmVariable = (idx: number): void => {
  item.value.variables = item.value.variables.filter((_val: CommandVariable, index: number) => index !== idx);
}

const onSaveClick = (): void => {
  emit("save", item.value);
}

const onSaveAndCloseClick = (): void => {
  emit("save-and-close", item.value);
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
<style scoped>
.modal-card {
  width: auto;
  /* width: calc(100% - 2em); */
}
.modal-card-body {
  min-height: 450px;
}
</style>
