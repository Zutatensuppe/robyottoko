<template>
  <div id="app">
    <div id="top" ref="top">
      <navbar />
      <div id="actionbar" class="p-1">
        <button
          class="button is-small mr-1"
          :disabled="inited ? null : true"
          @click="sendCtrl(control.ctrl, [])"
          :title="control.title"
          v-for="(control, idx) in controlDefinitions"
          :key="idx"
        >
          <i class="fa" :class="control.icon" />
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
          <youtube ref="youtube" @ended="ended" :visible="playerVisible" />
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
      <song-request-settings
        id="settings"
        v-if="inited && tab === 'settings'"
        v-model="settings"
        @update:modelValue="sendSettings"
      />
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
import WsClient from "../WsClient";
import xhr from "../xhr";
import { PlaylistItem } from "../../types";
import {
  SongrequestModuleSettings,
  SongrequestModuleWsEventData,
} from "../../mod/modules/SongrequestModule";
import user from "../user";
import { useToast } from "vue-toastification";

type TagInfo = { value: string; count: number };

interface ControlDefinition {
  title: string;
  ctrl: string;
  icon: string;
}

interface ComponentData {
  $me: any;
  playerVisible: boolean;
  playlist: PlaylistItem[];
  settings: SongrequestModuleSettings;
  filter: {
    tag: string;
  };
  ws: WsClient | null;
  resrinput: string;
  srinput: string;
  inited: boolean;
  tab: "playlist" | "help" | "import" | "tags";
  importPlaylist: string;

  toast: any;
  controlDefinitions: ControlDefinition[];
}

interface Player {
  stop: () => void;
  play: (yt: string) => void;
  pause: () => void;
  unpause: () => void;
  setVolume: (volume: number) => void;
  setLoop: (loop: boolean) => void;
  playing: () => boolean;
}

export default defineComponent({
  data: (): ComponentData => ({
    $me: null,
    playerVisible: false,
    playlist: [],
    settings: {
      volume: 100,
      hideVideoImage: {
        file: "",
        filename: "",
      },
      initAutoplay: true,
      customCss: "",
      showProgressBar: false,
      showThumbnails: true,
      maxItemsShown: -1,
      customCssPresets: [],
    },
    filter: { tag: "" },
    ws: null,
    resrinput: "",
    srinput: "",

    inited: false,

    tab: "playlist", // playlist|help|import|tags
    importPlaylist: "",

    toast: useToast(),
    controlDefinitions: [
      {
        title: "Reset stats",
        ctrl: "resetStats",
        icon: "fa-eraser",
      },
      {
        title: "Clear playlist",
        ctrl: "clear",
        icon: "fa-eject",
      },
      {
        title: "Shuffle",
        ctrl: "shuffle",
        icon: "fa-random",
      },
      {
        title: "Play",
        ctrl: "unpause",
        icon: "fa-play",
      },
      {
        title: "Pause",
        ctrl: "pause",
        icon: "fa-pause",
      },
      {
        title: "Prev",
        ctrl: "prev",
        icon: "fa-step-backward",
      },
      {
        title: "Next",
        ctrl: "skip",
        icon: "fa-step-forward",
      },
    ],
  }),
  computed: {
    tags() {
      const tags: TagInfo[] = [];
      this.playlist.forEach((item: PlaylistItem) => {
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
    player(): Player {
      return (this.$refs.youtube || {
        stop: () => {},
        play: () => {},
        pause: () => {},
        unpause: () => {},
        setVolume: () => {},
        setLoop: () => {},
        playing: () => {},
      }) as Player;
    },
    filteredPlaylist(): PlaylistItem[] {
      if (this.filter.tag === "") {
        return this.playlist;
      }
      return this.playlist.filter((item: PlaylistItem) =>
        item.tags.includes(this.filter.tag)
      );
    },
    item() {
      return this.filteredPlaylist[0];
    },
    hasItems(): boolean {
      return this.filteredPlaylist.length !== 0;
    },
    playerstyle(): string {
      return this.playerVisible
        ? ""
        : "width:0;height:0;padding:0;margin-bottom:0;";
    },
    togglePlayerButtonText(): string {
      return this.playerVisible ? "Hide Player" : "Show Player";
    },
    importPlaylistUrl(): string {
      return `${location.protocol}//${location.host}/api/sr/import`;
    },
    exportPlaylistUrl(): string {
      return `${location.protocol}//${location.host}/api/sr/export`;
    },
    widgetUrl(): string {
      return `${location.protocol}//${location.host}/widget/sr/${this.$me.widgetToken}/`;
    },
  },
  methods: {
    sendSettings() {
      this.sendCtrl("settings", [this.settings]);
    },
    onTagUpdated(evt: [string, string]) {
      this.updateTag(evt[0], evt[1]);
    },
    onPlaylistCtrl(evt: [string, any[]]) {
      this.sendCtrl(evt[0], evt[1]);
    },
    applyFilter(tag: string) {
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
        this.toast.success("Import successful");
      } else {
        this.toast.error("Import failed");
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
    sendCtrl(ctrl: string, args: any[]) {
      this.sendMsg({ event: "ctrl", ctrl, args });
    },
    ended() {
      this.sendMsg({ event: "ended" });
    },
    sendMsg(data: Record<string, any>) {
      if (this.ws) {
        this.ws.send(JSON.stringify(data));
      } else {
        console.warn("sendMsg: this.ws not initialized");
      }
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
    adjustVolume(volume: number) {
      this.player.setVolume(volume);
    },
    updateTag(oldTag: string, newTag: string) {
      if (oldTag === newTag) {
        return;
      }
      this.sendCtrl("updatetag", [oldTag, newTag]);
    },
  },
  created() {
    this.$me = user.getMe();
  },
  async mounted() {
    this.$nextTick(() => {
      this.ws = new WsClient(this.$conf.wsBase + "/sr", this.$me.token);
      this.ws.onMessage("settings", (data: SongrequestModuleWsEventData) => {
        this.settings = data.settings;
      });
      this.ws.onMessage(["pause"], (data: SongrequestModuleWsEventData) => {
        if (this.player.playing()) {
          this.pause();
        }
      });
      this.ws.onMessage(["unpause"], (data: SongrequestModuleWsEventData) => {
        if (!this.player.playing()) {
          this.unpause();
        }
      });
      this.ws.onMessage(["loop"], (data: SongrequestModuleWsEventData) => {
        this.player.setLoop(true);
      });
      this.ws.onMessage(["noloop"], (data: SongrequestModuleWsEventData) => {
        this.player.setLoop(false);
      });
      this.ws.onMessage(
        ["onEnded", "prev", "skip", "remove", "clear", "move", "tags"],
        (data: SongrequestModuleWsEventData) => {
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
      this.ws.onMessage(["filter"], (data: SongrequestModuleWsEventData) => {
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
        ["dislike", "like", "video", "playIdx", "resetStats", "shuffle"],
        (data: SongrequestModuleWsEventData) => {
          this.settings = data.settings;
          this.filter = data.filter;
          this.playlist = data.playlist;
        }
      );
      this.ws.onMessage(
        ["add", "init"],
        (data: SongrequestModuleWsEventData) => {
          this.settings = data.settings;
          this.filter = data.filter;
          this.playlist = data.playlist;
          if (!this.inited && !this.player.playing()) {
            this.play();
          }
          this.inited = true;
        }
      );
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

<style scoped>
.table .tag {
  cursor: pointer;
}
</style>
