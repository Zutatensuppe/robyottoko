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
      <CommandsEditor
        v-if="inited && tab === 'commands'"
        v-model="commands"
        :global-variables="globalVariables"
        :channel-points-custom-rewards="channelPointsCustomRewards"
        :possible-actions="possibleActions"
        :possible-effects="[]"
        :base-volume="100"
        @update:modelValue="sendSave"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
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
import CommandsEditor from "../components/Commands/CommandsEditor.vue";

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

const playerVisible = ref<boolean>(false)
const playlist = ref<PlaylistItem[]>([])
const commands = ref<Command[]>([])
const globalVariables = ref<GlobalVariable[]>([])
const channelPointsCustomRewards = ref<Record<string, string[]>>({})
const settings = ref<SongrequestModuleSettings>(default_settings())
const filter = ref<{ tag: string }>({ tag: '' })
const resrinput = ref<string>('')
const srinput = ref<string>('')
const inited = ref<boolean>(false)
const tab = ref<Tab>('playlist')
const importPlaylist = ref<string>('')
const widgetUrl = ref<string>('')

let ws: WsClient | null = null
const toast = useToast()

const controlDefinitions: ControlDefinition[] = [
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
]

const tabDefinitions: TabDefinition[] = [
  { tab: "playlist", title: "Playlist" },
  { tab: "commands", title: "Commands" },
  { tab: "settings", title: "Settings" },
  { tab: "tags", title: "Tags" },
  { tab: "import", title: "Import/Export" },
]

const possibleActions: CommandAction[] = [
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
]

const tags = computed(() => {
  const tags: TagInfo[] = [];
  playlist.value.forEach((item: PlaylistItem) => {
    item.tags.forEach((tag) => {
      const index = tags.findIndex((t) => t.value === tag);
      if (index === -1) {
        tags.push({ value: tag, count: 1 });
      }
      else {
        tags[index].count++;
      }
    });
  });
  return tags;
})

const youtube = ref<any>(null)

const player = computed((): Player => {
  return (youtube.value || {
    stop: noop,
    play: noop,
    pause: noop,
    unpause: noop,
    setVolume: noop,
    setLoop: noop,
    playing: noop,
  }) as Player;
})

const filteredPlaylist = computed((): PlaylistItem[] => {
  if (filter.value.tag === "") {
    return playlist.value;
  }
  return playlist.value.filter((item: PlaylistItem) => item.tags.includes(filter.value.tag));
})

const item = computed(() => {
  return filteredPlaylist.value[0];
})

const hasItems = computed((): boolean => {
  return filteredPlaylist.value.length !== 0;
})

const playerstyle = computed((): string => {
  return playerVisible.value
    ? ""
    : "width:0;height:0;padding:0;margin-bottom:0;";
})

const togglePlayerButtonText = computed((): string => {
  return playerVisible.value ? "Hide Player" : "Show Player";
})
const exportPlaylistUrl = computed((): string => {
  return `${location.protocol}//${location.host}/api/sr/export`;
})

const sendSave = () => {
  sendMsg({
    event: "save",
    commands: commands.value,
    settings: settings.value,
  });
}

const onTagUpdated = (evt: [
  string,
  string
]) => {
  updateTag(evt[0], evt[1]);
}

const onPlaylistCtrl = (evt: [
  string,
  any[]
]) => {
  sendCtrl(evt[0], evt[1]);
}

const applyFilter = (tag: string) => {
  sendCtrl("filter", [{ tag }]);
}

