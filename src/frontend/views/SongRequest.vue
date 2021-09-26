<template>
  <div id="app" v-if="conf">
    <div id="top" ref="top">
      <navbar :user="conf.page_data.user.name" />
      <div id="actionbar" class="p-1">
        <button
          class="button is-small mr-1"
          :disabled="inited ? null : true"
          @click="sendCtrl('resetStats', [])"
          title="Reset stats"
        >
          <i class="fa fa-eraser mr-1" /><span class="txt"> Reset stats</span>
        </button>
        <button
          class="button is-small mr-1"
          :disabled="inited ? null : true"
          @click="sendCtrl('clear', [])"
          title="Clear"
        >
          <i class="fa fa-eject mr-1" /><span class="txt"> Clear</span>
        </button>
        <button
          class="button is-small mr-1"
          :disabled="inited ? null : true"
          @click="sendCtrl('shuffle', [])"
          title="Shuffle"
        >
          <i class="fa fa-random mr-1" /><span class="txt"> Shuffle</span>
        </button>
        <button
          class="button is-small mr-1"
          :disabled="inited ? null : true"
          @click="togglePlayer"
          :title="togglePlayerButtonText"
        >
          <i class="fa fa-tv mr-1" /><span class="txt">
            {{ togglePlayerButtonText }}</span
          >
        </button>

        <div class="field has-addons mr-1">
          <div class="control">
            <input
              class="input is-small"
              :disabled="inited ? null : true"
              v-model="resrinput"
              @keyup.enter="resr"
            />
          </div>
          <div class="control">
            <button
              class="button is-small"
              :disabled="inited ? null : true"
              @click="resr"
            >
              <i class="fa fa-search mr-1"></i> from playlist
            </button>
          </div>
        </div>

        <div class="field has-addons mr-1">
          <div class="control">
            <input
              class="input is-small"
              :disabled="inited ? null : true"
              v-model="srinput"
              @keyup.enter="sr"
            />
          </div>
          <div class="control">
            <button
              class="button is-small"
              :disabled="inited ? null : true"
              @click="sr"
            >
              <i class="fa fa-plus mr-1"></i> from YouTube
            </button>
          </div>
        </div>
        <a
          class="button is-small mr-1"
          :disabled="inited ? null : true"
          :href="widgetUrl"
          target="_blank"
          >Open SR widget</a
        >
      </div>
    </div>
    <div id="main" ref="main">
      <div style="width: 640px; max-width: 100%">
        <div id="player" class="video-16-9" :style="playerstyle">
          <youtube ref="youtube" @ended="ended" />
        </div>
      </div>
      <div class="tabs">
        <ul>
          <li
            :class="{ 'is-active': tab === 'playlist' }"
            @click="tab = 'playlist'"
          >
            <a>Playlist</a>
          </li>
          <li
            :class="{ 'is-active': tab === 'settings' }"
            @click="tab = 'settings'"
          >
            <a>Settings</a>
          </li>
          <li :class="{ 'is-active': tab === 'help' }" @click="tab = 'help'">
            <a>Help</a>
          </li>
          <li :class="{ 'is-active': tab === 'tags' }" @click="tab = 'tags'">
            <a>Tags</a>
          </li>
          <li
            :class="{ 'is-active': tab === 'import' }"
            @click="tab = 'import'"
          >
            <a>Import/Export</a>
          </li>
        </ul>
      </div>
      <div v-if="inited && tab === 'import'">
        <div class="mb-1">
          <a
            class="button is-small mr-1"
            :href="exportPlaylistUrl"
            target="_blank"
            ><i class="fa fa-download mr-1" /> Export playlist</a
          >
          <button class="button is-small" @click="doImportPlaylist">
            <i class="fa fa-upload mr-1" /> Import playlist
          </button>
        </div>
        <textarea class="textarea mb-1" v-model="importPlaylist"></textarea>
      </div>
      <div id="help" v-if="inited && tab === 'help'">
        <help />
      </div>
      <div id="tags" v-if="inited && tab === 'tags'">
        <tags-editor :tags="tags" @updateTag="onTagUpdated" />
      </div>
      <div id="settings" v-if="inited && tab === 'settings'">
        <table class="table is-striped" ref="table" v-if="settings">
          <tbody>
            <tr>
              <td><code>settings.volume</code></td>
              <td>
                <volume-slider
                  v-model="settings.volume"
                  @update:modelValue="onVolumeChange"
                />
              </td>
              <td>Base volume for all songs played</td>
            </tr>
            <tr>
              <td><code>settings.hideVideoImage</code></td>
              <td>
                <div v-if="settings.hideVideoImage.file" class="mb-1">
                  <responsive-image
                    :src="settings.hideVideoImage.file"
                    :title="settings.hideVideoImage.filename"
                    width="100px"
                    height="50px"
                    style="display: inline-block"
                  />
                  <br />
                  <button
                    class="button is-small"
                    @click="hideVideoImageRemoved"
                  >
                    <i class="fa fa-remove mr-1" /> Remove Image
                  </button>
                </div>
                <upload
                  @uploaded="hideVideoImageUploaded"
                  accept="image/*"
                  label="Upload Image"
                />
              </td>
              <td>Image to display when a video is hidden.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        id="playlist"
        class="table-container"
        v-if="inited && tab === 'playlist'"
      >
        <playlist-editor
          :playlist="playlist"
          :filter="filter"
          @stopPlayer="player.stop()"
          @filterChange="applyFilter"
          @ctrl="onPlaylistCtrl"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import Navbar from "../components/Navbar.vue";
