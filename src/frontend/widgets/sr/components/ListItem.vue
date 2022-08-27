<template>
  <li class="item" :data-user="item.user" :data-yt="item.yt">
    <div class="thumbnail" v-if="showThumbnails !== false">
      <div class="media-16-9">
        <img :src="thumbnail" />
      </div>
    </div>
    <div class="title">
      <span class="title-content title-orig">{{ item.title || item.yt }}</span>
      <span class="title-content title-dupl">{{ item.title || item.yt }}</span>
    </div>
    <div class="meta meta-left">
      <span class="meta-user"
        ><span class="meta-user-text-before">requested by </span
        ><span class="meta-user-name">{{ item.user }}</span
        ><span class="meta-user-text-after"></span
      ></span>
      <span class="meta-plays"
        ><span class="meta-plays-text-before">played </span
        ><span class="meta-plays-count">{{ item.plays }}</span
        ><span class="meta-plays-text-after">
          time{{ item.plays === 1 ? "" : "s" }}</span
        ></span
      >
    </div>
    <div class="meta meta-right vote">
      <span class="meta-plays"
        ><i class="fa fa-repeat" /> {{ item.plays }}</span
      >
      <span class="vote-up"
        ><i class="fa fa-thumbs-up" /> {{ item.goods }}</span
      >
      <span class="vote-down"
        ><i class="fa fa-thumbs-down" /> {{ item.bads }}</span
      >
    </div>
  </li>
</template>
<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  props: {
    item: {
      type: Object,
      required: true,
    },
    showThumbnails: {
      required: true,
    },
  },
  computed: {
    thumbnail() {
      return `https://i.ytimg.com/vi/${this.item.yt}/mqdefault.jpg`;
    },
  },
});
</script>
