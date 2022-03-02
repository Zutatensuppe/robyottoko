<template>
  <div id="app">
    <div id="top" ref="top">
      <navbar />
      <div id="actionbar" class="p-1">
        <button
          class="button is-small is-primary mr-1"
          :disabled="!changed"
          @click="sendSave"
        >
          Save
        </button>
        <a class="button is-small mr-1" :href="receiveUrl" target="_blank"
          >Open widget</a
        >
        <a class="button is-small" :href="drawUrl" target="_blank">Open draw</a>
      </div>
    </div>
    <div id="main" ref="main">
      <table class="table is-striped" ref="table" v-if="inited">
        <tbody>
          <tr>
            <td colspan="3">General</td>
          </tr>
          <tr>
            <td><code>settings.canvasWidth</code></td>
            <td>
              <input
                class="input is-small"
                type="text"
                v-model="settings.canvasWidth"
              />
            </td>
            <td>
              Width of the drawing area.<br />
              Caution: changing this will clear the area for currenty connected
              users.
            </td>
          </tr>
          <tr>
            <td><code>settings.canvasHeight</code></td>
            <td>
              <input
                class="input is-small"
                type="text"
                v-model="settings.canvasHeight"
              />
            </td>
            <td>
              Height of the drawing area.<br />
              Caution: changing this will clear the area for currenty connected
              users.
            </td>
          </tr>
          <tr>
            <td><code>settings.displayDuration</code></td>
            <td>
              <input
                class="input is-small"
                type="text"
                v-model="settings.displayDuration"
              />
            </td>
            <td>
              The duration in Milliseconds that each drawing will be shown
            </td>
          </tr>
          <tr>
            <td><code>settings.displayLatestForever</code></td>
            <td>
              <input type="checkbox" v-model="settings.displayLatestForever" />
            </td>
            <td>If checked, the latest drawing will be shown indefinately.</td>
          </tr>
          <tr>
            <td><code>settings.displayLatestAutomatically</code></td>
            <td>
              <input
                type="checkbox"
                v-model="settings.displayLatestAutomatically"
              />
            </td>
            <td>
              If checked, the latest drawing will be shown in widget
              automatically.
            </td>
          </tr>
          <tr>
            <td><code>settings.autofillLatest</code></td>
            <td>
              <input type="checkbox" v-model="settings.autofillLatest" />
            </td>
            <td>
              Fill the latest submitted drawing into the draw panel when opening
              the draw page.
            </td>
          </tr>
          <tr>
            <td><code>settings.submitButtonText</code></td>
            <td>
              <input
                class="input is-small"
                type="text"
                v-model="settings.submitButtonText"
              />
            </td>
            <td></td>
          </tr>
          <tr>
            <td><code>settings.submitConfirm</code></td>
            <td>
              <input
                class="input is-small"
                type="text"
                v-model="settings.submitConfirm"
              />
            </td>
            <td>
              Leave empty if no confirm is required by user before sending.
            </td>
          </tr>
          <tr>
            <td><code>settings.recentImagesTitle</code></td>
            <td>
              <input
                class="input is-small"
                type="text"
                v-model="settings.recentImagesTitle"
              />
            </td>
            <td>Title for the recently submitted images gallery.</td>
          </tr>
          <tr>
            <td><code>settings.customDescription</code></td>
            <td>
              <textarea
                class="textarea"
                v-model="settings.customDescription"
              ></textarea>
            </td>
            <td>Description text below the drawing panel.</td>
          </tr>
          <tr>
            <td><code>settings.customProfileImage</code></td>
            <td>
              <image-upload
                v-model="settings.customProfileImage"
                @update:modelValue="customProfileImageChanged"
                width="100px"
                height="50px"
                class="spacerow media-holder"
              />
            </td>
            <td>
              Profile image that will be displayed next to the
              <code>settings.customDescription</code>.
            </td>
          </tr>
          <tr>
            <td><code>settings.palette</code></td>
            <td>
              <label
                class="square"
                v-for="(c, idx) in settings.palette"
                :key="idx"
              >
                <input type="color" v-model="settings.palette[idx]" />
                <span
                  class="square-inner"
                  :style="{ backgroundColor: c }"
                ></span>
              </label>
              <br />
              <br />
              <button
                class="button is-small"
                @click="settings.palette = defaultSettings.palette"
              >
                Reset to default palette
              </button>
            </td>
            <td>
              Default colors appearing on the draw page.<br />
              Caution: Changing this will change selected color for currenty
              connected users.
            </td>
          </tr>
          <tr>
            <td><code>settings.notificationSound</code></td>
            <td>
              <sound-upload
                v-model="settings.notificationSound"
                @update:modelValue="notificationSoundChanged"
                class="spacerow media-holder"
              />
            </td>
            <td>
              Add a sound here that plays when new drawings arrive. <br />
              Note: Not played in drawing window, only in widget.
            </td>
          </tr>
          <tr>
            <td>
              <div><code>settings.favoriteLists</code></div>
              <div>
                <span class="button is-small" @click="addFavoriteList"
                  >Add a list</span
                >
              </div>
              <div class="preview">
                <img
                  v-if="favoriteSelection.hovered"
                  :src="favoriteSelection.hovered"
                />
              </div>
            </td>
            <td>
              <div
                v-for="(favoriteList, idx) in settings.favoriteLists"
                :key="idx"
              >
                <div v-if="settings.favoriteLists.length > 1">
                  <span class="button is-small" @click="removeFavoriteList(idx)"
                    >Remove this list</span
                  >
                </div>
                <div>Title:</div>
                <input
                  class="input is-small"
                  type="text"
                  v-model="favoriteList.title"
                />
                <div>Currently selected favorites:</div>
                <div class="favorites">
                  <img
                    :src="url"
                    v-for="(url, idx2) in favoriteList.list"
                    :key="idx2"
                    width="50"
                    height="50"
                    @click="toggleFavorite(idx, url)"
                    @mouseover="favoriteSelection.hovered = url"
                    @mouseleave="favoriteSelection.hovered = ''"
                    class="thumbnail is-favorited mr-1"
                  />
                </div>

                <div class="mt-2">Select favorites:</div>
                <div class="favorites-select">
                  <img
                    :src="url"
                    v-for="(url, idx2) in currentFavoriteSelectionItems"
                    :key="idx2"
                    width="50"
                    height="50"
                    @click="toggleFavorite(idx, url)"
                    @mouseover="favoriteSelection.hovered = url"
                    @mouseleave="favoriteSelection.hovered = ''"
                    class="thumbnail mr-1"
                    :class="{ 'is-favorited': favoriteList.list.includes(url) }"
                  />
                </div>
                <span
                  class="button is-small"
                  @click="
                    favoriteSelection.pagination.page =
                      favoriteSelection.pagination.page - 1
                  "
                  :disabled="
                    favoriteSelection.pagination.page > 1 ? null : true
                  "
                  >Prev</span
                >
                <span
                  class="button is-small"
                  @click="
                    favoriteSelection.pagination.page =
                      favoriteSelection.pagination.page + 1
                  "
                  :disabled="
                    favoriteSelection.pagination.page <
                    favoriteSelectionTotalPages
                      ? null
                      : true
                  "
                  >Next</span
                >
              </div>
            </td>
            <td>
              The favorites will always be displayed at the beginning of the
              gallery in the draw widget.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import {
  mediaFileFromUploadedFile,
  soundMediaFileFromUploadedFile,
} from "../../common/fn";
import {
  default_settings,
  DrawcastSaveEventData,
} from "../../mod/modules/DrawcastModuleCommon";
import {
  DrawcastData,
  DrawcastFavoriteList,
  DrawcastSettings,
  MediaFile,
  SoundMediaFile,
  UploadedFile,
} from "../../types";
import api from "../api";
import util from "../util";
import WsClient from "../WsClient";

