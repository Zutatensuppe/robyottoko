<template>
  <div>
    <div class="filters">
      <div class="currentfilter">
        <div class="mr-1">Filter:</div>
        <span class="tag mr-1" v-if="filter.tag" @click="applyFilter('')">{{ filter.tag }} <i
            class="fa fa-remove ml-1" /></span>
        <div v-else class="field has-addons mr-1 mb-0">
          <div class="control">
            <input class="input is-small filter-tag-input" type="text" v-model="filterTagInput"
              @keyup.enter="applyFilter(filterTagInput)" />
          </div>
          <div class="control">
            <span class="button is-small" @click="applyFilter(filterTagInput)">Apply filter</span>
          </div>
        </div>
        <label class="pt-1"><input class="checkbox" type="checkbox" v-model="hideFilteredOut" />
          Hide filtered out</label>
      </div>
    </div>
    <div v-if="playlist.length > 0">
      <table class="table is-striped">
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
        <draggable :modelValue="enhancedPlaylist" @end="dragEnd" tag="tbody" handle=".handle" item-key="id">
          <template #item="{ element, index }">
            <tr v-show="!hideFilteredOut || !element.filteredOut">
              <td class="pt-4 handle">
                <i class="fa fa-arrows"></i>
              </td>
              <td>{{ index + 1 }}</td>
              <td>
                <button v-if="index !== firstIndex" class="button is-small"
                  :disabled="element.filteredOut ? true : null" @click="sendCtrl('playIdx', [index])" title="Play">
                  <i class="fa fa-play" />
                </button>
              </td>
              <td>
                <a :href="'https://www.youtube.com/watch?v=' + element.yt" target="_blank">
                  {{ element.title || element.yt }}
                  <i class="fa fa-external-link" />
                </a>
                <div>
                  <span v-for="(tag, idx2) in element.tags" :key="idx2" class="tag"
                    @click="sendCtrl('rmtag', [tag, index])">
                    {{ tag }} <i class="fa fa-remove ml-1" />
                  </span>
                  <span class="button is-small" @click="startAddTag(index)"><i class="fa fa-plus" /></span>
                </div>
                <div class="field has-addons" v-if="tagInputIdx === index">
                  <div class="control">
                    <input class="input is-small filter-tag-input" type="text" v-model="tagInput" @keyup.enter="
  sendCtrl('addtag', [tagInput, index]);
tagInput = '';
                    " />
                  </div>
                  <div class="control">
                    <span class="button is-small" :disabled="tagInput ? null : true" @click="
  sendCtrl('addtag', [tagInput, index]);
tagInput = '';
                    ">Add tag</span>
                  </div>
                </div>
              </td>
              <td>{{ element.user }}</td>
              <td>
                {{ element.plays }}x
                <button class="button is-small ml-1" @click="sendCtrl('resetStatIdx', ['plays', index])"
                  title="Reset plays">
                  <i class="fa fa-eraser" />
                </button>
              </td>
              <td>
                <button class="button is-small" @click="toggleVisibility(element, index)"
                  :title="element.hidevideo ? 'Video hidden' : 'Video visible'">
                  <i class="fa mr-1" :class="{
                    'fa-eye': !element.hidevideo,
                    'fa-eye-slash': element.hidevideo,
                  }" />
                </button>
              </td>
              <td>
                <button class="button is-small" @click="sendCtrl('goodIdx', [index])">
                  <i class="fa fa-thumbs-up mr-1" /> {{ element.goods }}
                </button>
                <button class="button is-small ml-1" @click="sendCtrl('resetStatIdx', ['goods', index])"
                  title="Reset upvotes">
                  <i class="fa fa-eraser" />
                </button>
              </td>
              <td>
                <button class="button is-small" @click="sendCtrl('badIdx', [index])">
                  <i class="fa fa-thumbs-down mr-1" /> {{ element.bads }}
                </button>
                <button class="button is-small ml-1" @click="sendCtrl('resetStatIdx', ['bads', index])"
                  title="Reset downvotes">
                  <i class="fa fa-eraser" />
                </button>
              </td>
              <td>
                <button class="button is-small" @click="sendCtrl('rmIdx', [index])" title="Remove">
                  <i class="fa fa-trash" />
                </button>
              </td>
            </tr>
          </template>
        </draggable>
      </table>
      <div>
        <span class="button is-small mr-1" @click="itemsDisplayed += 20" v-if="itemsDisplayed < playlist.length">Show
          more (+20)</span>
        <span class="button is-small" @click="itemsDisplayed = playlist.length"
          v-if="itemsDisplayed < playlist.length">Show all ({{ playlist.length }})</span>
      </div>
    </div>
    <div v-else>Playlist is empty</div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { DragEndEvent, PlaylistItem } from "../../../types";

interface EnhancedPlaylistItem extends PlaylistItem {
  filteredOut: boolean
}

export default defineComponent({
  props: {
    playlist: {
      type: Array as PropType<PlaylistItem[]>,
      required: true,
    },
    filter: {
      type: Object as PropType<{ tag: string }>,
      required: true,
    },
  },
  data: () => ({
    hideFilteredOut: true,
    filterTagInput: "",
    tagInput: "",
    tagInputIdx: -1,
    itemsDisplayed: 20,
  }),
  methods: {
    toggleVisibility(item: PlaylistItem, idx: number) {
      const visible = !!item.hidevideo;
      this.sendCtrl("videoVisibility", [visible, idx]);
    },
    dragEnd(evt: DragEndEvent) {
      this.sendCtrl("move", [evt.oldIndex, evt.newIndex]);
    },
    applyFilter(tag: string) {
      this.$emit("filterChange", tag);
    },
    sendCtrl(ctrl: string, args: any[]) {
      this.$emit("ctrl", [ctrl, args]);
    },
    isFilteredOut(item: PlaylistItem) {
      return this.filter.tag !== "" && !item.tags.includes(this.filter.tag);
    },
    startAddTag(idx: number) {
      this.tagInputIdx = idx;
      this.$nextTick(() => {
        this.$el.querySelector("table .filter-tag-input").focus();
      });
    },
  },
  computed: {
    enhancedPlaylist(): EnhancedPlaylistItem[] {
      return this.playlist
        .map((item: PlaylistItem) => ({
          id: item.id,
          tags: item.tags,
          yt: item.yt,
          title: item.title,
          timestamp: item.timestamp,
          hidevideo: !!item.hidevideo,
          last_play: item.last_play,
          plays: item.plays,
          goods: item.goods,
          bads: item.bads,
          user: item.user,
          filteredOut: this.isFilteredOut(item),
        }))
        .slice(0, this.itemsDisplayed);
    },
    firstIndex(): number {
      if (this.filter.tag === "") {
        return 0;
      }
      return this.playlist.findIndex((item) =>
        item.tags.includes(this.filter.tag)
      );
    },
  },
  watch: {
    playlist: function (newVal: PlaylistItem[], _oldVal: PlaylistItem[]) {
      if (!newVal.find((item: PlaylistItem) => !this.isFilteredOut(item))) {
        this.$emit("stopPlayer");
      }
    },
    filter: function (_newVal: PlaylistItem[], _oldVal: PlaylistItem[]) {
      if (!this.playlist.find((item: PlaylistItem) => !this.isFilteredOut(item))) {
        this.$emit("stopPlayer");
      }
    },
  },
});
</script>
<style scoped>
.filters .tag {
  cursor: pointer;
}

.filters .currentfilter {
  display: flex;
  align-items: center;
}

.filters .filter-tag-input {
  max-width: 200px;
}
</style>
