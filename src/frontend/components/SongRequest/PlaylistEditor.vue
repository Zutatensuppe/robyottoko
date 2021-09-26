<template>
  <div>
    <div class="filters">
      <div class="currentfilter">
        <div class="mr-1 pt-1">Filter:</div>
        <span class="tag mr-1" v-if="filter.tag" @click="applyFilter('')"
          >{{ filter.tag }} <i class="fa fa-remove ml-1"
        /></span>
        <div v-else class="field has-addons mr-1">
          <div class="control">
            <input
              class="input is-small filter-tag-input"
              type="text"
              v-model="filterTagInput"
              @keyup.enter="applyFilter(filterTagInput)"
            />
          </div>
          <div class="control">
            <span class="button is-small" @click="applyFilter(filterTagInput)"
              >Apply filter</span
            >
          </div>
        </div>
        <label class="pt-1"
          ><input class="checkbox" type="checkbox" v-model="hideFilteredOut" />
          Hide filtered out</label
        >
      </div>
    </div>
    <table class="table is-striped" v-if="playlist.length > 0">
      <thead>
        <tr>
          <th></th>
          <th></th>
          <th></th>
          <th>Title</th>
          <th>User</th>
          <th>Plays</th>
          <th></th>
          <th></th>
          <th></th>
          <th></th>
        </tr>
      </thead>
      <draggable
        :modelValue="enhancedPlaylist"
        @end="dragEnd"
        tag="tbody"
        handle=".handle"
        item-key="id"
      >
        <template #item="{ element, index }">
          <tr v-show="!hideFilteredOut || !element.filteredOut">
            <td class="pt-4 handle">
              <i class="fa fa-arrows"></i>
            </td>
            <td>{{ index + 1 }}</td>
            <td>
              <button
                v-if="index !== firstIndex"
                class="button is-small"
                :disabled="element.filteredOut ? true : null"
                @click="sendCtrl('playIdx', [index])"
                title="Play"
              >
                <i class="fa fa-play" />
              </button>
            </td>
            <td>
              <a
                :href="'https://www.youtube.com/watch?v=' + element.yt"
                target="_blank"
              >
                {{ element.title || element.yt }}
                <i class="fa fa-external-link" />
              </a>
              <div>
                <span
                  v-for="(tag, idx2) in element.tags"
                  :key="idx2"
                  class="tag"
                  @click="sendCtrl('rmtag', [tag, index])"
                >
                  {{ tag }} <i class="fa fa-remove ml-1" />
                </span>
                <span class="button is-small" @click="startAddTag(index)"
                  ><i class="fa fa-plus"
                /></span>
              </div>
              <div class="field has-addons" v-if="tagInputIdx === index">
                <div class="control">
                  <input
                    class="input is-small filter-tag-input"
                    type="text"
                    v-model="tagInput"
                    @keyup.enter="
                      sendCtrl('addtag', [tagInput, index]);
                      tagInput = '';
                    "
                  />
                </div>
                <div class="control">
                  <span
                    class="button is-small"
                    :disabled="tagInput ? null : true"
                    @click="
                      sendCtrl('addtag', [tagInput, index]);
                      tagInput = '';
                    "
                    >Add tag</span
                  >
                </div>
              </div>
            </td>
            <td>{{ element.user }}</td>
            <td>{{ element.plays }}x</td>
            <td>
              <button
                class="button is-small"
                @click="toggleVisibility(element, index)"
                :title="element.hidevideo ? 'Video hidden' : 'Video visible'"
              >
                <i
                  class="fa mr-1"
                  :class="{
                    'fa-eye': !element.hidevideo,
                    'fa-eye-slash': element.hidevideo,
                  }"
                />
              </button>
            </td>
            <td>
              <button
                class="button is-small"
                @click="sendCtrl('goodIdx', [index])"
              >
                <i class="fa fa-thumbs-up mr-1" /> {{ element.goods }}
              </button>
            </td>
            <td>
              <button
                class="button is-small"
                @click="sendCtrl('badIdx', [index])"
              >
                <i class="fa fa-thumbs-down mr-1" /> {{ element.bads }}
              </button>
            </td>
            <td>
              <button
                class="button is-small"
                @click="sendCtrl('rmIdx', [index])"
                title="Remove"
              >
                <i class="fa fa-trash" />
              </button>
            </td>
          </tr>
        </template>
      </draggable>
    </table>
    <div v-else>Playlist is empty</div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import draggable from "vuedraggable";

export default defineComponent({
  components: {
    draggable,
  },
  props: {
    playlist: Array,
    filter: Object,
  },
  data() {
    return {
      hideFilteredOut: true,
      filterTagInput: "",
      tagInput: "",
      tagInputIdx: -1,
    };
  },
  methods: {
    toggleVisibility(item, idx) {
      if (item.hidevideo) {
        this.sendCtrl("videoVisibility", [true, idx]);
      } else {
        this.sendCtrl("videoVisibility", [false, idx]);
      }
    },
    dragEnd(evt) {
      this.sendCtrl("move", [evt.oldIndex, evt.newIndex]);
    },
    applyFilter(tag) {
      this.$emit("filterChange", tag);
    },
    sendCtrl(ctrl, args) {
      this.$emit("ctrl", [ctrl, args]);
    },
    isFilteredOut(item) {
      return this.filter.tag !== "" && !item.tags.includes(this.filter.tag);
    },
    startAddTag(idx) {
      this.tagInputIdx = idx;
      this.$nextTick(() => {
        this.$el.querySelector("table .filter-tag-input").focus();
      });
    },
  },
  computed: {
    enhancedPlaylist() {
      return this.playlist.map((item) => {
        item.filteredOut = this.isFilteredOut(item);
        return item;
      });
    },
    firstIndex() {
      if (this.filter.tag === "") {
        return 0;
      }
      return this.playlist.findIndex((item) =>
        item.tags.includes(this.filter.tag)
      );
    },
  },
  watch: {
    playlist: function (newVal, oldVal) {
      if (!newVal.find((item) => !this.isFilteredOut(item))) {
        this.$emit("stopPlayer");
      }
    },
    filter: function (newVal, oldVal) {
      if (!this.playlist.find((item) => !this.isFilteredOut(item))) {
        this.$emit("stopPlayer");
      }
    },
  },
});
</script>
