<template>
  <div class="trigger-editor">
    <div
      v-if="value.type === 'first_chat'"
      class="field has-addons"
    >
      <span class="mr-1">First chat by user</span>
      <div class="control">
        <label class="mr-1">
          <input
            v-model="value.data.since"
            type="radio"
            class="checkbox mr-1"
            :value="'alltime'"
            @change="emitUpdate"
          >
          Alltime
        </label>
        <label class="mr-1">
          <input
            v-model="value.data.since"
            type="radio"
            class="checkbox mr-1"
            :value="'stream'"
            @change="emitUpdate"
          >
          Current Stream
        </label>
      </div>
      <div class="control">
        <button
          class="button is-small"
          :disabled="!removable"
          @click="emitRemove"
        >
          <i class="fa fa-remove" />
        </button>
      </div>
    </div>
    <div
      v-else-if="value.type === 'command'"
      class="field has-addons"
    >
      <div class="control has-icons-left mr-1">
        <input
          v-model="value.data.command.value"
          class="input is-small"
          :class="{
            'has-background-danger-light': !value.data.command.value,
            'has-text-danger-dark': !value.data.command.value,
          }"
          type="text"
          @input="emitUpdate"
        >
        <span class="icon is-small is-left">
          <i class="fa fa-comments-o" />
        </span>
      </div>
      <div
        class="control mr-1"
        title="Check if command should only be executed if it matches exactly (= no arguments come after it)."
      >
        <label class="mr-1"><input
          v-model="value.data.command.match"
          type="radio"
          value="startsWith"
          @change="emitUpdate"
        > StartsWith</label>
        <label class="mr-1"><input
          v-model="value.data.command.match"
          type="radio"
          value="exact"
          @change="emitUpdate"
        > Exact</label>
        <label class="mr-1"><input
          v-model="value.data.command.match"
          type="radio"
          value="anywhere"
          @change="emitUpdate"
        > Anywhere</label>
      </div>
      <div class="control">
        <button
          class="button is-small"
          :disabled="!removable"
          @click="emitRemove"
        >
          <i class="fa fa-remove" />
        </button>
      </div>
    </div>
    <div
      v-else-if="value.type === 'reward_redemption'"
      class="field has-addons"
    >
      <div class="control has-icons-left">
        <DropdownInput
          v-model="value.data.command.value"
          :values="rewardRedemptionActions.map(a => ({ value: a.type, label: a.label }))"
          :class="{
            'has-background-danger-light': !value.data.command.value,
            'has-text-danger-dark': !value.data.command.value,
          }"
          icon="bullseye"
          @update:modelValue="emitUpdate"
        />
      </div>
      <div class="control">
        <button
          class="button is-small"
          :disabled="!removable"
          @click="emitRemove"
        >
          <i class="fa fa-remove" />
        </button>
      </div>
    </div>
    <div
      v-else-if="value.type === 'timer'"
      class="timer-trigger"
    >
      <div class="control remove-control">
        <button
          class="button is-small"
          :disabled="!removable"
          @click="emitRemove"
        >
          <i class="fa fa-remove" />
        </button>
      </div>
      <div class="timer-trigger-inner">
        <label class="mr-1">Messages ≥</label>
        <div class="control has-icons-left mr-1">
          <IntegerInput
            v-model="value.data.minLines"
            @update:model-value="emitUpdate"
          />
          <span class="icon is-small is-left">
            <i class="fa fa-comments-o" />
          </span>
        </div>
        <label class="mr-1">Interval ≥</label>
        <div class="control has-icons-left has-icons-right mr-1">
          <DurationInput
            :model-value="value.data.minInterval"
            @update:modelValue="value.data.minInterval = $event; emitUpdate(); "
          />
          <span class="icon is-small is-left">
            <i class="fa fa-hourglass" />
          </span>
        </div>
      </div>
      <p class="help">
        Command will be triggered when at least <code>Messages</code> chat
        messages arrived AND <code>Interval</code> have passed.
      </p>
    </div>
    <div
      v-else-if="value.type === 'sub'"
      class="field has-addons"
    >
      Sub
      <div class="control">
        <button
          class="button is-small"
          :disabled="!removable"
          @click="emitRemove"
        >
          <i class="fa fa-remove" />
        </button>
      </div>
    </div>
    <div
      v-else-if="value.type === 'giftsub'"
      class="field has-addons"
    >
      Giftsub
      <div class="control">
        <button
          class="button is-small"
          :disabled="!removable"
          @click="emitRemove"
        >
          <i class="fa fa-remove" />
        </button>
      </div>
    </div>
    <div
      v-else-if="value.type === 'bits'"
      class="field has-addons"
    >
      Bits
      <div class="control">
        <button
          class="button is-small"
          :disabled="!removable"
          @click="emitRemove"
        >
          <i class="fa fa-remove" />
        </button>
      </div>
    </div>
    <div
      v-else-if="value.type === 'follow'"
      class="field has-addons"
    >
      Follow
      <div class="control">
        <button
          class="button is-small"
          :disabled="!removable"
          @click="emitRemove"
        >
          <i class="fa fa-remove" />
        </button>
      </div>
    </div>
    <div
      v-else-if="value.type === 'raid'"
      class="field has-addons"
    >
      Raid
      <div class="control">
        <button
          class="button is-small"
          :disabled="!removable"
          @click="emitRemove"
        >
          <i class="fa fa-remove" />
        </button>
      </div>
    </div>
    <div v-else>
      Unknown trigger: {{ value }}
      <div class="control">
        <button
          class="button is-small"
          :disabled="!removable"
          @click="emitRemove"
        >
          <i class="fa fa-remove" />
        </button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { CommandTrigger, CommandTriggerType } from '../../../types'
