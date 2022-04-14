<template>
  <div class="avatar-slot-definition-editor">
    <div class="level avatar-slot-definition-editor-title p-1">
      <div class="level-left">
        <div class="level-item">
          <avatar-animation :frames="defaultAnimation" :width="32" :height="32" />
        </div>
        <div class="level-item">
          <input class="input is-small avatar-slot-definition-editor-title-input"
            :class="{ 'is-static': !titleFocused }" @focus="titleFocused = true" @blur="titleFocused = false"
            v-model="modelValue.slot" />
        </div>
      </div>
      <div class="level-right">
        <div class="level-item">
          <i class="fa fa-chevron-up is-clickable ml-1" @click="$emit('moveUp')"></i>
        </div>
        <div class="level-item">
          <i class="fa fa-chevron-down is-clickable ml-1" @click="$emit('moveDown')"></i>
        </div>
        <div class="level-item">
          <span class="button is-small" @click="$emit('remove')">
            <i class="fa fa-trash"></i>
          </span>
        </div>
      </div>
    </div>
    <div class="p-1">
      <avatar-slot-item-editor class="card mb-1" :class="{ 'is-default': idx === modelValue.defaultItemIndex }"
        v-for="(item, idx) in modelValue.items" :key="idx" :modelValue="item"
        :isDefault="idx === modelValue.defaultItemIndex" @moveUp="moveItemUp(idx)" @moveDown="moveItemDown(idx)"
        @update:modelValue="updateItem(idx, $event)" @remove="removeItem(idx, $event)"
        @makeDefault="makeItemDefault(idx, $event)" />
    </div>

    <span class="button is-small" @click="addItem">Add item</span>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { arraySwap } from "../../../common/fn";
import {
  AvatarModuleAvatarDefinition,
  AvatarModuleAvatarSlotDefinition,
  AvatarModuleAvatarSlotItem,
} from "../../../mod/modules/AvatarModuleCommon";

export default defineComponent({
  props: {
    modelValue: {
      type: Object as PropType<AvatarModuleAvatarSlotDefinition>,
      required: true,
    },
    avatarDef: {
      type: Object as PropType<AvatarModuleAvatarDefinition>,
      required: true,
    },
  },
  emits: ["update:modelValue", "remove", "moveUp", "moveDown"],
  data: () => ({
    titleFocused: false,
  }),
  computed: {
    defaultItem() {
      if (
        this.modelValue.defaultItemIndex >= 0 &&
        this.modelValue.items.length > this.modelValue.defaultItemIndex
      ) {
        return this.modelValue.items[this.modelValue.defaultItemIndex];
      }
      return null;
    },
    defaultAnimation() {
      if (!this.defaultItem) {
        return [];
      }
      const state = this.defaultItem.states.find(
        ({ state }) => state === "default"
      );
      if (!state) {
        return [];
      }
      return state.frames;
    },
  },
  methods: {
    emitChange() {
      this.$emit("update:modelValue", this.modelValue);
    },
    updateItem(index: number, item: AvatarModuleAvatarSlotItem) {
      this.modelValue.items[index] = item;
      this.emitChange();
    },
    removeItem(idx: number, item: AvatarModuleAvatarSlotItem) {
      this.modelValue.items = this.modelValue.items.filter(
        (val, index) => index !== idx
      );
      if (idx <= this.modelValue.defaultItemIndex) {
        this.modelValue.defaultItemIndex = this.modelValue.defaultItemIndex - 1;
      }
      if (
        this.modelValue.items.length > 0 &&
        this.modelValue.defaultItemIndex < 0
      ) {
        this.modelValue.defaultItemIndex = 0;
      }
      this.emitChange();
    },
    makeItemDefault(index: number, item: AvatarModuleAvatarSlotItem) {
      this.modelValue.defaultItemIndex = index;
      this.emitChange();
    },
    addItem() {
      const item: AvatarModuleAvatarSlotItem = {
        title: `${this.modelValue.slot} item ${this.modelValue.items.length + 1
          }`,
        states: this.avatarDef.stateDefinitions.map((stateDef) => ({
          state: stateDef.value,
          frames: [],
        })),
      };
      this.modelValue.items.push(item);
      if (this.modelValue.defaultItemIndex === -1) {
        this.modelValue.defaultItemIndex = 0;
      }
      this.emitChange();
    },
    moveItemUp(idx: number) {
      this.swapItems(idx - 1, idx);
    },
    moveItemDown(idx: number) {
      this.swapItems(idx + 1, idx);
    },
    swapItems(idx1: number, idx2: number) {
      if (arraySwap(this.modelValue.items, idx1, idx2)) {
        if (this.modelValue.defaultItemIndex === idx1) {
          this.modelValue.defaultItemIndex = idx2;
        } else if (this.modelValue.defaultItemIndex === idx2) {
          this.modelValue.defaultItemIndex = idx1;
        }
      }
    },
  },
});
</script>
<style>
.avatar-slot-definition-editor-title-input {
  font-weight: bold;
  font-size: 20px !important;
}

.avatar-slot-definition-editor {
  border: solid 1px hsl(0, 0%, 86%);
}

.avatar-slot-definition-editor-title {
  background: #efefef;
  border-bottom: solid 1px hsl(0, 0%, 86%);
}
</style>