const doImportPlaylist = async () => {
  const res = await api.importPlaylist(importPlaylist.value);
  if (res.status === 200) {
    tab.value = "playlist";
    toast.success("Import successful");
  }
  else {
    toast.error("Import failed");
  }
}
const togglePlayer = () => {
  playerVisible.value = !playerVisible.value;
  if (playerVisible.value) {
    if (!player.value.playing()) {
      play();
    }
  }
  else {
    player.value.stop();
  }
}
const resr = () => {
  if (resrinput.value !== "") {
    sendCtrl("resr", [resrinput.value]);
    resrinput.value = "";
  }
}
const sr = () => {
  if (srinput.value !== "") {
    sendCtrl("sr", [srinput.value]);
    srinput.value = "";
  }
}
const sendCtrl = (ctrl: string, args: any[]) => {
  sendMsg({ event: "ctrl", ctrl, args });
}
const ended = () => {
  sendMsg({ event: "ended" });
}
const sendMsg = (data: Record<string, any>) => {
  if (ws) {
    ws.send(JSON.stringify(data));
  }
  else {
    console.warn("sendMsg: this.ws not initialized");
  }
}
const play = () => {
  adjustVolume(settings.value.volume);
  if (playerVisible.value && hasItems.value) {
    player.value.play(item.value.yt);
    sendMsg({ event: "play", id: item.value.id });
  }
}
const unpause = () => {
  if (hasItems.value) {
    player.value.unpause();
    sendMsg({ event: "unpause", id: item.value.id });
  }
}
const pause = () => {
  if (playerVisible.value && hasItems.value) {
    player.value.pause();
    sendMsg({ event: "pause" });
  }
}
const adjustVolume = (volume: number) => {
  player.value.setVolume(volume);
}
const updateTag = (oldTag: string, newTag: string) => {
  if (oldTag === newTag) {
    return;
  }
  sendCtrl("updatetag", [oldTag, newTag]);
}

onMounted(async () => {
  nextTick(() => {
    ws = util.wsClient("sr");
    ws.onMessage("save", (data: SongrequestModuleWsEventData) => {
      settings.value = data.settings;
      widgetUrl.value = data.widgetUrl;
      commands.value = data.commands;
      globalVariables.value = data.globalVariables;
      channelPointsCustomRewards.value = data.channelPointsCustomRewards;
    });
    ws.onMessage(["pause"], (_data: SongrequestModuleWsEventData) => {
      if (player.value.playing()) {
        pause();
      }
    });
    ws.onMessage(["unpause"], (_data: SongrequestModuleWsEventData) => {
      if (!player.value.playing()) {
        unpause();
      }
    });
    ws.onMessage(["loop"], (_data: SongrequestModuleWsEventData) => {
      player.value.setLoop(true);
    });
    ws.onMessage(["noloop"], (_data: SongrequestModuleWsEventData) => {
      player.value.setLoop(false);
    });
    ws.onMessage(["onEnded", "prev", "skip", "remove", "move", "tags"], (data: SongrequestModuleWsEventData) => {
      settings.value = data.settings;
      commands.value = data.commands;
      globalVariables.value = data.globalVariables;
      channelPointsCustomRewards.value = data.channelPointsCustomRewards;
      const oldId = filteredPlaylist.value.length > 0
        ? filteredPlaylist.value[0].id
        : null;
      filter.value = data.filter;
      playlist.value = data.playlist;
      const newId = filteredPlaylist.value.length > 0
        ? filteredPlaylist.value[0].id
        : null;
      if (oldId !== newId) {
        play();
      }
    });
    ws.onMessage(["filter"], (data: SongrequestModuleWsEventData) => {
      settings.value = data.settings;
      commands.value = data.commands;
      globalVariables.value = data.globalVariables;
      channelPointsCustomRewards.value = data.channelPointsCustomRewards;
      const oldId = filteredPlaylist.value.length > 0 ? filteredPlaylist.value[0].id : null;
      filter.value = data.filter;
      playlist.value = data.playlist;
      // play only if old id is not in new playlist
      if (!filteredPlaylist.value.find((item) => item.id === oldId)) {
        play();
      }
    });
    ws.onMessage(["stats", "video", "playIdx", "resetStats", "shuffle"], (data: SongrequestModuleWsEventData) => {
      settings.value = data.settings;
      commands.value = data.commands;
      globalVariables.value = data.globalVariables;
      channelPointsCustomRewards.value = data.channelPointsCustomRewards;
      filter.value = data.filter;
      playlist.value = data.playlist;
    });
    ws.onMessage(["add", "init"], (data: SongrequestModuleWsEventData) => {
      settings.value = data.settings;
      widgetUrl.value = data.widgetUrl;
      commands.value = data.commands;
      globalVariables.value = data.globalVariables;
      channelPointsCustomRewards.value = data.channelPointsCustomRewards;
      filter.value = data.filter;
      playlist.value = data.playlist;
      if (!inited.value && !player.value.playing()) {
        play();
      }
      inited.value = true;
    });
    ws.connect();
    play();
  });
})

onUnmounted(() => {
  if (ws) {
    ws.disconnect();
  }
})
</script>

<style scoped>
.table .tag {
  cursor: pointer;
}
</style>
