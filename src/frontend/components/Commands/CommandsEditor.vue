<template>
  <div>
    <div class="actions">
      <span
        v-if="possibleActionsMapped.length === 1"
        class="button is-small mr-1"
        @click="add(possibleActionsMapped[0])"
      >Add command</span>
      <DropdownButton
        v-else
        :actions="possibleActionsMapped"
        label="Add command"
        @click="add"
      />
      <div class="mr-1">
        Filter:
      </div>
      <div class="field has-addons mr-1 mb-0">
        <div class="control">
          <input
            v-model="filter.search"
            class="input is-small"
          >
        </div>
      </div>
      <div
        v-if="showFilters && possibleActionsMapped.length > 1"
        class="field"
      >
        <label
          v-for="(a, idx) in possibleActionsWithCount"
          :key="idx"
          class="mr-1"
        ><input
          v-model="filter.actions"
          class="mr-1"
          type="checkbox"
          :value="a.action"
        >{{ a.action }} ({{ a.count }})</label>
      </div>
      <div
        v-if="showFilters && possibleEffectsMapped.length > 1"
        class="field"
      >
        <label
          v-for="(e, idx) in possibleEffectsWithCount"
          :key="idx"
          class="mr-1"
        ><input
          v-model="filter.effects"
          class="mr-1"
          type="checkbox"
          :value="e.effect"
        >{{ e.effect }} ({{ e.count }})</label>
      </div>
    </div>

    <div
      v-if="cmds.length > 0"
      class="table-container"
    >
      <table
        ref="table"
        class="table is-striped"
      >
        <thead>
          <tr>
            <th />
            <th />
            <th>Triggers</th>
            <th v-if="possibleActions.length > 1">
              Action
            </th>
            <th v-if="possibleEffects.length > 0">
              Effects
              <label v-if="showToggleImages">
                <CheckboxInput
                  v-model="imagesVisible"
                  @update:model-value="onImageVisibleChange"
                />
                Show images
              </label>
            </th>
            <th v-if="possibleActionsMapped.length > 1">
              Type
            </th>
            <th>Enabled</th>
            <th>Permissions</th>
            <th />
            <th />
          </tr>
        </thead>
        <vue-draggable
          :model-value="cmds"
          tag="tbody"
          handle=".handle"
          item-key="id"
          @end="dragEnd"
        >
          <template #item="{ element, index }">
            <tr v-show="!filteredOut(element)">
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
              <td class="col-triggers">
                <div
                  v-for="(trigger, idx2) in element.triggers"
                  :key="idx2"
                  class="spacerow"
                >
                  <TriggerInfo :trigger="trigger" />
                </div>
              </td>
              <td v-if="possibleActions.length > 1">
                <div
                  v-if="actionDescription(element.action)"
                  v-html="actionDescription(element.action)"
                />
              </td>
              <td v-if="possibleEffects.length > 0">
                <table>
                  <tr
                    v-for="(effect, idx2) in element.effects"
                    :key="idx2"
                  >
                    <td>
                      <code>{{ effect.type }}</code>
                    </td>
                    <td>
                      <EffectInfo
                        :effect="effect"
                        :images-visible="imagesVisible"
                        :base-volume="baseVolume"
                        :widget-url="widgetUrl"
                      />
                    </td>
                  </tr>
                </table>
              </td>
              <td v-if="possibleActionsMapped.length > 1">
                {{ element.action }}
              </td>
              <td>
                <span
                  class="is-clickable"
                  @click="element.enabled = !element.enabled; emitChange()"
                >
                  <i
                    v-if="element.enabled"
                    class="fa fa-check has-text-success"
                  />
                  <i
                    v-else
                    class="fa fa-times has-text-danger"
                  />
                </span>
              </td>
              <td>
                {{ permissionsStr(element.restrict) }}
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
                  class="button is-small"
                  @click="duplicate(index)"
                >
                  <i class="fa fa-clone" />
                </button>
              </td>
            </tr>
          </template>
        </vue-draggable>
      </table>
    </div>
    <div v-else>
      No commands set up
    </div>

    <CommandEditor
      v-if="editIdx !== null && editCommand"
      :global-variables="globalVariables"
      :channel-points-custom-rewards="channelPointsCustomRewards"
      :model-value="editCommand"
      :mode="editIdx >= cmds.length ? 'create' : 'edit'"
      :base-volume="baseVolume"
      :widget-url="widgetUrl"
      @save="commandSave"
      @save-and-close="commandSaveAndClose"
      @cancel="editCommand = null"
    />
  </div>
</template>
<script setup lang="ts">
import { ChatEffect, Command, CommandAction, CommandEffectType, CommandTriggerType, GlobalVariable } from "../../../types";
import { commands } from "../../../common/commands";
import { computed, ref } from "vue";
import { permissionsStr } from "../../../common/permissions";
import CheckboxInput from "../CheckboxInput.vue";
import CommandEditor from "./CommandEditor.vue";
import DoubleclickButton from "../DoubleclickButton.vue";
import DropdownButton from "../DropdownButton.vue";
import EffectInfo from "./EffectInfo.vue";
import fn from "../../../common/fn";
import TriggerInfo from "./TriggerInfo.vue";

const anyActionsMatch = (filterActions: string[], item: Command): boolean => {
  if (filterActions.length === 0) {
    return true
  }
  return filterActions.includes(item.action)
}

const anyEffectsMatch = (filterEffects: string[], item: Command): boolean => {
  if (filterEffects.length === 0) {
    return true
  }
  for (const effect of item.effects) {
    if (filterEffects.includes(effect.type)) {
      return true
    }
  }
  return false
}

