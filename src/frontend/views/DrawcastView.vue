<template>
  <div class="view">
    <div
      id="top"
      ref="top"
    >
      <NavbarElement />
      <div
        id="actionbar"
        class="p-1"
      >
        <button
          class="button is-small is-primary mr-1"
          :disabled="!changed"
          @click="sendSave"
        >
          Save
        </button>
        <a
          class="button is-small mr-1"
          :href="receiveWidgetUrl"
          target="_blank"
        >Open widget</a>
        <a
          class="button is-small"
          :href="drawUrl"
          target="_blank"
        >Open draw</a>
      </div>
    </div>
    <div
      id="main"
      ref="main"
    >
      <table
        v-if="inited"
        ref="table"
        class="table is-striped"
      >
        <tbody>
          <tr>
            <td colspan="3">
              General
            </td>
          </tr>
          <tr>
            <td><code>settings.canvasWidth</code></td>
            <td>
              <IntegerInput v-model="settings.canvasWidth" />
            </td>
            <td>
              Width of the drawing area.<br>
              Caution: changing this will clear the area for currenty connected
              users.
            </td>
          </tr>
          <tr>
            <td><code>settings.canvasHeight</code></td>
            <td>
              <IntegerInput v-model="settings.canvasHeight" />
            </td>
            <td>
              Height of the drawing area.<br>
              Caution: changing this will clear the area for currenty connected
              users.
            </td>
          </tr>
          <tr>
            <td><code>settings.displayDuration</code></td>
            <td>
              <IntegerInput v-model="settings.displayDuration" />
            </td>
            <td>
              The duration in Milliseconds that each drawing will be shown
            </td>
          </tr>
          <tr>
            <td>
              <code>settings.requireManualApproval</code>
            </td>
            <td>
              <CheckboxInput v-model="settings.requireManualApproval" />
            </td>
            <td>
              If checked, new drawings need to be approved before being
              displayed for anyone.
            </td>
          </tr>
          <tr>
            <td>
              Pending approval
              <br>
              <a
                class="button is-small mr-1"
                :href="controlWidgetUrl"
                target="_blank"
              >Open in separate tab</a>
            </td>
            <td>
              <div v-if="manualApproval.items.length">
                <div
                  v-for="(url, idx2) in manualApproval.items"
                  :key="idx2"
                  class="image-to-approve card mr-1"
                >
                  <div class="card-body">
                    <img
                      :src="url"
                      width="250"
                      class="thumbnail mr-1"
                    >
                  </div>
                  <div class="card-footer">
                    <span
                      class="
                        card-footer-item
                        button
                        is-small is-success is-light
                      "
                      @click="approveImage(url)"
                    >
                      Approve!
                    </span>
                    <span
                      class="
                        card-footer-item
                        button
                        is-small is-danger is-light
                      "
                      @click="denyImage(url)"
                    >
                      Deny!
                    </span>
                  </div>
                </div>
              </div>
              <div v-else>
                Currently there are no drawings awaiting approval.
              </div>
            </td>
            <td />
          </tr>
          <tr>
            <td><code>settings.displayLatestForever</code></td>
            <td>
              <CheckboxInput v-model="settings.displayLatestForever" />
            </td>
            <td>If checked, the latest drawing will be shown indefinately.</td>
          </tr>
          <tr>
            <td><code>settings.displayLatestAutomatically</code></td>
            <td>
              <CheckboxInput v-model="settings.displayLatestAutomatically" />
            </td>
            <td>
              If checked, the latest drawing will be shown in widget
              automatically.
            </td>
          </tr>
          <tr>
            <td><code>settings.autofillLatest</code></td>
            <td>
              <CheckboxInput v-model="settings.autofillLatest" />
            </td>
            <td>
              Fill the latest submitted drawing into the draw panel when opening
              the draw page.
            </td>
          </tr>
          <tr>
            <td><code>settings.submitButtonText</code></td>
            <td>
              <StringInput v-model="settings.submitButtonText" />
            </td>
            <td />
          </tr>
          <tr>
            <td><code>settings.submitConfirm</code></td>
            <td>
              <StringInput v-model="settings.submitConfirm" />
            </td>
            <td>
              Leave empty if no confirm is required by user before sending.
            </td>
          </tr>
          <tr>
            <td><code>settings.recentImagesTitle</code></td>
            <td>
              <StringInput v-model="settings.recentImagesTitle" />
            </td>
            <td>Title for the recently submitted images gallery.</td>
          </tr>
          <tr>
            <td><code>settings.customDescription</code></td>
            <td>
              <textarea
                v-model="settings.customDescription"
                class="textarea"
              />
            </td>
            <td>Description text below the drawing panel.</td>
          </tr>
          <tr>
            <td><code>settings.customProfileImage</code></td>
            <td>
              <ImageUpload
                v-model="settings.customProfileImage"
                width="100px"
                height="50px"
                class="spacerow media-holder"
                @update:modelValue="customProfileImageChanged"
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
                v-for="(c, idx) in settings.palette"
                :key="idx"
                class="square"
              >
                <input
                  v-model="settings.palette[idx]"
                  type="color"
                >
                <span
                  class="square-inner"
                  :style="{ backgroundColor: c }"
                />
              </label>
              <br>
              <br>
              <button
                class="button is-small"
                @click="settings.palette = defaultSettings.palette"
              >
                Reset to default palette
              </button>
            </td>
            <td>
              Default colors appearing on the draw page.<br>
              Caution: Changing this will change selected color for currenty
              connected users.
            </td>
          </tr>
          <tr>
            <td><code>settings.notificationSound</code></td>
            <td>
              <SoundUpload
                v-model="settings.notificationSound"
                class="spacerow media-holder"
                @update:modelValue="notificationSoundChanged"
              />
            </td>
            <td>
              Add a sound here that plays when new drawings arrive. <br>
              This is played in this window, if approval is necessary, otherwise
              it will play in the display widget. It won't play in the draw
              widget.
            </td>
          </tr>
          <tr>
            <td>
              <div><code>settings.favoriteLists</code></div>
              <div>
                <span
                  class="button is-small"
                  @click="addFavoriteList"
                >Add a list</span>
              </div>
              <div class="preview">
                <img
                  v-if="favoriteSelection.hovered"
                  :src="favoriteSelection.hovered"
                >
              </div>
            </td>
            <td>
              <div
                v-for="(favoriteList, idx) in settings.favoriteLists"
                :key="idx"
                class="card p-2 mb-2"
              >
                <div v-if="settings.favoriteLists.length > 1">
                  <span
                    class="button is-small ml-1"
                    :class="{ 'is-disabled': idx > 0 }"
                    @click="moveFavoriteListUp(idx)"
                  ><i class="fa fa-chevron-up" /></span>
                  <span
                    class="button is-small ml-1"
                    :class="{
                      'is-disabled': idx < settings.favoriteLists.length - 1,
                    }"
                    @click="moveFavoriteListDown(idx)"
                  ><i class="fa fa-chevron-down" /></span>
                  <span
                    class="button is-small ml-1"
                    @click="removeFavoriteList(idx)"
                  ><i class="fa fa-trash" /></span>
                </div>
                <table>
                  <tr>
                    <td>Title:</td>
                    <td>
                      <StringInput v-model="favoriteList.title" />
                    </td>
                  </tr>
                  <tr>
                    <td>Currently selected favorites:</td>
                    <td>
                      <div class="favorites">
                        <img
                          v-for="(url, idx2) in favoriteList.list"
                          :key="idx2"
                          :src="url"
                          width="50"
                          height="50"
                          class="thumbnail is-favorited mr-1"
                          @click="toggleFavorite(idx, url)"
                          @mouseover="favoriteSelection.hovered = url"
                          @mouseleave="favoriteSelection.hovered = ''"
                        >
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td>All images:</td>
                    <td>
                      <div class="favorites-select">
                        <template
                          v-for="(url, idx2) in currentFavoriteSelectionItems"
                          :key="idx2"
                        >
                          <div class="favorites-select-image">
                            <img
                              :src="url"
                              width="100"
                              height="100"
                              class="thumbnail mr-1"
                              :class="{
                                'is-favorited': favoriteList.list.includes(url),
                              }"
                              @mouseover="favoriteSelection.hovered = url"
                              @mouseleave="favoriteSelection.hovered = ''"
                            >
                            <div class="buttons">
                              <span
                                class="button is-small"
                                @click="toggleFavorite(idx, url)"
                              >
                                <i
                                  class="fa fa-star"
                                  :class="{
                                    'has-text-warning': favoriteList.list.includes(url),
                                  }"
                                />
                              </span>
                              <DoubleclickButton
                                class="button is-small"
                                message="Are you sure?"
                                :timeout="1000"
                                @doubleclick="deleteImage(url)"
                              >
                                <i class="fa fa-trash" />
                              </DoubleclickButton>
                            </div>
                          </div>
                        </template>
                      </div>
                      <span
                        class="button is-small mr-1"
                        :disabled="
                          favoriteSelection.pagination.page > 1 ? undefined : true
                        "
                        @click="
                          favoriteSelection.pagination.page =
                            favoriteSelection.pagination.page - 1
                        "
                      >Prev</span>
                      <span
                        class="button is-small"
                        :disabled="
                          favoriteSelection.pagination.page <
                            favoriteSelectionTotalPages
                            ? undefined
                            : true
                        "
                        @click="
                          favoriteSelection.pagination.page =
                            favoriteSelection.pagination.page + 1
                        "
                      >Next</span>
                    </td>
                  </tr>
                </table>
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
import { arraySwap } from "../../common/fn";
import {
  default_settings,
  DrawcastImage,
} from "../../mod/modules/DrawcastModuleCommon";
import {
  DrawcastData,
  DrawcastFavoriteList,
  DrawcastSettings,
  MediaFile,
  SoundMediaFile,
} from "../../types";
import api from "../api";
import util from "../util";
import WsClient from "../WsClient";
import StringInput from "../components/StringInput.vue";
import IntegerInput from "../components/IntegerInput.vue";
import CheckboxInput from "../components/CheckboxInput.vue";
import DoubleclickButton from "../components/DoubleclickButton.vue";
import SoundUpload from "../components/SoundUpload.vue";
import ImageUpload from "../components/SoundUpload.vue";
import NavbarElement from "../components/NavbarElement.vue";

