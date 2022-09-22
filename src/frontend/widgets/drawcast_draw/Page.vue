<template>
  <div id="drawcast">
    <div
      class="drawcast_body"
      :class="{ blurred: dialog }"
    >
      <div
        v-if="customDescription"
        class="streamer_info"
        :class="{ 'no-avatar': !customProfileImageUrl }"
      >
        <div
          v-if="customProfileImageUrl"
          class="streamer_avatar"
          :style="{ backgroundImage: `url(${customProfileImageUrl})` }"
        />
        <div class="streamer_message">
          <span class="streamer_message_inner">{{ customDescription }} </span>
        </div>
      </div>
      <div class="draw_panel">
        <div class="draw_panel_inner">
          <div class="draw_panel_top">
            <div class="draw_canvas_holder">
              <div
                class="draw_canvas_holder_inner"
                :class="canvasClasses"
                :style="canvasHolderStyle"
              >
                <canvas
                  ref="finalcanvas"
                  :width="canvasWidth"
                  :height="canvasHeight"
                  :style="styles"
                />
                <canvas
                  ref="draftcanvas"
                  :width="canvasWidth"
                  :height="canvasHeight"
                  :style="draftstyles"
                  @touchstart.prevent="touchstart"
                  @touchmove.prevent="touchmove"
                  @mousedown="mousedown"
                />
              </div>
            </div>
            <div class="v355_1274">
              <div class="card draw_tools_panel">
                <div class="draw_tools_tool_buttons">
                  <div
                    class="draw_tools_tool_button clickable tool-pen"
                    :class="{
                      'is-current': tool === 'pen',
                    }"
                    title="Pen"
                    @click="tool = 'pen'"
                  >
                    <icon-pen />
                  </div>
                  <div
                    class="draw_tools_tool_button clickable tool-eraser"
                    :class="{
                      'is-current': tool === 'eraser',
                    }"
                    title="Eraser"
                    @click="tool = 'eraser'"
                  >
                    <icon-eraser />
                  </div>
                  <div
                    class="draw_tools_tool_button clickable tool-eyedropper"
                    :class="{
                      'is-current': tool === 'color-sampler',
                    }"
                    title="Color Sampler"
                    @click="tool = 'color-sampler'"
                  >
                    <icon-eyedropper />
                  </div>
                  <div
                    class="draw_tools_tool_button clickable tool-undo"
                    title="Undo"
                    @click="undo"
                  >
                    <icon-undo />
                  </div>
                  <div
                    class="draw_tools_tool_button clickable tool-clear"
                    title="Clear the canvas"
                    @click="showClearDialog"
                  >
                    <icon-clear />
                  </div>
                </div>
                <div class="slider">
                  <div class="bubble bubble-left">
                    <div class="bubble-small bubble-dark" />
                  </div>
                  <div class="slider-input-holder">
                    <input
                      v-model="sizeIdx"
                      type="range"
                      min="0"
                      :max="sizes.length - 1"
                      step="1"
                    >
                  </div>
                  <div class="bubble bubble-right">
                    <div class="bubble-big bubble-dark" />
                  </div>
                </div>
                <div class="slider">
                  <div class="bubble bubble-left">
                    <div class="bubble-big bubble-light" />
                  </div>
                  <div class="slider-input-holder">
                    <input
                      v-model="transparencyIdx"
                      type="range"
                      min="0"
                      :max="transparencies.length - 1"
                      step="1"
                    >
                  </div>
                  <div class="bubble bubble-right">
                    <div class="bubble-big bubble-dark" />
                  </div>
                </div>

                <div class="visual_background">
                  <div class="visual_background_title">
                    Visual Background:
                  </div>
                  <div class="visual_background_colors">
                    <div
                      v-for="(bg, idx) of ['transparent-light', 'transparent-dark']"
                      :key="idx"
                      class="visual_background_button clickable"
                      :class="{ 'is-current': canvasBg === bg, [`bg-${bg}`]: true }"
                      @click="opt('canvasBg', bg)"
                    />
                  </div>
                </div>
              </div>
              <div class="hotkey-help">
                <div class="hotkey-help-title">
                  Hotkeys
                </div>
                <div
                  v-for="(item, idx) of hotkeys"
                  :key="idx"
                  class="hotkey-help-item"
                >
                  {{ item }}
                </div>
              </div>
            </div>
          </div>
          <div class="draw_panel_bottom">
            <div class="draw_colors">
              <div class="draw_colors_current">
                <label class="draw_colors_current_label clickable">
                  <input
                    v-model="color"
                    type="color"
                  >
                  <span
                    class="draw_colors_current_inner"
                    :class="{ active: tool === 'pen' }"
                    :style="currentColorStyle"
                  />
                  <div class="draw_colors_current_icon">
                    <icon-eyedropper />
                  </div>
                </label>
              </div>
              <div class="draw_colors_palette">
                <div
                  v-for="(c, idx) in palette"
                  :key="idx"
                  class="palette_color clickable"
                  :style="{ backgroundColor: c }"
                  @click="
                    color = c;
                    tool = 'pen';
                  "
                />
              </div>
            </div>
            <div />
            <div class="drawing_panel_bottom_right">
              <div
                v-if="sending.nonce"
                class="button button-primary send_button"
                @click="prepareSubmitImage"
              >
                <span class="send_button_text">⏳ Sending...</span>
              </div>
              <div
                v-else
                class="button button-primary send_button clickable"
                @click="prepareSubmitImage"
              >
                <icon-send />
                <span class="send_button_text">
                  {{ submitButtonText }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        v-for="(fav, idx) in favoriteListsFiltered"
        :key="idx"
        class="drawings-panel favorite-drawings-panel"
      >
        <div class="drawings_panel_title">
          <span class="drawings_panel_title_inner">{{
            fav.title || "Streamer's favorites:"
          }}</span>
        </div>
        <div
          v-if="nonfavorites.length"
          class="drawing_panel_drawings"
        >
          <img
            v-for="(tmpImg, idx2) in fav.list"
            :key="idx2"
            class="image favorite clickable"
            :src="tmpImg"
            height="190"
            @click="prepareModify(tmpImg)"
          >
        </div>
      </div>
      <div class="drawings-panel recent-drawings-panel">
        <div class="drawings_panel_title">
          <span class="drawings_panel_title_inner">{{
            recentImagesTitle
          }}</span>
        </div>
        <div class="drawing_panel_drawings">
          <img
            v-for="(tmpImg, idx) in nonfavorites"
            :key="idx"
            class="image clickable"
            :src="tmpImg"
            height="190"
            @click="prepareModify(tmpImg)"
          >
          <div class="dotdotdot" />
        </div>
      </div>
    </div>

    <div
      class="drawcast_footer"
      :class="{ blurred: dialog }"
    >
      <span class="drawcast_footer_left">Hyottoko.club | Developed by
        <a
          href="https://github.com/zutatensuppe"
          target="_blank"
        >para</a>. UI
        Design by
        <a
          href="https://www.artstation.com/lisadikaprio"
          target="_blank"
        >LisadiKaprio</a></span><span
        class="drawcast_footer_right"
      ><a
        href="https://github.com/zutatensuppe/robyottoko"
        target="_blank"
      >Source code
        on Github</a>
        |
        <a
          href="https://twitch.tv/nc_para_"
          target="_blank"
        >Developer’s Twitch channel</a>
        |
        <a
          href="https://jigsaw.hyottoko.club"
          target="_blank"
        >Jigsaw Puzzle Multiplayer</a></span>
    </div>

    <div
      v-if="dialog === 'success'"
      class="dialog success-dialog"
    >
      <div
        class="dialog-bg"
        @click="dialogClose"
      />
      <div class="dialog-container">
        <div class="dialog-image">
          <div
            class="responsive-image"
            :style="successImageUrlStyle"
          />
        </div>
        <div class="dialog-title">
          Success!
        </div>
        <div
          class="dialog-body"
          v-html="dialogBody"
        />
        <div class="dialog-footer">
          <div
            class="button button-ok clickable"
            @click="dialogClose"
          >
            Draw another one
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="dialog === 'replace'"
      class="dialog confirm-dialog"
    >
      <div
        class="dialog-bg"
        @click="dialogClose"
      />
      <div class="dialog-container">
        <div
          class="dialog-body"
          v-html="dialogBody"
        />
        <div class="dialog-footer">
          <div
            class="button button-no-button clickable"
            @click="dialogClose"
          >
            Cancel
          </div>
          <div
            class="button button-danger clickable"
            @click="dialogConfirm"
          >
            Replace image
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="dialog === 'confirm-submit'"
      class="dialog confirm-dialog"
    >
      <div
        class="dialog-bg"
        @click="dialogClose"
      />
      <div class="dialog-container">
        <div
          class="dialog-body"
          v-html="dialogBody"
        />
        <div class="dialog-footer">
          <div
            class="button button-no-button clickable"
            @click="dialogClose"
          >
            Cancel
          </div>
          <div
            class="button button-ok clickable"
            @click="dialogConfirm"
          >
            Send
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="dialog === 'clear'"
      class="dialog clear-dialog"
    >
      <div
        class="dialog-bg"
        @click="dialogClose"
      />
      <div class="dialog-container">
        <div class="dialog-image">
          <div
            class="responsive-image"
            :style="clearImageUrlStyle"
          />
        </div>
        <div
          class="dialog-body"
          v-html="dialogBody"
        />
        <div class="dialog-footer">
          <div
            class="button button-no-button clickable"
            @click="dialogClose"
          >
            Cancel
          </div>
          <div
            class="button button-danger clickable"
            @click="dialogConfirm"
          >
            Clear
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, PropType } from "vue";
import { nonce, logger, pad } from "../../../common/fn";
import WsClient from "../../WsClient";
import { DrawcastFavoriteList } from "../../../types";
import util, { WidgetApiData } from "../util";
import { DrawcastModuleWsDataData } from "../../../mod/modules/DrawcastModuleCommon";
import IconPen from './components/IconPen.vue'
import IconEyedropper from './components/IconEyedropper.vue'
import IconSend from './components/IconSend.vue'
import IconUndo from './components/IconUndo.vue'
import IconEraser from './components/IconEraser.vue'
import IconClear from './components/IconClear.vue'