import { computed, ref, watch } from 'vue'
import CheckboxInput from '../CheckboxInput.vue'
import DropdownInput from '../DropdownInput.vue'
import DurationInput from '../DurationInput.vue'
import IntegerInput from '../IntegerInput.vue'

const props = defineProps<{
  modelValue: CommandTrigger,
  removable: boolean,
  channelPointsCustomRewards: Record<string, string[]>,
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: CommandTrigger): void
  (e: 'remove'): void
}>()

const value = ref<CommandTrigger>({
  type: '' as CommandTriggerType,
  data: {
    since: '',
    command: {
      value: '',
      match: 'startsWith',
    },
    minInterval: 0,
    minLines: 0,
  },
})

const rewardRedemptionActions = computed(() => {
  const actions: { type: string, title: string, label: string }[] = []
  for (const key in props.channelPointsCustomRewards) {
    actions.push(
      ...props.channelPointsCustomRewards[key].map((r) => ({
        type: r,
        title: r,
        label: r,
      })),
    )
  }
  actions.sort((a, b) =>
    a.title === b.title ? 0 : a.title < b.title ? -1 : 1,
  )
  return actions
})

const emitRemove = () => {
  emit('remove')
}
const emitUpdate = () => {
  emit('update:modelValue', value.value)
}
const apply = (v: CommandTrigger) => {
  value.value = JSON.parse(JSON.stringify(v)) as CommandTrigger
}

apply(props.modelValue)

watch(() => props.modelValue, (v: CommandTrigger) => {
  value.value = v
})
</script>
<style lang="scss" scoped>
@import "../../vars.scss";

.timer-trigger {
  border-radius: $radius;
  color: $main_color;
  padding: 6px 14px;
  background-color: #fff;
  border-style: solid;
  border-width: 1px;
  border-color: #dbdbdb;
  position: relative;
}

.timer-trigger label {
  line-height: 2;
}

.timer-trigger .remove-control:first-child {
  position: absolute;
  top: -1px;
  right: -1px;
  z-index: 10;
}

.timer-trigger .columns {
  margin-top: -0.25rem;
  margin-right: -0.25rem;
  margin-top: -0.25rem;
  margin-bottom: -0.25rem;
}

.timer-trigger .column {
  padding: 0.25rem;
}

.timer-trigger-inner {
  display: flex;
}

.timer-trigger-inner input {
  width: 100px;
}
</style>
