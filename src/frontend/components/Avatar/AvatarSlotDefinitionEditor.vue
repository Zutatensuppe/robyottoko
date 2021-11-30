<template>
  <div class="avatar-slot-definition-editor">
    <div>
      Slot: {{ modelValue.slot }}
      <span class="button is-small" @click="$emit('remove')">
        <i class="fa fa-trash"></i>
      </span>
    </div>
    <div>
      Items:
      <avatar-slot-item-editor
        :class="{ 'is-default': idx === this.modelValue.defaultItemIndex }"
        v-for="(item, idx) in modelValue.items"
        :key="idx"
        :modelValue="item"
        @update:modelValue="updateItem(idx, $event)"
        @remove="removeItem(idx, $event)"
        @makeDefault="makeItemDefault(idx, $event)"
      />
    </div>

    <span class="button is-small" @click="addItem">Add item</span>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import {
  AvatarModuleAvatarDefinition,
  AvatarModuleAvatarSlotDefinition,
  AvatarModuleAvatarSlotItem,
} from "../../../mod/modules/AvatarModule";

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
  emits: ["update:modelValue", "remove"],
  data: () => ({}),
  methods: {
    emitChange() {
      this.$emit("update:modelValue", this.modelValue);
    },
    updateItem(index, item) {
      this.modelValue.items[index] = item;
      this.emitChange();
    },
    removeItem(index, item) {
      const items: AvatarModuleAvatarSlotItem[] = [];
      for (let idx in this.modelValue.items) {
        if (parseInt(idx, 10) === parseInt(index, 10)) {
          continue;
        }
        items.push(this.modelValue.items[idx]);
      }
      this.modelValue.items = items;
      if (parseInt(index) <= this.modelValue.defaultItemIndex) {
        this.modelValue.defaultItemIndex = this.modelValue.defaultItemIndex - 1;
      }
      this.emitChange();
    },
    makeItemDefault(index, item) {
      this.modelValue.defaultItemIndex = index;
      this.emitChange();
    },
    addItem() {
      const item: AvatarModuleAvatarSlotItem = {
        title: "",
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
  },
});
</script>