const log = logger("Page.vue");

interface Point {
  x: number
  y: number
}

const touchPoint = (canvas: HTMLCanvasElement, evt: TouchEvent) => {
  const bcr = canvas.getBoundingClientRect();
  return {
    x: evt.targetTouches[0].clientX - bcr.x,
    y: evt.targetTouches[0].clientY - bcr.y,
  };
};

const mousePoint = (canvas: HTMLCanvasElement, evt: MouseEvent) => {
  const bcr = canvas.getBoundingClientRect();
  return { x: evt.clientX - bcr.x, y: evt.clientY - bcr.y };
};

const hexIsLight = (color: string) => {
  const hex = color.replace("#", "");
  const c_r = parseInt(hex.substr(0, 2), 16);
  const c_g = parseInt(hex.substr(2, 2), 16);
  const c_b = parseInt(hex.substr(4, 2), 16);
  const brightness = (c_r * 299 + c_g * 587 + c_b * 114) / 1000;
  return brightness > 69;
};

const createCursor = (tool: string, size: number, color: string): string => {
  if (tool === "color-sampler") {
    return "crosshair";
  }

  const c = document.createElement("canvas");
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  const crosshairSize = 10
  const padding = 3
  const canvasSize = size + crosshairSize + padding + crosshairSize + padding
  const halfCanvasSize = Math.round(canvasSize / 2)

  c.width = canvasSize + 1;
  c.height = canvasSize + 1;

  // crosshair around the color dot
  ctx.fillStyle = "#AAA";
  ctx.fillRect(0, halfCanvasSize - 1, crosshairSize, 3)
  ctx.fillRect(c.width - crosshairSize, halfCanvasSize - 1, crosshairSize, 3)
  ctx.fillRect(halfCanvasSize - 1, 0, 3, crosshairSize)
  ctx.fillRect(halfCanvasSize - 1, c.height - crosshairSize, 3, crosshairSize)
  ctx.fillStyle = "#666";
  ctx.fillRect(1, halfCanvasSize, crosshairSize - 2, 1)
  ctx.fillRect(c.width - crosshairSize + 1, halfCanvasSize, crosshairSize - 2, 1)
  ctx.fillRect(halfCanvasSize, 1, 1, crosshairSize - 2)
  ctx.fillRect(halfCanvasSize, c.height - crosshairSize + 1, 1, crosshairSize - 2)

  ctx.beginPath();
  ctx.translate(0.5, 0.5);
  ctx.fillStyle = color;
  ctx.strokeStyle = hexIsLight(String(ctx.fillStyle)) ? "#000" : "#fff";
  ctx.arc(halfCanvasSize, halfCanvasSize, size / 2, 0, 2 * Math.PI);
  ctx.translate(-0.5, -0.5);
  ctx.closePath();
  if (tool !== "eraser") {
    ctx.fill();
  }
  ctx.stroke();
  return `url(${c.toDataURL()}) ${halfCanvasSize} ${halfCanvasSize}, default`;
}

