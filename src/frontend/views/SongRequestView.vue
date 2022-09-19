<template>
  <div class="view">
    <div
      id="top"
      ref="top"
    >
      <navbar-element />
      <div
        id="actionbar"
        class="p-1"
      >
        <button
          v-for="(control, idx) in controlDefinitions"
          :key="idx"
          class="button is-small mr-1"
          :disabled="inited ? undefined : true"
          :title="control.title"
          @click="sendCtrl(control.ctrl, [])"
        >
          <i
            class="fa"
            :class="control.icon"
          />
        </button>
        <button
          class="button is-small mr-1"
          :disabled="inited ? undefined : true"
          title="Sets all songs to at least 1x played"
          @click="sendCtrl('setAllToPlayed', [])"
        >
          <span class="txt">Set all to played</span>
        </button>
        <button
          class="button is-small mr-1"
          :disabled="inited ? undefined : true"
          :title="togglePlayerButtonText"
          @click="togglePlayer"
        >
          <i class="fa fa-tv mr-1" /><span class="txt">
            {{ togglePlayerButtonText }}</span>
        </button>

        <div class="field has-addons mr-1">
          <div class="control">
            <input
              v-model="resrinput"
              class="input is-small"
              :disabled="inited ? undefined : true"
              @keyup.enter="resr"
            >
          </div>
          <div class="control">
            <button
              class="button is-small"
              :disabled="inited ? undefined : true"
              @click="resr"
            >
              <i class="fa fa-search mr-1" /> from playlist
            </button>
          </div>
        </div>

        <div class="field has-addons mr-1">
          <div class="control">
            <input
              v-model="srinput"
              class="input is-small"
              :disabled="inited ? undefined : true"
              @keyup.enter="sr"
            >
          </div>
          <div class="control">
            <button
              class="button is-small"
              :disabled="inited ? undefined : true"
              @click="sr"
            >
              <i class="fa fa-plus mr-1" /> from YouTube
            </button>
          </div>
        </div>
        <a
          class="button is-small mr-1"
          :disabled="inited ? undefined : true"
          :href="widgetUrl"
          target="_blank"
        >Open SR
          widget</a>
      </div>
    </div>
    <div
      id="main"
      ref="main"
    >
      <div style="width: 640px; max-width: 100%">
        <div
          id="player"
          class="video-16-9"
          :style="playerstyle"
        >
          <youtube-player
            ref="youtube"
            :visible="playerVisible"
            @ended="ended"
          />
        </div>
      </div>
      <div class="tabs">
        <ul>
          <li
            v-for="(def, idx) in tabDefinitions"
            :key="idx"
            :class="{ 'is-active': tab === def.tab }"
            @click="tab = def.tab"
          >
            <a>{{ def.title }}</a>
          </li>
        </ul>
      </div>
      <div v-if="inited && tab === 'import'">
        <div class="mb-1">
          <a
            class="button is-small mr-1"
            :href="exportPlaylistUrl"
            target="_blank"
          ><i class="fa fa-download mr-1" />
            Export playlist</a>
          <button
            class="button is-small"
            @click="doImportPlaylist"
          >
            <i class="fa fa-upload mr-1" /> Import playlist
          </button>
        </div>
        <textarea
          v-model="importPlaylist"
          class="textarea mb-1"
        />
      </div>
      <div
        v-if="inited && tab === 'tags'"
        id="tags"
      >
        <tags-editor
          :tags="tags"
          @updateTag="onTagUpdated"
        />
      </div>
      <song-request-settings
        v-if="inited && tab === 'settings'"
        id="settings"
        v-model="settings"
        @update:modelValue="sendSave"
      />
      <div
        v-if="inited && tab === 'playlist'"
        id="playlist"
        class="table-container"
      >
        <playlist-editor
          :playlist="playlist"
          :filter="filter"
          @stopPlayer="player.stop()"
          @filterChange="applyFilter"
          @ctrl="onPlaylistCtrl"
        />
      </div>
      <commands-editor
        v-if="inited && tab === 'commands'"
        v-model="commands"
        :global-variables="globalVariables"
        :channel-points-custom-rewards="channelPointsCustomRewards"
        :possible-actions="possibleActions"
        :base-volume="100"
        @update:modelValue="sendSave"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import WsClient from "../WsClient";
import {
  Command,
  CommandAction,
  GlobalVariable,
  PlaylistItem,
} from "../../types";
import {
  default_settings,
  SongrequestModuleSettings,
  SongrequestModuleWsEventData,
  TagInfo,
} from "../../mod/modules/SongrequestModuleCommon";
import { useToast } from "vue-toastification";
import util from "../util";
import api from "../api";

interface ControlDefinition {
  title: string;
  ctrl: string;
  icon: string;
}

type Tab = "playlist" | "commands" | "settings" | "import" | "tags"
interface TabDefinition {
  title: string
  tab: Tab
}

interface ComponentData {
  playerVisible: boolean;
  playlist: PlaylistItem[];
  commands: Command[];
  settings: SongrequestModuleSettings;
  filter: {
    tag: string;
  };
  ws: WsClient | null;
  resrinput: string;
  srinput: string;
  inited: boolean;
  tab: Tab;
  importPlaylist: string;

