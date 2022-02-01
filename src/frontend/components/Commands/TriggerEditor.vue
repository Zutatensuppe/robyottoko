<template>
  <div class="trigger-editor">
    <div class="field has-addons" v-if="value.type === 'command'">
      <div class="control has-icons-left mr-1">
        <input
          class="input is-small"
          :class="{
            'has-background-danger-light': !value.data.command,
            'has-text-danger-dark': !value.data.command,
          }"
          type="text"
          v-model="value.data.command"
          @update:modelValue="emitUpdate"
        />
        <span class="icon is-small is-left">
          <i class="fa fa-comments-o"></i>
        </span>
      </div>
      <div
        class="control mr-1"
        title="Check if command should only be executed if it matches exactly (= no arguments come after it)."
      >
        <label>
          <input
            type="checkbox"
            class="checkbox mr-1"
            v-model="value.data.commandExact"
            @update:modelValue="emitUpdate"
          />
          <span class="is-small is-left">exact</span>
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
    <div class="field has-addons" v-if="value.type === 'reward_redemption'">
      <div class="control has-icons-left">
        <input
          class="input is-small"
          :class="{
            'has-background-danger-light': !value.data.command,
            'has-text-danger-dark': !value.data.command,
          }"
          type="text"
          v-model="value.data.command"
          @update:modelValue="emitUpdate"
        />
        <span class="icon is-small is-left">
          <i class="fa fa-bullseye"></i>
        </span>
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

    <div v-if="value.type === 'timer'" class="timer-trigger">
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
          <input
            class="input is-small"
            v-model="value.data.minLines"
            @update:modelValue="emitUpdate"
          />
          <span class="icon is-small is-left">
            <i class="fa fa-comments-o"></i>
          </span>
        </div>
        <label class="mr-1">Interval ≥</label>
        <div class="control has-icons-left has-icons-right mr-1">
          <duration-input
            :modelValue="value.data.minInterval"
            @update:modelValue="
              value.data.minInterval = $event;
              emitUpdate();
            "
          />
          <span class="icon is-small is-left">
            <i class="fa fa-hourglass"></i>
          </span>
        </div>
      </div>
      <p class="help">
        Command will be triggered when at least <code>Messages</code> chat
        messages arrived AND <code>Interval</code> have passed.
      </p>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, PropType } from "vue";
import { CommandTrigger } from "../../../types";

export default defineComponent({
  props: {
    modelValue: {
      type: Object as PropType<CommandTrigger>,
      required: true,
    },
    removable: {
      type: Boolean,
      required: true,
    },
  },
  emits: ["update:modelValue", "remove"],
  data() {
    return {
      value: {
        type: "",
        data: {
          command: "",
          commandExact: false,
          minInterval: 0,
          minLines: 0,
        },
      },
    };
  },
  created() {
    this.apply(this.modelValue);
  },
  methods: {
    emitRemove() {
      this.$emit("remove");
    },
    emitUpdate() {
      this.$emit("update:modelValue", this.value);
    },
    apply(value: CommandTrigger) {
      this.value = JSON.parse(JSON.stringify(value));
    },
  },
  watch: {
    modelValue(newValue, oldValue) {
      this.apply(newValue);
    },
  },
});
</script>
<style scoped>
.timer-trigger {
  border-radius: 4px;
  color: var(--main-color);
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