interface ComponentData {
  unchangedJson: string;
  changedJson: string;
  inited: boolean;
  settings: DrawcastSettings;
  defaultSettings: DrawcastSettings;
  ws: WsClient | null;
  drawUrl: string;
  notificationSoundAudio: any;
  manualApproval: {
    hovered: string;
    items: string[];
  };
  favoriteSelection: {
    hovered: string;
    items: string[];
    pagination: {
      page: number;
      perPage: number;
    };
  };
  controlWidgetUrl: string;
  receiveWidgetUrl: string;
}

export default defineComponent({
  components: {
    CheckboxInput,
    DoubleclickButton,
    ImageUpload,
    IntegerInput,
    NavbarElement,
    SoundUpload,
    StringInput,
  },
  data: (): ComponentData => ({
    unchangedJson: "{}",
    changedJson: "{}",
    inited: false,
    settings: default_settings(),
    defaultSettings: default_settings(),
    ws: null,
    drawUrl: "",
    notificationSoundAudio: null,
    manualApproval: {
      hovered: "",
      items: [],
    },
    favoriteSelection: {
      hovered: "",
      items: [],
      pagination: {
        page: 1,
        perPage: 20,
      },
    },
    controlWidgetUrl: "",
    receiveWidgetUrl: "",
  }),
  computed: {
    changed() {
      return this.unchangedJson !== this.changedJson;
    },
    favoriteSelectionTotalPages() {
      return (Math.floor(this.favoriteSelection.items.length /
        this.favoriteSelection.pagination.perPage) +
        (this.favoriteSelection.items.length %
          this.favoriteSelection.pagination.perPage ===
          0
          ? 0
          : 1));
    },
    currentFavoriteSelectionItems() {
      const start = (this.favoriteSelection.pagination.page - 1) *
        this.favoriteSelection.pagination.perPage;
      return this.favoriteSelection.items.slice(start, start + this.favoriteSelection.pagination.perPage);
    },
  },
  watch: {
    settings: {
      deep: true,
      handler(ch) {
        this.changedJson = JSON.stringify(ch);
      },
    },
  },
  async created() {
    this.ws = util.wsClient("drawcast");
    this.ws.onMessage("init", async (data: DrawcastData) => {
      this.settings = data.settings;
      this.unchangedJson = JSON.stringify(data.settings);
      this.drawUrl = data.drawUrl;
      this.controlWidgetUrl = data.controlWidgetUrl;
      this.receiveWidgetUrl = data.receiveWidgetUrl;
      const res = await api.getDrawcastAllImages();
      const images = await res.json();
      this.favoriteSelection.items = images.map((item: DrawcastImage) => item.path);
      if (this.settings.notificationSound) {
        this.notificationSoundAudio = new Audio(this.settings.notificationSound.urlpath);
        this.notificationSoundAudio.volume =
          this.settings.notificationSound.volume / 100;
      }
      this.manualApproval.items = images
        .filter((item: DrawcastImage) => !item.approved)
        .map((item: DrawcastImage) => item.path);
      this.inited = true;
    });
    this.ws.onMessage("approved_image_received", (data: {
      nonce: string;
      img: string;
      mayNotify: boolean;
    }) => {
      this.favoriteSelection.items = this.favoriteSelection.items.filter((img) => img !== data.img);
      this.manualApproval.items = this.manualApproval.items.filter((img) => img !== data.img);
      this.favoriteSelection.items.unshift(data.img);
      this.favoriteSelection.items = this.favoriteSelection.items.slice();
    });
    this.ws.onMessage("image_deleted", (data: {
      img: string;
    }) => {
      this.settings.favoriteLists = this.settings.favoriteLists.map(favoriteList => {
        favoriteList.list = favoriteList.list.filter(img => img !== data.img)
        return favoriteList
      })
      this.favoriteSelection.items = this.favoriteSelection.items.filter((img) => img !== data.img);
      this.manualApproval.items = this.manualApproval.items.filter((img) => img !== data.img);
    });
    this.ws.onMessage("denied_image_received", (data: {
      nonce: string;
      img: string;
      mayNotify: boolean;
    }) => {
      this.favoriteSelection.items = this.favoriteSelection.items.filter((img) => img !== data.img);
      this.manualApproval.items = this.manualApproval.items.filter((img) => img !== data.img);
    });
    this.ws.onMessage("image_received", (data: {
      nonce: string;
      img: string;
      mayNotify: boolean;
    }) => {
      this.favoriteSelection.items = this.favoriteSelection.items.filter((img) => img !== data.img);
      this.manualApproval.items = this.manualApproval.items.filter((img) => img !== data.img);
      this.favoriteSelection.items.unshift(data.img);
      this.favoriteSelection.items = this.favoriteSelection.items.slice();
      this.manualApproval.items.push(data.img);
      this.manualApproval.items = this.manualApproval.items.slice();
      if (data.mayNotify && this.notificationSoundAudio) {
        this.notificationSoundAudio.play();
      }
    });
    this.ws.connect();
  },
  unmounted() {
    if (this.ws) {
      this.ws.disconnect();
    }
  },
  methods: {
    deleteImage(path: string) {
      this.sendMsg({ event: "delete_image", path });
    },
    approveImage(path: string) {
      this.sendMsg({ event: "approve_image", path });
    },
    denyImage(path: string) {
      this.sendMsg({ event: "deny_image", path });
    },
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
    moveFavoriteListUp(idx: number) {
      this.swapItems(idx - 1, idx);
    },
    moveFavoriteListDown(idx: number) {
      this.swapItems(idx + 1, idx);
    },
    swapItems(idx1: number, idx2: number) {
      arraySwap(this.settings.favoriteLists, idx1, idx2);
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
        this.settings.favoriteLists[index].list = this.settings.favoriteLists[index].list.filter((u: string) => u !== url);
      }
      else {
        this.settings.favoriteLists[index].list.push(url);
      }
    },
    customProfileImageChanged(file: MediaFile) {
      if (!this.settings) {
        console.warn("customProfileImageChanged: this.settings not initialized");
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
          displayDuration: parseInt(`${this.settings.displayDuration}`, 10) || 5000,
          displayLatestForever: this.settings.displayLatestForever,
          displayLatestAutomatically: this.settings.displayLatestAutomatically,
          autofillLatest: this.settings.autofillLatest,
          requireManualApproval: this.settings.requireManualApproval,
          notificationSound: this.settings.notificationSound,
          favoriteLists: this.settings.favoriteLists,
        },
      });
    },
    sendMsg(data: any) {
      if (!this.ws) {
        console.warn("sendMsg: this.ws not initialized");
        return;
      }
      this.ws.send(JSON.stringify(data));
    },
  }
});
</script>

<style lang="scss">
.square {
  display: inline-block;
  padding: 1px;
  border: solid 2px #ccc;
  cursor: pointer;
  line-height: 0;
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

.favorites-select {
  .favorites-select-image {
    position: relative;
    display: inline-block;

    .buttons {
      display: none;
    }
    &:hover {
      .buttons {
        display: block;
        position: absolute;
        top: 0;
        right: 0;
      }
    }
  }
}

.image-to-approve {
  display: inline-block;
}
</style>