  widgetUrl: string;

  toast: any;
  controlDefinitions: ControlDefinition[];
  tabDefinitions: TabDefinition[];
  globalVariables: GlobalVariable[];
  channelPointsCustomRewards: Record<string, string[]>;
  possibleActions: CommandAction[];
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

const noop = () => {
  // noop
}

export default defineComponent({
  data: (): ComponentData => ({
    playerVisible: false,
    playlist: [],
    commands: [],
    globalVariables: [],
    channelPointsCustomRewards: {},
    settings: default_settings(),
    filter: { tag: "" },
    ws: null,
    resrinput: "",
    srinput: "",

    inited: false,

    tab: "playlist", // playlist|import|tags
    importPlaylist: "",

    widgetUrl: "",

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
    tabDefinitions: [
      { tab: "playlist", title: "Playlist" },
      { tab: "commands", title: "Commands" },
      { tab: "settings", title: "Settings" },
      { tab: "tags", title: "Tags" },
      { tab: "import", title: "Import/Export" },
    ],

    possibleActions: [
      CommandAction.SR_CURRENT,
      CommandAction.SR_UNDO,
      CommandAction.SR_GOOD,
      CommandAction.SR_BAD,
      CommandAction.SR_STATS,
      CommandAction.SR_PREV,
      CommandAction.SR_NEXT,
      CommandAction.SR_JUMPTONEW,
      CommandAction.SR_CLEAR,
      CommandAction.SR_RM,
      CommandAction.SR_SHUFFLE,
      CommandAction.SR_RESET_STATS,
      CommandAction.SR_LOOP,
      CommandAction.SR_NOLOOP,
      CommandAction.SR_PAUSE,
      CommandAction.SR_UNPAUSE,
      CommandAction.SR_HIDEVIDEO,
      CommandAction.SR_SHOWVIDEO,
      CommandAction.SR_REQUEST,
      CommandAction.SR_RE_REQUEST,
      CommandAction.SR_ADDTAG,
      CommandAction.SR_RMTAG,
      CommandAction.SR_VOLUME,
      CommandAction.SR_FILTER,
      CommandAction.SR_PRESET,
      CommandAction.SR_QUEUE,
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
        stop: noop,
        play: noop,
        pause: noop,
        unpause: noop,
        setVolume: noop,
        setLoop: noop,
        playing: noop,
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
    exportPlaylistUrl(): string {
      return `${location.protocol}//${location.host}/api/sr/export`;
    },
  },
  async mounted() {
    this.$nextTick(() => {
      this.ws = util.wsClient("sr");
      this.ws.onMessage("save", (data: SongrequestModuleWsEventData) => {
        this.settings = data.settings;
        this.widgetUrl = data.widgetUrl;
        this.commands = data.commands;
        this.globalVariables = data.globalVariables;
        this.channelPointsCustomRewards = data.channelPointsCustomRewards;
      });
      this.ws.onMessage(["pause"], (_data: SongrequestModuleWsEventData) => {
        if (this.player.playing()) {
          this.pause();
        }
      });
      this.ws.onMessage(["unpause"], (_data: SongrequestModuleWsEventData) => {
        if (!this.player.playing()) {
          this.unpause();
        }
      });
      this.ws.onMessage(["loop"], (_data: SongrequestModuleWsEventData) => {
        this.player.setLoop(true);
      });
      this.ws.onMessage(["noloop"], (_data: SongrequestModuleWsEventData) => {
        this.player.setLoop(false);
      });
      this.ws.onMessage(
        ["onEnded", "prev", "skip", "remove", "move", "tags"],
        (data: SongrequestModuleWsEventData) => {
          this.settings = data.settings;
          this.commands = data.commands;
          this.globalVariables = data.globalVariables;
          this.channelPointsCustomRewards = data.channelPointsCustomRewards;
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
        this.commands = data.commands;
        this.globalVariables = data.globalVariables;
        this.channelPointsCustomRewards = data.channelPointsCustomRewards;
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
        ["stats", "video", "playIdx", "resetStats", "shuffle"],
        (data: SongrequestModuleWsEventData) => {
          this.settings = data.settings;
          this.commands = data.commands;
          this.globalVariables = data.globalVariables;
          this.channelPointsCustomRewards = data.channelPointsCustomRewards;
          this.filter = data.filter;
          this.playlist = data.playlist;
        }
      );
      this.ws.onMessage(
        ["add", "init"],
        (data: SongrequestModuleWsEventData) => {
          this.settings = data.settings;
          this.widgetUrl = data.widgetUrl;
          this.commands = data.commands;
          this.globalVariables = data.globalVariables;
          this.channelPointsCustomRewards = data.channelPointsCustomRewards;
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
  methods: {
    sendSave() {
      this.sendMsg({
        event: "save",
        commands: this.commands,
        settings: this.settings,
      });
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
      const res = await api.importPlaylist(this.importPlaylist);
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
        this.resrinput = ''
      }
    },
    sr() {
      if (this.srinput !== "") {
        this.sendCtrl("sr", [this.srinput]);
        this.srinput = ''
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
});
</script>

<style scoped>
.table .tag {
  cursor: pointer;
}
</style>