import Upload from "../components/Upload.vue";
import Youtube from "../components/Youtube.vue";
import VolumeSlider from "../components/VolumeSlider.vue";
import ResponsiveImage from "../components/ResponsiveImage.vue";
import WsClient from "../WsClient.js";
import xhr from "../xhr.js";
import PlaylistEditor from "../components/SongRequest/PlaylistEditor.vue";
import TagsEditor from "../components/SongRequest/TagsEditor.vue";
import Help from "../components/SongRequest/Help.vue";

export default defineComponent({
  components: {
    Navbar,
    Youtube,
    VolumeSlider,
    Help,
    PlaylistEditor,
    TagsEditor,
    Upload,
    ResponsiveImage,
  },
  data() {
    return {
      playerVisible: false,
      playlist: [],
      settings: {
        volume: 100,
        hideVideoImage: {
          file: "",
          filename: "",
        },
      },
      filter: { tag: "" },
      ws: null,
      resrinput: "",
      srinput: "",

      inited: false,

      tab: "playlist", // playlist|help|import|tags

      // hacky: list of volumeChanges initialized by self
      // volume change is a ctrl sent to server without directly
      // changing anything. only when the response from server
      // arrives will the volume change be made. when that change is
      // made, the volume slider would jump (if many volume changes
      // are made in quick succession, this looks and feels choppy)
      // so we store our local volume changes, and if a volume change
      // arrives from server which corresponds to our local one, we
      // do not change the VISUAL volume level, as it should already
      // be changed... should be solved smarter (send maybe send some
      // id with each request and see if WE sent the request or another)
      volumeChanges: [],

      importPlaylist: "",

      conf: null,
    };
  },
  computed: {
    tags() {
      const tags = [];
      this.playlist.forEach((item) => {
        item.tags.forEach((tag) => {
          const index = tags.findIndex((t) => t.value === tag);
          if (index === -1) {
            tags.push({ value: tag, count: 1 });
          } else {
            tags[index].count++;
          }
        });
      });
      return tags;
    },
    player() {
      return (
        this.$refs.youtube || {
          stop: () => {},
          play: () => {},
          pause: () => {},
          unpause: () => {},
          setVolume: () => {},
          setLoop: () => {},
          playing: () => {},
        }
      );
    },
    filteredPlaylist() {
      if (this.filter.tag === "") {
        return this.playlist;
      }
      return this.playlist.filter((item) =>
        item.tags.includes(this.filter.tag)
      );
    },
    item() {
      return this.filteredPlaylist[0];
    },
    hasItems() {
      return this.filteredPlaylist.length !== 0;
    },
    playerstyle() {
      return this.playerVisible
        ? ""
        : "width:0;height:0;padding:0;margin-bottom:0;";
    },
    togglePlayerButtonText() {
      return this.playerVisible ? "Hide Player" : "Show Player";
    },
    importPlaylistUrl() {
      return `${location.protocol}//${location.host}/sr/import`;
    },
    exportPlaylistUrl() {
      return `${location.protocol}//${location.host}/sr/export`;
    },
    widgetUrl() {
      return `${location.protocol}//${location.host}/widget/sr/${this.conf.page_data.widgetToken}/`;
    },
  },
  methods: {
    hideVideoImageRemoved() {
      this.sendCtrl("settings", [
        {
          volume: this.settings.volume,
          hideVideoImage: {
            filename: "",
            file: "",
          },
        },
      ]);
    },
    hideVideoImageUploaded(file) {
      this.sendCtrl("settings", [
        {
          volume: this.settings.volume,
          hideVideoImage: {
            filename: file.originalname,
            file: file.filename,
          },
        },
      ]);
    },
    onTagUpdated(evt) {
      this.updateTag(evt[0], evt[1]);
    },
    onPlaylistCtrl(evt) {
      this.sendCtrl(evt[0], evt[1]);
    },
    applyFilter(tag) {
      this.sendCtrl("filter", [{ tag }]);
    },
    async doImportPlaylist() {
      const res = await xhr.post(this.importPlaylistUrl, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: this.importPlaylist,
      });
      if (res.status === 200) {
        this.tab = "playlist";
        this.$toasted.success("Import successful");
      } else {
        this.$toasted.error("Import failed");
      }
    },
    togglePlayer() {
      this.playerVisible = !this.playerVisible;
      if (this.playerVisible) {
        if (!this.player.playing()) {
          this.play();
        }
      } else {
        this.player.stop();
      }
    },
    resr() {
      if (this.resrinput !== "") {
        this.sendCtrl("resr", [this.resrinput]);
      }
    },
    sr() {
      if (this.srinput !== "") {
        this.sendCtrl("sr", [this.srinput]);
      }
    },
    sendCtrl(ctrl, args) {
      this.sendMsg({ event: "ctrl", ctrl, args });
    },
    ended() {
      this.sendMsg({ event: "ended" });
    },
    sendMsg(data) {
      this.ws.send(JSON.stringify(data));
    },
    play() {
      this.adjustVolume(this.settings.volume);
      if (this.playerVisible && this.hasItems) {
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
      if (this.playerVisible && this.hasItems) {
        this.player.pause();
        this.sendMsg({ event: "pause" });
      }
    },
    adjustVolume(volume) {
      this.player.setVolume(volume);
    },
    onVolumeChange(volume) {
      this.volumeChanges.push(volume);
      this.sendCtrl("volume", [volume]);
    },
    updateTag(oldTag, newTag) {
      if (oldTag === newTag) {
        return;
      }
      this.sendCtrl("updatetag", [oldTag, newTag]);
      this.tagEditIdx = -1;
    },
  },
  async mounted() {
    const res = await fetch("/api/page/sr");
    if (res.status !== 200) {
      this.$router.push({ name: "login" });
      return;
    }

    this.conf = await res.json();

    this.$nextTick(() => {
      this.ws = new WsClient(
        this.conf.page_data.wsBase + "/sr",
        this.conf.page_data.token
      );
      this.ws.onMessage("settings", (data) => {
        this.settings = data.settings;
      });
      this.ws.onMessage("volume", (data) => {
        // this assumes that all volume changes are done by us
        // otherwise this would probably fail ;C
        if (this.volumeChanges.length > 0) {
          const firstChange = this.volumeChanges.shift();
          if (firstChange === data.settings.volume) {
            this.adjustVolume(data.settings.volume);
            return;
          }
        }
        this.settings.volume = parseInt(`${data.settings.volume}`, 10);
        this.adjustVolume(this.settings.volume);
      });
      this.ws.onMessage(["pause"], (data) => {
        if (this.player.playing()) {
          this.pause();
        }
      });
      this.ws.onMessage(["unpause"], (data) => {
        if (!this.player.playing()) {
          this.unpause();
        }
      });
      this.ws.onMessage(["loop"], (data) => {
        this.player.setLoop(true);
      });
      this.ws.onMessage(["noloop"], (data) => {
        this.player.setLoop(false);
      });
      this.ws.onMessage(
        ["onEnded", "prev", "skip", "remove", "clear", "move"],
        (data) => {
          this.settings = data.settings;
          const oldId =
            this.filteredPlaylist.length > 0
              ? this.filteredPlaylist[0].id
              : null;
          this.filter = data.filter;
          this.playlist = data.playlist;
          const newId =
            this.filteredPlaylist.length > 0
              ? this.filteredPlaylist[0].id
              : null;
          if (oldId !== newId) {
            this.play();
          }
        }
      );
      this.ws.onMessage(["filter"], (data) => {
        this.settings = data.settings;
        const oldId =
          this.filteredPlaylist.length > 0 ? this.filteredPlaylist[0].id : null;
        this.filter = data.filter;
        this.playlist = data.playlist;
        // play only if old id is not in new playlist
        if (!this.filteredPlaylist.find((item) => item.id === oldId)) {
          this.play();
        }
      });
      this.ws.onMessage(
        [
          "dislike",
          "like",
          "video",
          "playIdx",
          "resetStats",
          "shuffle",
          "tags",
        ],
        (data) => {
          this.settings = data.settings;
          this.filter = data.filter;
          this.playlist = data.playlist;
        }
      );
      this.ws.onMessage(["add", "init"], (data) => {
        this.settings = data.settings;
        this.filter = data.filter;
        this.playlist = data.playlist;
        if (!this.player.playing()) {
          this.play();
        }
        this.inited = true;
      });
      this.ws.connect();
      this.play();
    });
  },
  unmounted() {
    if (this.ws) {
      this.ws.disconnect();
    }
  },
});
</script>

<style>
@import "../style-pages.scss";

.table .tag {
  cursor: pointer;
}
.filters .tag {
  cursor: pointer;
}

.filters .currentfilter {
  display: flex;
}
.filters .filter-tag-input {
  max-width: 200px;
}
</style>
