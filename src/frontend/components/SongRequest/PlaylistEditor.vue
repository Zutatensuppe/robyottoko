<template>
  <div ref="el">
    <div class="filters">
      <div class="currentfilter">
        <div class="mr-1">
          Filter:
        </div>
        <span
          v-if="filter.tag"
          class="tag mr-1"
          @click="applyFilter('')"
        >{{ filter.tag }} <i
          class="fa fa-remove ml-1"
        /></span>
        <div
          v-else
          class="field has-addons mr-1 mb-0"
        >
          <div class="control">
            <input
              v-model="filterTagInput"
              class="input is-small filter-tag-input"
              type="text"
              @keyup.enter="applyFilter(filterTagInput)"
            >
          </div>
          <div class="control">
            <span
              class="button is-small"
              @click="applyFilter(filterTagInput)"
            >Apply filter</span>
          </div>
        </div>
        <label class="pt-1"><CheckboxInput
          v-model="hideFilteredOut"
        />
          Hide filtered out</label>
      </div>
    </div>
    <div v-if="playlist.length > 0">
      <table class="table is-striped">
        <thead>
          <tr>
            <th />
            <th />
            <th />
            <th>
              Title
              <i
                class="fa fa-chevron-up is-clickable"
                title="Sort by title, A - Z"
                @click="sort(SortBy.TITLE, 1)"
              />
              <i
                class="fa fa-chevron-down is-clickable"
                title="Sort by title, Z - A"
                @click="sort(SortBy.TITLE, -1)"
              />
            </th>
            <th>
              User
              <i
                class="fa fa-chevron-up is-clickable"
                title="Sort by user, A - Z"
                @click="sort(SortBy.USER, 1)"
              />
              <i
                class="fa fa-chevron-down is-clickable"
                title="Sort by user, Z - A"
                @click="sort(SortBy.USER, -1)"
              />
            </th>
            <th>
              Date
              <i
                class="fa fa-chevron-up is-clickable"
                title="Sort by date, oldest to newest"
                @click="sort(SortBy.TIMESTAMP, 1)"
              />
              <i
                class="fa fa-chevron-down is-clickable"
                title="Sort by date, newest to oldest"
                @click="sort(SortBy.TIMESTAMP, -1)"
              />
            </th>
            <th>
              Plays
              <i
                class="fa fa-chevron-up is-clickable"
                title="Sort by plays, fewest to most"
                @click="sort(SortBy.PLAYS, 1)"
              />
              <i
                class="fa fa-chevron-down is-clickable"
                title="Sort by plays, most to fewest"
                @click="sort(SortBy.PLAYS, -1)"
              />
            </th>
            <th />
            <th />
            <th />
            <th />
          </tr>
        </thead>
        <vue-draggable
          :model-value="enhancedPlaylist"
          tag="tbody"
          handle=".handle"
          item-key="id"
          @end="dragEnd"
        >
          <template #item="{ element, index }">
            <tr v-show="!hideFilteredOut || !element.filteredOut">
              <td class="pt-4 handle">
                <i class="fa fa-arrows" />
              </td>
              <td>{{ index + 1 }}</td>
              <td>
                <button
                  v-if="index !== firstIndex"
                  class="button is-small"
                  :disabled="element.filteredOut ? true : undefined"
                  title="Play"
                  @click="sendCtrl('playIdx', [index])"
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
                  <span
                    class="button is-small"
                    @click="startAddTag(index)"
                  ><i class="fa fa-plus" /></span>
                </div>
                <div
                  v-if="tagInputIdx === index"
                  class="field has-addons"
                >
                  <div class="control">
                    <input
                      v-model="tagInput"
                      class="input is-small filter-tag-input"
                      type="text"
                      @keyup.enter="
                        sendCtrl('addtag', [tagInput, index]);
                        tagInput = '';
                      "
                    >
                  </div>
                  <div class="control">
                    <span
                      class="button is-small"
                      :disabled="tagInput ? undefined : true"
                      @click="
                        sendCtrl('addtag', [tagInput, index]);
                        tagInput = '';
                      "
                    >Add tag</span>
                  </div>
                </div>
              </td>
              <td>
                {{ element.user }}
              </td>
              <td>
                {{ formatTimestamp(element.timestamp) }}
              </td>
              <td>
                {{ element.plays }}x
                <button
                  class="button is-small ml-1"
                  title="Reset plays"
                  @click="sendCtrl('resetStatIdx', ['plays', index])"
                >
                  <i class="fa fa-eraser" />
                </button>
              </td>
              <td>
                <button
                  class="button is-small"
                  :title="element.hidevideo ? 'Video hidden' : 'Video visible'"
                  @click="toggleVisibility(element, index)"
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
                <button
                  class="button is-small ml-1"
                  title="Reset upvotes"
                  @click="sendCtrl('resetStatIdx', ['goods', index])"
                >
                  <i class="fa fa-eraser" />
                </button>
              </td>
              <td>
                <button
                  class="button is-small"
                  @click="sendCtrl('badIdx', [index])"
                >
                  <i class="fa fa-thumbs-down mr-1" /> {{ element.bads }}
                </button>
                <button
                  class="button is-small ml-1"
                  title="Reset downvotes"
                  @click="sendCtrl('resetStatIdx', ['bads', index])"
                >
                  <i class="fa fa-eraser" />
                </button>
              </td>
              <td>
                <DoubleclickButton
                  class="button is-small mr-1"
                  message="Are you sure?"
                  :timeout="1000"
                  title="Remove"
                  @doubleclick="sendCtrl('rmIdx', [index])"
                >
                  <i class="fa fa-trash" />
                </DoubleclickButton>
              </td>
            </tr>
          </template>
        </vue-draggable>
      </table>
      <div>
        <span
          v-if="itemsDisplayed < playlist.length"
          class="button is-small mr-1"
          @click="itemsDisplayed += 20"
        >Show
          more (+20)</span>
        <span
          v-if="itemsDisplayed < playlist.length"
          class="button is-small"
          @click="itemsDisplayed = playlist.length"
        >Show all ({{ playlist.length }})</span>
      </div>
    </div>
    <div v-else>
      Playlist is empty
    </div>
  </div>