interface ComponentData {
  unchangedJson: string;
  changedJson: string;
  inited: boolean;
  settings: DrawcastSettings;
  defaultSettings: DrawcastSettings;
  ws: WsClient | null;
  drawUrl: string;
  favoriteSelection: {
    hovered: string;
    items: string[];
    pagination: {
      page: number;
      perPage: number;
    };
  };
}

export default defineComponent({
  data: (): ComponentData => ({
    unchangedJson: "{}",
    changedJson: "{}",
    inited: false,
    settings: default_settings(),
    defaultSettings: default_settings(),
    ws: null,
    drawUrl: "",
    favoriteSelection: {
      hovered: "",
      items: [],
      pagination: {
        page: 1,
        perPage: 20,
      },
    },
  }),
  async created() {
    this.ws = util.wsClient("drawcast");
    this.ws.onMessage("init", async (data: DrawcastData) => {
      this.settings = data.settings;
      this.unchangedJson = JSON.stringify(data.settings);
      this.drawUrl = data.drawUrl;

      const res = await api.getDrawcastAllImages();
      this.favoriteSelection.items = await res.json();
      this.inited = true;
    });
    this.ws.connect();
  },
  watch: {
    settings: {
      deep: true,
      handler(ch) {
        this.changedJson = JSON.stringify(ch);
      },
    },
  },
  computed: {
    changed() {
      return this.unchangedJson !== this.changedJson;
    },
    receiveUrl(): string {
      return util.widgetUrl("drawcast_receive");
    },
    favoriteSelectionTotalPages() {
      return (
        Math.floor(
          this.favoriteSelection.items.length /
            this.favoriteSelection.pagination.perPage
        ) +
        (this.favoriteSelection.items.length %
          this.favoriteSelection.pagination.perPage ===
        0
          ? 0
          : 1)
      );
    },
    currentFavoriteSelectionItems() {
      const start =
        (this.favoriteSelection.pagination.page - 1) *
        this.favoriteSelection.pagination.perPage;
      return this.favoriteSelection.items.slice(
        start,
        start + this.favoriteSelection.pagination.perPage
      );
    },
  },
  methods: {
    addFavoriteList() {
      if (!this.settings) {
        console.warn("addFavoriteList: this.settings not initialized");
        return;
      }
      this.settings.favoriteLists.push({
        list: [],
        title: "",
      });
    },
    removeFavoriteList(index: number) {
      if (!this.settings) {
        console.warn("removeFavoriteList: this.settings not initialized");
        return;
      }
      const favLists: DrawcastFavoriteList[] = [];
      for (let idx in this.settings.favoriteLists) {
        if (parseInt(idx, 10) === parseInt(`${index}`, 10)) {
          continue;
        }
        favLists.push(this.settings.favoriteLists[idx]);
      }
      this.settings.favoriteLists = favLists;
    },
    toggleFavorite(index: number, url: string) {
      if (!this.settings) {
        console.warn("toggleFavorite: this.settings not initialized");
        return;
      }
      if (this.settings.favoriteLists[index].list.includes(url)) {
        this.settings.favoriteLists[index].list = this.settings.favoriteLists[
          index
        ].list.filter((u: string) => u !== url);
      } else {
        this.settings.favoriteLists[index].list.push(url);
      }
    },
    customProfileImageChanged(file: MediaFile) {
      if (!this.settings) {
        console.warn(
          "customProfileImageChanged: this.settings not initialized"
        );
        return;
      }
      this.settings.customProfileImage = file.file ? file : null;
    },
    notificationSoundChanged(file: SoundMediaFile) {
      if (!this.settings) {
        console.warn("notificationSoundChanged: this.settings not initialized");
        return;
      }
      this.settings.notificationSound = file.file ? file : null;
    },
    sendSave() {
      if (!this.settings) {
        console.warn("sendSave: this.settings not initialized");
        return;
      }
      this.sendMsg({
        event: "save",
        settings: {
          canvasWidth: parseInt(`${this.settings.canvasWidth}`, 10) || 720,
          canvasHeight: parseInt(`${this.settings.canvasHeight}`, 10) || 405,
          submitButtonText: this.settings.submitButtonText,
          submitConfirm: this.settings.submitConfirm,
          recentImagesTitle: this.settings.recentImagesTitle,
          customDescription: this.settings.customDescription,
          customProfileImage: this.settings.customProfileImage,
          palette: this.settings.palette,
          displayDuration:
            parseInt(`${this.settings.displayDuration}`, 10) || 5000,
          displayLatestForever: this.settings.displayLatestForever,
          displayLatestAutomatically: this.settings.displayLatestAutomatically,
          autofillLatest: this.settings.autofillLatest,
          notificationSound: this.settings.notificationSound,
          favoriteLists: this.settings.favoriteLists,
        },
      });
    },
    sendMsg(data: DrawcastSaveEventData) {
      if (!this.ws) {
        console.warn("sendMsg: this.ws not initialized");
        return;
      }
      this.ws.send(JSON.stringify(data));
    },
  },
  unmounted() {
    if (this.ws) {
      this.ws.disconnect();
    }
  },
});
</script>

<style>
.square {
  display: inline-block;
  padding: 1px;
  border: solid 2px #ccc;
  cursor: pointer;
}
.square .square-inner {
  display: inline-block;
  width: 20px;
  height: 20px;
  margin: 1px;
}
.square input {
  display: none;
}

.preview {
  width: 250px;
}
.preview img {
  width: 100%;
}

.favorites-select img {
  border: solid 1px transparent;
}
.is-favorited,
.favorites-select img.is-favorited {
  border: solid 1px black;
}
</style>