const findInTriggers = (search: string, command: Command): boolean => {
  // search in triggers:
  return command.triggers.some(trigger => {
    if (trigger.type === CommandTriggerType.COMMAND) {
      return trigger.data.command.toLowerCase().indexOf(search) >= 0
    }
    if (trigger.type === CommandTriggerType.REWARD_REDEMPTION) {
      return trigger.data.command.toLowerCase().indexOf(search) >= 0
    }
    return false
  })
}

const findInEffects = (search: string, command: Command): boolean => {
  if (!command.effects) {
    return false
  }
  for (const effect of command.effects) {
    if (effect.type === CommandEffectType.CHAT) {
      const foundInText = (effect as ChatEffect).data.text.some((text) => {
        return text.toLowerCase().indexOf(search) >= 0
      })
      if (foundInText) {
        return true
      }
    }
  }
  return false
}

const props = withDefaults(defineProps<{
  globalVariables: GlobalVariable[]
  channelPointsCustomRewards: Record<string, string[]>
  possibleActions: CommandAction[]
  possibleEffects: CommandEffectType[]
  baseVolume: number
  modelValue: Command[]
  showToggleImages?: boolean
  showFilters?: boolean
  showImages?: boolean
  widgetUrl?: string
}>(), {
  showToggleImages: false,
  showFilters: false,
  showImages: false,
  widgetUrl: '',
})

const emit = defineEmits<{
  (e: 'update:modelValue', val: Command[]): void
  (e: 'showImagesChange', val: boolean): void
}>()

const cmds = ref<Command[]>(JSON.parse(JSON.stringify(props.modelValue)))
const editIdx = ref<number | null>(null)
const editCommand = ref<Command | null>(null)
const filter = ref<{
  search: string
  actions: string[]
  effects: string[]
}>({
  search: "",
  actions: [],
  effects: [],
})
const imagesVisible = ref<boolean>(props.showImages)

const possibleEffectsMapped = computed(() => {
  return props.possibleEffects.map((effect) => ({
    type: effect,
  }))
})

const possibleEffectsWithCount = computed(() => {
  return props.possibleEffects
    .map((effect) => {
      return {
        effect,
        count: commandCountByEffect(effect),
      };
    })
    .filter((e) => e.count > 0);
})

const possibleActionsMapped = computed(() => {
  return props.possibleActions.map((action) => ({
    type: action,
    title: actionDescription(action),
    label: `Add ${actionName(action)}`,
  }));
})

const possibleActionsWithCount = computed(() => {
  return props.possibleActions
    .map((action) => {
      return {
        action,
        count: commandCountByAction(action),
      };
    })
    .filter((a) => a.count > 0);
})

const onImageVisibleChange = () => {
  // TODO: use value from event?
  emit("showImagesChange", imagesVisible.value);
}

const emitChange = () => {
  emit("update:modelValue", cmds.value);
}

const commandCountByEffect = (effect: string): number => {
  let count = 0;
  for (const cmd of cmds.value) {
    if (cmd.effects && cmd.effects.some(e => e.type === effect)) {
      count++;
    }
  }
  return count;
}

const commandCountByAction = (action: string): number => {
  let count = 0;
  for (const cmd of cmds.value) {
    if (cmd.action === action) {
      count++;
    }
  }
  return count;
}

const filteredOut = (item: Command) => {
  if (!anyActionsMatch(filter.value.actions, item)) {
    return true
  }
  if (!anyEffectsMatch(filter.value.effects, item)) {
    return true
  }

  if (!filter.value.search) {
    return false
  }
  const search = filter.value.search.toLowerCase()
  if (
    findInTriggers(search, item) ||
    findInEffects(search, item)
  ) {
    return false
  }
  return true
}

const remove = (idx: number) => {
  cmds.value = cmds.value.filter((_val, index: number) => index !== idx);
  emitChange();
}

const add = (mappedAction: any) => {
  const type: CommandAction = mappedAction.type;
  editIdx.value = -1;
  editCommand.value = commands[type].NewCommand();
}

const edit = (idx: number) => {
  editIdx.value = idx;
  editCommand.value = cmds.value[idx];
}

const duplicate = (idx: number) => {
  editIdx.value = -1;
  editCommand.value = JSON.parse(JSON.stringify(cmds.value[idx]));
}

const commandSave = (command: Command): void => {
  if (editIdx.value === null) {
    return;
  }
  if (editIdx.value === -1) {
    // put new commands on top of the list
    cmds.value.unshift(command)
    editIdx.value = 0
  }
  else {
    // otherwise edit the edited command
    cmds.value[editIdx.value] = command;
  }
  emitChange();
}

const commandSaveAndClose = (command: Command): void => {
  commandSave(command)
  editIdx.value = null;
  editCommand.value = null;
}

const dragEnd = (evt: {
  oldIndex: number;
  newIndex: number;
}) => {
  cmds.value = fn.arrayMove(cmds.value, evt.oldIndex, evt.newIndex);
  emitChange();
}

const actionDescription = (action: CommandAction) => {
  return commands[action].Description();
}

const actionName = (action: CommandAction) => {
  return commands[action].Name();
}
</script>

<style scoped>
.col-triggers {
  max-width: 200px;
}

.col-triggers>div:not(:last-child) {
  border-bottom: 1px solid #dbdbdb;
  padding-bottom: 0.25em;
  margin-bottom: 0.25em;
}

.actions {
  display: flex;
  align-items: center;
  position: sticky;
  top: 51px;
  background: white;
  z-index: 6;
  padding: 5px 0;
}
</style>