</template>

<script setup lang="ts">
import { dateformat } from "../../../common/fn"
import { computed, nextTick, Ref, ref, watch } from "vue"
import { DragEndEvent, PlaylistItem } from "../../../types"
import { SortBy, SortDirection } from "../../../mod/modules/SongrequestModuleCommon"
import DoubleclickButton from '../DoubleclickButton.vue'

interface EnhancedPlaylistItem extends PlaylistItem {
  filteredOut: boolean
}

const props = defineProps<{
  playlist: PlaylistItem[]
  filter: { tag: string }
}>()

const emit = defineEmits<{
  (e: 'stopPlayer'): void
  (e: 'filterChange', val: string): void
  (e: 'ctrl', val: [string, any[]]): void
}>()


const hideFilteredOut = ref<boolean>(true)
const filterTagInput = ref<string>("")
const tagInput = ref<string>("")
const tagInputIdx = ref<number>(-1)
const itemsDisplayed = ref<number>(20)

const el = ref<HTMLDivElement>() as Ref<HTMLDivElement>

const enhancedPlaylist = computed((): EnhancedPlaylistItem[] => {
  return props.playlist
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
      filteredOut: isFilteredOut(item),
    }))
    .slice(0, itemsDisplayed.value);
})

const firstIndex = computed((): number => {
  if (props.filter.tag === "") {
    return 0;
  }
  return props.playlist.findIndex((item) =>
    item.tags.includes(props.filter.tag)
  );
})

const sort = (by: SortBy, direction: SortDirection) => {
  sendCtrl('sort', [by, direction])
}
const formatTimestamp = (ms: number) => {
  return dateformat('YYYY-MM-DD hh:mm:ss', new Date(ms));
}
const toggleVisibility = (item: PlaylistItem, idx: number) => {
  const visible = !!item.hidevideo;
  sendCtrl("videoVisibility", [visible, idx]);
}
const dragEnd = (evt: DragEndEvent) => {
  sendCtrl("move", [evt.oldIndex, evt.newIndex]);
}
const applyFilter = (tag: string) => {
  emit("filterChange", tag);
}
const sendCtrl = (ctrl: string, args: any[]) => {
  emit("ctrl", [ctrl, args]);
}
const isFilteredOut = (item: PlaylistItem) => {
  return props.filter.tag !== "" && !item.tags.includes(props.filter.tag);
}
const startAddTag = (idx: number) => {
  tagInputIdx.value = idx;
  nextTick(() => {
    const inputElement = el.value.querySelector("table .filter-tag-input")
    if (inputElement) {
      (inputElement as HTMLInputElement).focus();
    }
  })
}

watch(() => props.playlist, (newVal: PlaylistItem[], _oldVal: PlaylistItem[]) => {
  if (!newVal.find((item: PlaylistItem) => !isFilteredOut(item))) {
    emit("stopPlayer");
  }
})

watch(() => props.filter, () => {
  if (!props.playlist.find((item: PlaylistItem) => !isFilteredOut(item))) {
    emit("stopPlayer");
  }
})
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

table th {
  white-space: nowrap;
}
</style>
