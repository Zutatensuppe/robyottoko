<template>
  <li
    class="item"
    :data-user="item.user"
    :data-yt="item.yt"
  >
    <div
      v-if="showThumbnails !== false"
      class="thumbnail"
    >
      <div class="media-16-9">
        <img :src="thumbnail">
      </div>
    </div>
    <div class="title">
      <span class="title-content title-orig">{{ item.title || item.yt }}</span>
      <span class="title-content title-dupl">{{ item.title || item.yt }}</span>
    </div>
    <div class="meta meta-left">
      <span class="meta-user"><span class="meta-user-text-before">requested by </span><span class="meta-user-name">{{ item.user }}</span><span class="meta-user-text-after" /></span>
      <span
        v-if="timestampFormat"
        class="meta-timestamp"
      >{{ formatTimestamp(item.timestamp) }}</span>
      <span class="meta-plays"><span class="meta-plays-text-before">played </span><span class="meta-plays-count">{{ item.plays }}</span><span class="meta-plays-text-after">
        time{{ item.plays === 1 ? "" : "s" }}</span></span>
    </div>
    <div class="meta meta-right vote">
      <span class="meta-plays"><i class="fa fa-repeat" /> {{ item.plays }}</span>
      <span class="vote-up"><i class="fa fa-thumbs-up" /> {{ item.goods }}</span>
      <span class="vote-down"><i class="fa fa-thumbs-down" /> {{ item.bads }}</span>
    </div>
  </li>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { dateformat } from "../../../../common/fn";
import { PlaylistItem } from "../../../../types";

const props = withDefaults(defineProps<{
  item: PlaylistItem
  showThumbnails: boolean
  timestampFormat?: string
}>(), {
  timestampFormat: 'YYYY-MM-DD hh:mm:ss',
})

const thumbnail = computed(() => `https://i.ytimg.com/vi/${props.item.yt}/mqdefault.jpg`)

const formatTimestamp = (ms: number) => dateformat(props.timestampFormat, new Date(ms))
</script>