const fillpath = (
  ctx: CanvasRenderingContext2D,
  pts: Point[],
  color: string,
  size: number,
) => {
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.translate(0.5, 0.5);
    ctx.fillStyle = color;
    ctx.arc(pts[0].x, pts[0].y, size / 2, 0, 2 * Math.PI);
    ctx.translate(-0.5, -0.5);
    ctx.closePath();
    ctx.fill();
    return;
  }

  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.translate(0.5, 0.5);
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.translate(-0.5, -0.5);
  ctx.closePath();
  ctx.stroke();
};

export default defineComponent({
  components: {
    IconPen,
    IconEyedropper,
    IconSend,
    IconUndo,
    IconEraser,
    IconClear,
  },
  props: {
    wdata: { type: Object as PropType<WidgetApiData>, required: true }
  },
  data() {
    return {
      ws: null as WsClient | null,
      opts: {} as Record<string, string>,
      palette: ["#000000"],

      images: [] as string[],
      favoriteLists: [] as DrawcastFavoriteList[],

      color: "#000000",
      sampleColor: "",

      hotkeys: ['E Eraser', 'B Pencil', 'S Color sampler', '1-7 Adjust size', 'Ctrl+Z Undo'],

      tool: "pen", // 'pen'|'eraser'|'color-sampler'
      sizes: [1, 2, 5, 10, 30, 60, 100],
      sizeIdx: 2,
      transparencies: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
      transparencyIdx: 9,
      ctx: {} as CanvasRenderingContext2D,
      finalctx: {} as CanvasRenderingContext2D,

      last: null as Point | null,

      canvasWidth: 720,
      canvasHeight: 405,
      submitButtonText: "Submit",
      submitConfirm: "",
      customDescription: "",
      customProfileImageUrl: "",
      recentImagesTitle: "",

      stack: [] as ImageData[],
      drawing: false,

      dialog: "",
      dialogBody: "",
      modifyImageUrl: "",
      successImageUrlStyle: {},
      clearImageUrlStyle: {},

      sending: {
        date: null as null | Date,
        nonce: "",
      },
    };
  },
  computed: {
    finalcanvas(): HTMLCanvasElement {
      return this.$refs.finalcanvas as HTMLCanvasElement;
    },
    draftcanvas(): HTMLCanvasElement {
      return this.$refs.draftcanvas as HTMLCanvasElement;
    },
    favoriteListsFiltered(): DrawcastFavoriteList[] {
      return this.favoriteLists.filter(
        (fav: DrawcastFavoriteList) => fav.list.length > 0
      );
    },
    favorites(): string[] {
      const favorites: string[] = [];
      for (const fav of this.favoriteLists) {
        favorites.push(...fav.list);
      }
      return favorites;
    },
    currentColorStyle(): { backgroundColor: string } {
      return {
        backgroundColor:
          this.tool === "color-sampler" ? this.sampleColor : this.color,
      };
    },
    canvasHolderStyle(): { width: string, height: string } {
      return {
        width: `${this.canvasWidth + 4}px`,
        height: `${this.canvasHeight + 4}px`,
      }
    },
    size(): number {
      return this.sizes[this.sizeIdx];
    },
    transparency(): number {
      return this.transparencies[this.transparencyIdx];
    },
    nonfavorites(): string[] {
      return this.images.filter((url: string) => !this.favorites.includes(url));
    },
    canvasBg(): string {
      return ["transparent-light", "transparent-dark"].includes(this.opts.canvasBg)
        ? this.opts.canvasBg
        : "transparent-light";
    },
    canvasClasses(): string[] {
      return [`bg-${this.canvasBg}`];
    },
    draftstyles(): {
      cursor: string,
      opacity: string,
    } {
      return {
        cursor: this.cursor,
        opacity: `${this.transparency / 100}`,
      };
    },
    styles(): { cursor: string } {
      return {
        cursor: this.cursor,
      };
    },
    cursor(): string {
      return createCursor(this.tool, this.size, this.color)
    },
  },
  created() {
    // @ts-ignore
    import("./main.scss");
  },
  mounted() {
    this.ctx = this.draftcanvas.getContext("2d") as CanvasRenderingContext2D;
    this.finalctx = this.finalcanvas.getContext(
      "2d"
    ) as CanvasRenderingContext2D;

    this.ws = util.wsClient(this.wdata);

    const opts = window.localStorage.getItem("drawcastOpts");
    this.opts = opts ? JSON.parse(opts) : { canvasBg: "transparent" };

    this.ws.onMessage("init", (data: DrawcastModuleWsDataData) => {
      console.log('inited', data)
      // submit button may not be empty
      this.submitButtonText = data.settings.submitButtonText || "Send";
      this.submitConfirm = data.settings.submitConfirm;
      this.canvasWidth = data.settings.canvasWidth;
      this.canvasHeight = data.settings.canvasHeight;
      this.customDescription = data.settings.customDescription || "";
      this.customProfileImageUrl =
        data.settings.customProfileImage &&
          data.settings.customProfileImage.urlpath
          ? data.settings.customProfileImage.urlpath
          : "";
      this.recentImagesTitle =
        data.settings.recentImagesTitle || "Newest submitted:";
      this.palette = data.settings.palette || this.palette;
      this.favoriteLists = data.settings.favoriteLists;
      this.color = this.palette[0];
      this.images = data.images.map((image) => image.path);

      if (
        this.images.length > 0
        && data.settings.autofillLatest
        && this.stack.length === 0
        && !this.drawing
      ) {
        this.modify(this.images[0]);
      }

      // test data
      // this.submitButtonText = "Send this image to the striiim";
      // this.customProfileImageUrl =
      //   "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_783ce3fc0013443695c62933da3669c5/default/dark/3.0";
      // this.customDescription = `💙👀 Please draw something cute. This will appear on my stream
      //           screen!~ Click any of the drawings in the gallery to continue
      //           drawing on them!`;
    });
    this.ws.onMessage(
      "image_received",
      (data: { nonce: string; img: string }) => {
        if (
          this.sending.date &&
          this.sending.nonce &&
          data.nonce === this.sending.nonce
        ) {
          // we want to have the 'sending' state for at least minMs ms
          // for images that we have just sent, for other images they may
          // be added immediately
          const minMs = 500;
          const now = new Date();
          const timeoutMs = this.sending.date.getTime() + minMs - now.getTime();
          setTimeout(() => {
            this.successImageUrlStyle = {
              backgroundImage: `url(${data.img})`,
            };
            this.dialog = "success";
            this.dialogBody = "Your drawing was sent and is pending approval.";
            this.sending.nonce = "";
            this.sending.date = null;
          }, Math.max(0, timeoutMs));
        }
      }
    );
    this.ws.onMessage(
      "approved_image_received",
      (data: { nonce: string; img: string }) => {
        if (
          this.sending.date &&
          this.sending.nonce &&
          data.nonce === this.sending.nonce
        ) {
          // we want to have the 'sending' state for at least minMs ms
          // for images that we have just sent, for other images they may
          // be added immediately
          const minMs = 500;
          const now = new Date();
          const timeoutMs = this.sending.date.getTime() + minMs - now.getTime();
          setTimeout(() => {
            this.successImageUrlStyle = {
              backgroundImage: `url(${data.img})`,
            };
            this.dialog = "success";
            this.dialogBody = "Your drawing was sent to the stream.";
            this.sending.nonce = "";
            this.sending.date = null;

            this.images.unshift(data.img);
            this.images = this.images.slice(0, 20);
          }, Math.max(0, timeoutMs));
        } else {
          this.images.unshift(data.img);
          this.images = this.images.slice(0, 20);
        }
      }
    );

    this.ws.connect();

    window.addEventListener("mousemove", this.mousemove);
    window.addEventListener("mouseup", this.cancelDraw);
    window.addEventListener("touchend", this.cancelDraw);
    window.addEventListener("touchcancel", this.cancelDraw);
    window.addEventListener("keyup", this.keyup);

    this.$watch("color", () => {
      this.tool = "pen";
    });
  },
  unmounted() {
    if (this.ws) {
      this.ws.disconnect()
    }
    window.removeEventListener("mousemove", this.mousemove);
    window.removeEventListener("mouseup", this.cancelDraw);
    window.removeEventListener("touchend", this.cancelDraw);
    window.removeEventListener("touchcancel", this.cancelDraw);
    window.removeEventListener("keyup", this.keyup);
  },
  methods: {
    opt(option: string, value: string) {
      this.opts[option] = value;
      window.localStorage.setItem("drawcastOpts", JSON.stringify(this.opts));
    },
    async modify(imageUrl: string) {
      const image = new Image();
      return new Promise<void>((resolve) => {
        image.src = imageUrl;
        image.onload = () => {
          this.img(image);
          this.stack = [];
          this.drawing = false;
          this.stack.push(this.getImageData());
          resolve()
        };
      });
    },
    undo() {
      this.stack.pop();
      this.clear();
      this.drawing = false;
      if (this.stack.length > 0) {
        this.putImageData(this.stack[this.stack.length - 1]);
      }
    },
    getImageData(): ImageData {
      return this.finalctx.getImageData(
        0,
        0,
        this.finalcanvas.width,
        this.finalcanvas.height
      );
    },
    putImageData(imageData: ImageData) {
      this.finalctx.putImageData(imageData, 0, 0);
    },
    img(imageObject: CanvasImageSource) {
      this.clear();
      const tmp = this.finalctx.globalCompositeOperation;
      this.finalctx.globalCompositeOperation = "source-over";
      this.finalctx.drawImage(imageObject, 0, 0);
      this.finalctx.globalCompositeOperation = tmp;
    },
    drawPathPart(pts: Point[]) {
      this.drawing = true;
      if (pts.length === 0) {
        return;
      }

      if (this.tool === "eraser") {
        this.finalctx.globalCompositeOperation = "destination-out";
        fillpath(this.finalctx, pts, this.color, this.size);
        return;
      }

      this.finalctx.globalCompositeOperation = "source-over";
      fillpath(this.ctx, pts, this.color, this.size);
    },

    cancelDraw() {
      if (!this.drawing) {
        return;
      }

      if (this.tool !== "eraser") {
        this.finalctx.globalAlpha = this.transparency / 100;
        this.finalctx.drawImage(this.draftcanvas, 0, 0);
        this.finalctx.globalAlpha = 1;

        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
      }

      this.stack.push(this.getImageData());
      this.drawing = false;
      this.last = null;
    },

    startDraw(pt: Point) {
      if (this.tool === "color-sampler") {
        if (
          pt.x >= 0 &&
          pt.y >= 0 &&
          pt.x < this.canvasWidth &&
          pt.y < this.canvasHeight
        ) {
          this.color = this.getColor(pt);
        }
        return;
      }

      if (
        pt.x >= -this.size &&
        pt.y >= -this.size &&
        pt.x < this.canvasWidth + this.size &&
        pt.y < this.canvasHeight + this.size
      ) {
        const cur = pt;
        this.drawPathPart([cur]);
        this.last = cur;
      }
    },

    continueDraw(pt: Point) {
      if (this.tool === "color-sampler") {
        this.sampleColor = this.getColor(pt);
      }
      if (!this.last) {
        return;
      }
      const cur = pt;
      this.drawPathPart([this.last, cur]);
      this.last = cur;
    },

    touchstart(e: TouchEvent) {
      e.preventDefault();
      this.startDraw(touchPoint(this.draftcanvas, e));
    },
    mousedown(e: MouseEvent) {
      this.startDraw(mousePoint(this.draftcanvas, e));
    },

    touchmove(e: TouchEvent) {
      e.preventDefault();
      this.continueDraw(touchPoint(this.draftcanvas, e));
    },
    mousemove(e: MouseEvent) {
      this.continueDraw(mousePoint(this.draftcanvas, e));
    },

    clear() {
      this.ctx.clearRect(0, 0, this.draftcanvas.width, this.draftcanvas.height);
      this.finalctx.clearRect(
        0,
        0,
        this.finalcanvas.width,
        this.finalcanvas.height
      );
    },
    clearClick() {
      this.clear();
      this.stack = [];
      this.drawing = false;
    },
    prepareSubmitImage() {
      if (this.submitConfirm) {
        this.dialog = "confirm-submit";
        this.dialogBody = this.submitConfirm;
        return;
      }
      this.submitImage();
    },
    submitImage() {
      if (!this.ws) {
        log.error("submitImage: this.ws not set");
        return;
      }

      if (this.sending.nonce) {
        // we are already sending something
        log.error("submitImage: nonce not empty");
        return;
      }

      this.sending.date = new Date();
      this.sending.nonce = nonce(10);
      this.ws.send(
        JSON.stringify({
          event: "post",
          data: {
            nonce: this.sending.nonce,
            img: this.finalcanvas.toDataURL(),
          },
        })
      );
      // success will be handled in onMessage('post') below
    },
    showClearDialog() {
      const w = 100;
      const h = Math.round((w * this.canvasHeight) / this.canvasWidth);

      this.clearImageUrlStyle = {
        backgroundImage: `url(${this.finalcanvas.toDataURL()})`,
        width: w + "px",
        height: h + "px",
      };
      this.dialog = "clear";
      this.dialogBody = `
        If you click this, your current drawing will be erased. <br />
        <br />
        Do you want to proceed?`;
    },
    prepareModify(imageUrl: string) {
      this.modifyImageUrl = imageUrl;
      this.dialog = "replace";
      this.dialogBody = `
        If you click this, your current drawing will be erased and replaced by
        the drawing you just clicked on. <br />
        <br />
        Do you want to proceed?`;
    },
    dialogClose() {
      this.dialog = "";
      this.dialogBody = "";
    },
    dialogConfirm() {
      if (this.dialog === "confirm-submit") {
        this.dialog = "";
        this.submitImage();
      } else if (this.dialog === "clear") {
        this.dialog = "";
        this.clearClick();
      } else if (this.dialog === "replace") {
        this.dialog = "";
        this.modify(this.modifyImageUrl);
      }
    },
    getColor(pt: Point) {
      const [r, g, b, a] = this.finalctx.getImageData(pt.x, pt.y, 1, 1).data;
      const hex = (v: number) => pad(v.toString(16), "00");
      // when selecting transparent color, instead use first color in palette
      return a ? `#${hex(r)}${hex(g)}${hex(b)}` : this.palette[0];
    },
    keyup(e: KeyboardEvent) {
      if (e.code === "Digit1") {
        this.sizeIdx = 0;
      } else if (e.code === "Digit2") {
        this.sizeIdx = 1;
      } else if (e.code === "Digit3") {
        this.sizeIdx = 2;
      } else if (e.code === "Digit4") {
        this.sizeIdx = 3;
      } else if (e.code === "Digit5") {
        this.sizeIdx = 4;
      } else if (e.code === "Digit6") {
        this.sizeIdx = 5;
      } else if (e.code === "Digit7") {
        this.sizeIdx = 6;
      } else if (e.code === "KeyB") {
        // pencil
        this.tool = "pen";
      } else if (e.code === "KeyS") {
        // color Sampler
        this.tool = "color-sampler";
      } else if (e.code === "KeyE") {
        // eraser
        this.tool = "eraser";
      } else if (e.code === "KeyZ" && e.ctrlKey) {
        this.undo();
      }
    },
  },
});
</script>
