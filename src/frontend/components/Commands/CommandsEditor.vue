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
      v-if="commands.length > 0"
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
            <th>Permissions</th>
            <th />
            <th />
          </tr>
        </thead>
        <vue-draggable
          :model-value="commands"
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
                {{ permissionsStr(element) }}
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
      :mode="editIdx >= commands.length ? 'create' : 'edit'"
      :base-volume="baseVolume"
      :widget-url="widgetUrl"
      @save="commandSave"
      @save-and-close="commandSaveAndClose"
      @cancel="editCommand = null"
    />
  </div>
</template>
<script lang="ts">
import { defineComponent, PropType } from "vue";
import { ChatEffect, Command, CommandAction, CommandEffectType, CommandTriggerType, GlobalVariable } from "../../../types";
import { permissionsStr } from "../../../common/permissions";
import { commands } from "../../../common/commands";
import fn from "../../../common/fn";
import CommandEditor from "./CommandEditor.vue";
import EffectInfo from "./EffectInfo.vue";
import TriggerInfo from "./TriggerInfo.vue";
import DropdownButton from "../DropdownButton.vue";
import DoubleclickButton from "../DoubleclickButton.vue";

interface ComponentData {
  commands: Command[]
  editIdx: number | null
  editCommand: Command | null
  filter: {
    search: string
    actions: string[]
    effects: string[]
  }
  imagesVisible: boolean
}

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

export default defineComponent({
  components: { CommandEditor, EffectInfo, TriggerInfo, DropdownButton },
  props: {
    globalVariables: {
      type: Array as PropType<GlobalVariable[]>,
      required: true,
    },
    channelPointsCustomRewards: {
      type: Object as PropType<Record<string, string[]>>,
      required: true,
    },
    possibleActions: {
      type: Array as PropType<CommandAction[]>,
      required: true,
    },
    possibleEffects: {
      type: Array as PropType<CommandEffectType[]>,
      required: true,
    },
    baseVolume: {
      type: Number,
      required: true,
    },
    modelValue: {
      type: Array as PropType<Command[]>,
      required: true,
    },
    showToggleImages: {
      type: Boolean,
      required: false,
      default: false,
    },
    showFilters: {
      type: Boolean,
      required: false,
      default: false,
    },
    showImages: {
      type: Boolean,
      required: false,
      default: false,
    },
    widgetUrl: {
      type: String,
      required: false,
      default: "",
    },
  },
  emits: ["update:modelValue", "showImagesChange"],
  data(): ComponentData {
    return {
      commands: [],
      editIdx: null,
      editCommand: null,
      filter: {
        search: "",
        actions: [],
        effects: [],
      },
      imagesVisible: false,
    };
  },
  computed: {
    possibleEffectsMapped() {
      return this.possibleEffects.map((effect) => ({
        type: effect,
      }))
    },
    possibleEffectsWithCount() {
      return this.possibleEffects
        .map((effect) => {
          return {
            effect,
            count: this.commandCountByEffect(effect),
          };
        })
        .filter((e) => e.count > 0);
    },
    possibleActionsMapped() {
      return this.possibleActions.map((action) => ({
        type: action,
        title: this.actionDescription(action),
        label: `Add ${this.actionName(action)}`,
      }));
    },
    possibleActionsWithCount() {
      return this.possibleActions
        .map((action) => {
          return {
            action,
            count: this.commandCountByAction(action),
          };
        })
        .filter((a) => a.count > 0);
    },
  },
  created() {
    this.commands = JSON.parse(JSON.stringify(this.modelValue));
    this.imagesVisible = this.showImages;
  },
  methods: {
    onImageVisibleChange() {
      // TODO: use value from event?
      this.$emit("showImagesChange", this.imagesVisible);
    },
    emitChange() {
      this.$emit("update:modelValue", this.commands);
    },
    commandCountByEffect(effect: string): number {
      let count = 0;
      for (const cmd of this.commands) {
        if (cmd.effects && cmd.effects.some(e => e.type === effect)) {
          count++;
        }
      }
      return count;
    },
    commandCountByAction(action: string): number {
      let count = 0;
      for (const cmd of this.commands) {
        if (cmd.action === action) {
          count++;
        }
      }
      return count;
    },
    filteredOut(item: Command) {
      if (!anyActionsMatch(this.filter.actions, item)) {
        return true
      }
      if (!anyEffectsMatch(this.filter.effects, item)) {
        return true
      }

      if (!this.filter.search) {
        return false
      }
      const search = this.filter.search.toLowerCase()
      if (
        findInTriggers(search, item) ||
        findInEffects(search, item)
      ) {
        return false
      }
      return true
    },
    permissionsStr(item: Command) {
      return permissionsStr(item.restrict_to);
    },
    remove(idx: number) {
      this.commands = this.commands.filter((_val, index: number) => index !== idx);
      this.emitChange();
    },
    add(mappedAction: any) {
      const type: CommandAction = mappedAction.type;
      this.editIdx = -1;
      this.editCommand = commands[type].NewCommand();
    },
    edit(idx: number) {
      this.editIdx = idx;
      this.editCommand = this.commands[idx];
    },
    duplicate(idx: number) {
      this.editIdx = -1;
      this.editCommand = JSON.parse(JSON.stringify(this.commands[idx]));
    },
    commandSave(command: Command): void {
      if (this.editIdx === null) {
        return;
      }
      if (this.editIdx === -1) {
        // put new commands on top of the list
        this.commands.unshift(command)
        this.editIdx = 0
      }
      else {
        // otherwise edit the edited command
        this.commands[this.editIdx] = command;
      }
      this.emitChange();
    },
    commandSaveAndClose(command: Command): void {
      this.commandSave(command)
      this.editIdx = null;
      this.editCommand = null;
    },
    dragEnd(evt: {
      oldIndex: number;
      newIndex: number;
    }) {
      this.commands = fn.arrayMove(this.commands, evt.oldIndex, evt.newIndex);
      this.emitChange();
    },
    actionDescription(action: CommandAction) {
      return commands[action].Description();
    },
    actionName(action: CommandAction) {
      return commands[action].Name();
    },
  }
});
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
