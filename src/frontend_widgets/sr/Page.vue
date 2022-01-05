<template>
  <div class="wrapper" :class="classes">
    <div class="player video-16-9">
      <responsive-image
        class="hide-video"
        v-if="hidevideo && settings.hideVideoImage.file"
        :src="settings.hideVideoImage.file"
      />
      <div class="hide-video" v-else-if="hidevideo"></div>
      <div class="progress" v-if="settings.showProgressBar">
        <div class="progress-value" :style="progressValueStyle"></div>
      </div>
      <youtube ref="youtube" @ended="ended" />
    </div>
    <ol class="list">
      <list-item
        v-for="(item, idx) in playlistItems"
        :class="idx === 0 ? 'playing' : 'not-playing'"
        :key="idx"
        :item="item"
        :showThumbnails="settings.showThumbnails"
      />
    </ol>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import WsClient from "../../frontend/WsClient";
import {
  SongRequestModuleFilter,
  SongrequestModuleSettings,
} from "../../mod/modules/SongrequestModule";
import { PlaylistItem } from "../../types";
import util from "../util";

interface ComponentData {
  ws: WsClient | null;
  filter: SongRequestModuleFilter;
  hasPlayed: boolean;
  playlist: PlaylistItem[];
  settings: SongrequestModuleSettings;
  progress: number;
  progressInterval: any;
  inited: boolean;
}

export default defineComponent({
  data(): ComponentData {
    return {
      ws: null,
      filter: { tag: "" },
      hasPlayed: false,
      playlist: [],
      settings: {
        volume: 100,
        hideVideoImage: {
          file: "",
          filename: "",
        },
        customCss: "",
        customCssPresets: [],
        showProgressBar: false,
        initAutoplay: true,
        showThumbnails: true,
        maxItemsShown: -1,
      },
      progress: 0,
      progressInterval: null,

      inited: false,
    };
  },
  watch: {
    playlist: function (newVal, oldVal) {
      if (!newVal.find((item, idx) => !this.isFilteredOut(item, idx))) {
        this.player.stop();
      }
    },
    filter: function (newVal, oldVal) {
      if (!this.playlist.find((item, idx) => !this.isFilteredOut(item, idx))) {
        this.player.stop();
      }
    },
  },
  computed: {
    classes() {
      return [
        this.settings.showThumbnails ? "with-thumbnails" : "without-thumbnails",
        this.settings.showProgressBar
          ? "with-progress-bar"
          : "without-progress-bar",
      ];
    },
    player() {
      return this.$refs.youtube;
    },
    progressValueStyle() {
      return {
        width: `${this.progress * 100}%`,
      };
    },
    playlistItems() {
      const playlistItems: PlaylistItem[] = [];
      for (const idx in this.playlist) {
        const item = this.playlist[idx];
        if (!this.isFilteredOut(item, idx)) {
          playlistItems[idx] = item;
        }
      }
      return playlistItems;
    },
    filteredPlaylist() {
      if (this.filter.tag === "") {
        return this.playlist;
      }
      return this.playlist.filter((item) =>
        item.tags.includes(this.filter.tag)
      );
    },
    hidevideo() {
      return this.item ? this.item.hidevideo : false;
    },
    item() {
      return this.filteredPlaylist[0];
    },
    hasItems() {
      return this.filteredPlaylist.length !== 0;
    },
  },
  methods: {
    isFilteredOut(item, idx) {
      if (
        this.settings.maxItemsShown >= 0 &&
        this.settings.maxItemsShown - 1 < idx
      ) {
        return true;
      }
      return this.filter.tag !== "" && !item.tags.includes(this.filter.tag);
    },
    ended() {
      this.sendMsg({ event: "ended" });
    },
    sendMsg(data) {
      this.ws.send(JSON.stringify(data));
    },
    play() {
      this.hasPlayed = true;
      this.adjustVolume();
      if (this.hasItems) {
        this.player.play(this.item.yt);
        this.sendMsg({ event: "play", id: this.item.id });
      }
    },
    unpause() {
      if (this.hasItems) {
        this.player.unpause();
        this.sendMsg({ event: "unpause", id: this.item.id });
      }
    },
    pause() {
      if (this.hasItems) {
        this.player.pause();
        this.sendMsg({ event: "pause" });
      }
    },
    adjustVolume() {
      if (this.player) {
        this.player.setVolume(this.settings.volume);
      }
    },
    applySettings(settings) {
      if (this.settings.customCss !== settings.customCss) {
        let el = document.getElementById("customCss");
        if (el) {
          el.parentElement.removeChild(el);
        }
        el = document.createElement("style");
        el.id = "customCss";
        el.textContent = settings.customCss;
        document.head.appendChild(el);
      }
      if (this.settings.showProgressBar !== settings.showProgressBar) {
        if (this.progressInterval) {
          window.clearInterval(this.progressInterval);
        }
        if (settings.showProgressBar) {
          this.progressInterval = window.setInterval(() => {
            if (this.player) {
              this.progress = this.player.getProgress();
            }
          }, 500);
        }
      }
      this.settings = settings;
      this.adjustVolume();
    },
  },
  mounted() {
    this.ws = util.wsClient("sr");

    this.ws.onMessage(["save", "settings"], (data) => {
      this.applySettings(data.settings);
    });
    this.ws.onMessage(
      ["onEnded", "prev", "skip", "remove", "clear", "move", "tags"],
      (data) => {
        this.applySettings(data.settings);
        const oldId =
          this.filteredPlaylist.length > 0 ? this.filteredPlaylist[0].id : null;
        this.filter = data.filter;
        this.playlist = data.playlist;
        const newId =
          this.filteredPlaylist.length > 0 ? this.filteredPlaylist[0].id : null;
        if (oldId !== newId) {
          this.play();
        }
      }
    );
    this.ws.onMessage(["filter"], (data) => {
      this.applySettings(data.settings);
      const oldId =
        this.filteredPlaylist.length > 0 ? this.filteredPlaylist[0].id : null;
      this.filter = data.filter;
      this.playlist = data.playlist;
      // play only if old id is not in new playlist
      if (!this.filteredPlaylist.find((item) => item.id === oldId)) {
        this.play();
      }
    });
    this.ws.onMessage(["pause"], (data) => {
      if (this.player.playing()) {
        this.pause();
      }
    });
    this.ws.onMessage(["unpause"], (data) => {
      if (!this.player.playing()) {
        if (this.hasPlayed) {
          this.unpause();
        } else {
          this.play();
        }
      }
    });
    this.ws.onMessage(["loop"], (data) => {
      this.player.setLoop(true);
    });
    this.ws.onMessage(["noloop"], (data) => {
      this.player.setLoop(false);
    });
    this.ws.onMessage(
      ["dislike", "like", "video", "playIdx", "resetStats", "shuffle"],
      (data) => {
        this.applySettings(data.settings);
        this.filter = data.filter;
        this.playlist = data.playlist;
      }
    );
    this.ws.onMessage(["add", "init"], (data) => {
      this.applySettings(data.settings);
      this.filter = data.filter;
      this.playlist = data.playlist;
      if (!this.inited && !this.player.playing()) {
        if (this.settings.initAutoplay) {
          this.play();
        }
      }
      this.inited = true;
    });
    this.ws.connect();
  },
});
</script>
