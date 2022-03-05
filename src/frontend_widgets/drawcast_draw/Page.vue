<template>
  <div id="drawcast">
    <div class="drawcast_body" :class="{ blurred: dialog }">
      <div
        class="streamer_info"
        v-if="customDescription"
        :class="{ 'no-avatar': !customProfileImageUrl }"
      >
        <div
          class="streamer_avatar"
          v-if="customProfileImageUrl"
          :style="{ backgroundImage: `url(${customProfileImageUrl})` }"
        ></div>
        <div class="streamer_message">
          <span class="streamer_message_inner">{{ customDescription }} </span>
        </div>
      </div>
      <div class="draw_panel">
        <div class="draw_panel_inner">
          <div class="draw_panel_top">
            <div class="draw_canvas_holder">
              <div class="draw_canvas_holder_inner" :class="canvasClasses">
                <canvas
                  ref="canvas"
                  :width="canvasWidth"
                  :height="canvasHeight"
                  @touchstart.prevent="touchstart"
                  @touchmove.prevent="touchmove"
                  @mousemove="mousemove"
                  @mousedown="mousedown"
                  @mouseup="cancelDraw"
                  @touchend.prevent="cancelDraw"
                  @touchcancel.prevent="cancelDraw"
                  :style="styles"
                ></canvas>
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
                <div class="size_slider">
                  <div class="v355_1289">
                    <div class="v355_1290"></div>
                  </div>
                  <div class="v355_1291">
                    <input
                      v-model="sizeIdx"
                      type="range"
                      min="0"
                      :max="sizes.length - 1"
                      step="1"
                    />
                  </div>
                  <div class="v355_1294">
                    <div class="v355_1295"></div>
                  </div>
                </div>

                <div class="visual_background">
                  <div class="visual_background_title">Visual Background:</div>
                  <div class="visual_background_colors">
                    <div
                      @click="opt('canvasBg', 'transparent')"
                      class="visual_background_button bg-transparent clickable"
                      :class="{
                        'is-current':
                          canvasBg !== 'white' && canvasBg !== 'black',
                      }"
                    ></div>
                    <div
                      @click="opt('canvasBg', 'white')"
                      class="visual_background_button bg-white clickable"
                      :class="{
                        'is-current': canvasBg === 'white',
                      }"
                    ></div>
                    <div
                      @click="opt('canvasBg', 'black')"
                      class="visual_background_button bg-black clickable"
                      :class="{
                        'is-current': canvasBg === 'black',
                      }"
                    ></div>
                  </div>
                </div>
              </div>
              <div class="hotkey-help">
                <div class="hotkey-help-title">Hotkeys</div>
                <div class="hotkey-help-item">E Eraser</div>
                <div class="hotkey-help-item">B Pencil</div>
                <div class="hotkey-help-item">S Color sampler</div>
                <div class="hotkey-help-item">1-7 Adjust size</div>
                <div class="hotkey-help-item">Ctrl+Z Undo</div>
              </div>
            </div>
          </div>
          <div class="draw_panel_bottom">
            <div class="draw_colors">
              <div class="draw_colors_current">
                <label class="draw_colors_current_label clickable">
                  <input type="color" v-model="color" />
                  <span
                    class="draw_colors_current_inner"
                    :class="{ active: tool === 'pen' }"
                    :style="currentColorStyle"
                  >
                  </span>
                  <div class="draw_colors_current_icon">
                    <icon-eyedropper />
                  </div>
                </label>
              </div>
              <div class="draw_colors_palette">
                <div
                  class="palette_color clickable"
                  v-for="(c, idx) in palette"
                  :style="{ backgroundColor: c }"
                  :key="idx"
                  @click="
                    color = c;
                    tool = 'pen';
                  "
                ></div>
              </div>
            </div>
            <div></div>
            <div class="drawing_panel_bottom_right">
              <div
                class="button button-primary send_button clickable"
                @click="prepareSubmitImage"
              >
                <icon-send />
                <span class="send_button_text">{{ submitButtonText }}</span>
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
        <div class="drawing_panel_drawings" v-if="nonfavorites.length">
          <img
            class="image favorite clickable"
            v-for="(img, idx) in fav.list"
            :key="idx"
            @click="prepareModify(img)"
            :src="img"
            height="190"
          />
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
            class="image clickable"
            v-for="(img, idx) in nonfavorites"
            :key="idx"
            @click="prepareModify(img)"
            :src="img"
            height="190"
          />
          <div class="dotdotdot"></div>
        </div>
      </div>
    </div>

    <div class="drawcast_footer" :class="{ blurred: dialog }">
      <span class="drawcast_footer_left"
        >Hyottoko.club | Developed by
        <a href="https://github.com/zutatensuppe" target="_blank">para</a>. UI
        Design by
        <a href="https://www.artstation.com/lisadikaprio" target="_blank"
          >LisadiKaprio</a
        ></span
      ><span class="drawcast_footer_right"
        ><a href="https://github.com/zutatensuppe/robyottoko" target="_blank"
          >Source code on Github</a
        >
        |
        <a href="https://twitch.tv/nc_para_" target="_blank"
          >Developer’s Twitch channel</a
        >
        |
        <a href="https://jigsaw.hyottoko.club" target="_blank"
          >Jigsaw Puzzle Multiplayer</a
        ></span
      >
    </div>

    <div class="dialog success-dialog" v-if="dialog === 'success'">
      <div class="dialog-bg" @click="dialogClose"></div>
      <div class="dialog-container">
        <div class="dialog-image">
          <div class="responsive-image" :style="successImageUrlStyle"></div>
        </div>
        <div class="dialog-title">Success!</div>
        <div class="dialog-body">Your drawing was sent to the stream.</div>
        <div class="dialog-footer">
          <div class="button button-ok clickable" @click="dialogClose">
            Draw another one
          </div>
        </div>
      </div>
    </div>
    <div class="dialog confirm-dialog" v-if="dialog === 'replace'">
      <div class="dialog-bg" @click="dialogClose"></div>
      <div class="dialog-container">
        <div class="dialog-body">
          If you click this, your current drawing will be erased and replaced by
          the drawing you just clicked on. <br />
          <br />
          Do you want to proceed?
        </div>
        <div class="dialog-footer">
          <div class="button button-no-button clickable" @click="dialogClose">
            Cancel
          </div>
          <div class="button button-danger clickable" @click="dialogConfirm">
            Replace image
          </div>
        </div>
      </div>
    </div>
    <div class="dialog confirm-dialog" v-if="dialog === 'confirm-submit'">
      <div class="dialog-bg" @click="dialogClose"></div>
      <div class="dialog-container">
        <div class="dialog-body">
          {{ submitConfirm }}
        </div>
        <div class="dialog-footer">
          <div class="button button-no-button clickable" @click="dialogClose">
            Cancel
          </div>
          <div class="button button-ok clickable" @click="dialogConfirm">
            Send
          </div>
        </div>
      </div>
    </div>
    <div class="dialog clear-dialog" v-if="dialog === 'clear'">
      <div class="dialog-bg" @click="dialogClose"></div>
      <div class="dialog-container">
        <div class="dialog-image">
          <div class="responsive-image" :style="clearImageUrlStyle"></div>
        </div>
        <div class="dialog-body">
          If you click this, your current drawing will be erased. <br />
          <br />
          Do you want to proceed?
        </div>
        <div class="dialog-footer">
          <div class="button button-no-button clickable" @click="dialogClose">
            Cancel
          </div>
          <div class="button button-danger clickable" @click="dialogConfirm">
            Clear
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { logger } from "../../common/fn";
import WsClient from "../../frontend/WsClient";
import { DrawcastFavoriteList } from "../../types";
import util from "../util";

const log = logger("Page.vue");

const translateCoords = (
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number
) => {
  // dimensions of canvas element (top-left with respect to border-box)
  const bcr = canvas.getBoundingClientRect();
  // offsets from border and padding
  const sideWidth = { left: 0, top: 0, right: 0, bottom: 0 };
  // ratio of internal canvas resolution to canvas displayed dimensions
  const scaleX =
    canvas.width / (bcr.width - (sideWidth.left + sideWidth.right));
  const scaleY =
    canvas.height / (bcr.height - (sideWidth.top + sideWidth.bottom));
  // translate and scale screen coords to canvas internal coords
  const x = clientX * scaleX;
  const y = clientY * scaleY;
  return { x, y };
};

const touchPoint = (evt: TouchEvent) => {
  const canvas = evt.target as HTMLCanvasElement;
  const bcr = canvas.getBoundingClientRect();
  const coords = translateCoords(
    canvas,
    evt.targetTouches[0].clientX - bcr.x,
    evt.targetTouches[0].clientY - bcr.y
  );
  return coords;
};
const mousePoint = (evt: MouseEvent) => {
  const canvas = evt.target as HTMLCanvasElement;
  const coords = translateCoords(canvas, evt.offsetX, evt.offsetY);
  return coords;
};

const hexIsLight = (color: string) => {
  const hex = color.replace("#", "");
  const c_r = parseInt(hex.substr(0, 2), 16);
  const c_g = parseInt(hex.substr(2, 2), 16);
  const c_b = parseInt(hex.substr(4, 2), 16);
  const brightness = (c_r * 299 + c_g * 587 + c_b * 114) / 1000;
  return brightness > 69;
};

export default defineComponent({
  data() {
    return {
      ws: null as WsClient | null,
      opts: {},
      palette: ["#000000"],

      images: [],
      favoriteLists: [] as DrawcastFavoriteList[],

      color: "#000000",
      sampleColor: "",

      tool: "pen", // 'pen'|'eraser'|'color-sampler'
      sizes: [1, 2, 5, 10, 30, 60, 100],
      sizeIdx: 2,
      canvas: null as HTMLCanvasElement | null,
      ctx: null as CanvasRenderingContext2D | null,

      last: null,

      canvasWidth: 720,
      canvasHeight: 405,
      submitButtonText: "Submit",
      submitConfirm: "",
      customDescription: "",
      customProfileImageUrl: "",
      recentImagesTitle: "",

      stack: [] as ImageData[],
      currentPath: [],

      dialog: "",
      modifyImageUrl: "",
      successImageUrlStyle: null,
      clearImageUrlStyle: null,
    };
  },
  computed: {
    favoriteListsFiltered() {
      return this.favoriteLists.filter(
        (fav: DrawcastFavoriteList) => fav.list.length > 0
      );
    },
    favorites() {
      const favorites = [];
      for (const fav of this.favoriteLists) {
        favorites.push(...fav.list);
      }
      return favorites;
    },
    currentColorStyle() {
      return {
        backgroundColor:
          this.tool === "color-sampler" ? this.sampleColor : this.color,
      };
    },
    size() {
      return this.sizes[this.sizeIdx];
    },
    nonfavorites() {
      return this.images.filter((url) => !this.favorites.includes(url));
    },
    canvasBg() {
      return ["transparent", "white", "black"].includes(this.opts.canvasBg)
        ? this.opts.canvasBg
        : "transparent";
    },
    canvasClasses() {
      return [`bg-${this.canvasBg}`];
    },
    halfSize() {
      return Math.round(this.size / 2);
    },
    styles() {
      return {
        cursor: this.cursor,
      };
    },
    cursor() {
      const c = document.createElement("canvas");
      const ctx = c.getContext("2d") as CanvasRenderingContext2D;
      if (this.tool === "color-sampler") {
        return "crosshair";
      }

      c.width = parseInt(this.size, 10) + 1;
      c.height = parseInt(this.size, 10) + 1;
      ctx.beginPath();
      if (this.tool === "eraser") {
        ctx.fillStyle = "#fff";
      } else {
        ctx.fillStyle = this.color;
      }
      ctx.strokeStyle = hexIsLight(ctx.fillStyle) ? "#000" : "#fff";

      ctx.arc(this.halfSize, this.halfSize, this.halfSize, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return `url(${c.toDataURL()}) ${this.halfSize} ${this.halfSize}, default`;
    },
  },
  methods: {
    opt(option: string, value: string) {
      this.opts[option] = value;
      window.localStorage.setItem("drawcastOpts", JSON.stringify(this.opts));
    },
    async modify(imageUrl: string) {
      const image = new Image();
      return new Promise(async (resolve) => {
        image.src = imageUrl;
        image.onload = async (ev) => {
          this.img(image);
          this.stack = [];
          this.currentPath = [];
          this.stack.push(this.getImageData());
        };
      });
    },
    async undo() {
      this.stack.pop();
      this.clear();
      this.currentPath = [];
      if (this.stack.length > 0) {
        this.putImageData(this.stack[this.stack.length - 1]);
      }
    },
    getImageData(): ImageData {
      if (!this.ctx) {
        throw new Error("getImageData: this.ctx not set");
      }
      if (!this.canvas) {
        throw new Error("getImageData: this.canvas not set");
      }
      return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    },
    putImageData(imageData: ImageData) {
      if (!this.ctx) {
        log.error("putImageData: this.ctx not set");
        return;
      }
      this.ctx.putImageData(imageData, 0, 0);
    },
    img(imageObject) {
      if (!this.ctx) {
        log.error("img: this.ctx not set");
        return;
      }
      this.clear();
      const tmp = this.ctx.globalCompositeOperation;
      this.ctx.globalCompositeOperation = "source-over";
      this.ctx.drawImage(imageObject, 0, 0);
      this.ctx.globalCompositeOperation = tmp;
    },
    drawPathPart(obj) {
      if (!this.ctx) {
        log.error("drawPathPart: this.ctx not set");
        return;
      }
      this.currentPath.push(obj);
      const { pts, color, tool, size, halfSize } = obj;
      if (pts.length === 0) {
        return;
      }

      if (tool === "eraser") {
        this.ctx.globalCompositeOperation = "destination-out";
      } else {
        this.ctx.globalCompositeOperation = "source-over";
      }

      if (pts.length === 1) {
        this.ctx.beginPath();
        this.ctx.fillStyle = color;
        this.ctx.arc(pts[0].x, pts[0].y, halfSize, 0, 2 * Math.PI);
        this.ctx.closePath();
        this.ctx.fill();
        return;
      }

      this.ctx.lineJoin = "round";
      this.ctx.beginPath();
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = size;
      this.ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        this.ctx.lineTo(pts[i].x, pts[i].y);
      }
      this.ctx.closePath();
      this.ctx.stroke();
    },
    redraw(...pts) {
      this.drawPathPart({
        pts,
        tool: this.tool,
        color: this.color,
        size: this.size,
        halfSize: this.halfSize,
      });
    },

    cancelDraw(e) {
      this.stack.push(this.getImageData());
      this.currentPath = [];
      this.last = null;
    },

    startDraw(pt) {
      if (this.tool === "color-sampler") {
        this.color = this.getColor(pt);
        return;
      }
      const cur = pt;
      this.redraw(cur);
      this.last = cur;
    },

    continueDraw(pt) {
      if (this.tool === "color-sampler") {
        this.sampleColor = this.getColor(pt);
      }
      if (!this.last) {
        return;
      }
      const cur = pt;
      this.redraw(this.last, cur);
      this.last = cur;
    },

    touchstart(e) {
      e.preventDefault();
      this.startDraw(touchPoint(e));
    },
    mousedown(e) {
      this.startDraw(mousePoint(e));
    },

    touchmove(e) {
      e.preventDefault();
      this.continueDraw(touchPoint(e));
    },
    mousemove(e) {
      this.continueDraw(mousePoint(e));
    },

    clear() {
      if (!this.ctx) {
        log.error("clear: this.ctx not set");
        return;
      }
      if (!this.canvas) {
        log.error("clear: this.canvas not set");
        return;
      }
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    },
    clearClick() {
      this.clear();
      this.stack = [];
      this.currentPath = [];
    },
    prepareSubmitImage() {
      if (this.submitConfirm) {
        this.dialog = "confirm-submit";
        return;
      }
      this.submitImage();
    },
    submitImage() {
      if (!this.canvas) {
        log.error("submitImage: this.canvas not set");
        return;
      }
      if (!this.ws) {
        log.error("submitImage: this.ws not set");
        return;
      }
      this.ws.send(
        JSON.stringify({
          event: "post",
          data: {
            img: this.canvas.toDataURL(),
          },
        })
      );

      this.successImageUrlStyle = {
        backgroundImage: `url(${this.canvas.toDataURL()})`,
      };
      this.dialog = "success";
    },
    showClearDialog() {
      const w = 100;
      const h = Math.round((w * this.canvasHeight) / this.canvasWidth);

      this.clearImageUrlStyle = {
        backgroundImage: `url(${this.canvas.toDataURL()})`,
        width: w + "px",
        height: h + "px",
      };
      this.dialog = "clear";
    },
    prepareModify(imageUrl: string) {
      this.modifyImageUrl = imageUrl;
      this.dialog = "replace";
    },
    dialogClose() {
      this.dialog = "";
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
    getColor(pt) {
      if (!this.ctx) {
        log.error("getColor: this.ctx not set");
        return "";
      }
      const [r, g, b, a] = this.ctx.getImageData(pt.x, pt.y, 1, 1).data;
      const pad = (v, p) => p.substr(0, p.length - v.length) + v;
      const hex = (v) => pad(v.toString(16), "00");
      // when selecting transparent color, instead use first color in palette
      return a ? `#${hex(r)}${hex(g)}${hex(b)}` : this.palette[0];
    },
  },
  mounted() {
    this.canvas = this.$refs.canvas;
    if (!this.canvas) {
      log.error("mounted: $refs.canvas not found");
      return;
    }
    this.ctx = this.canvas.getContext("2d");

    this.ws = util.wsClient("drawcast");

    const opts = window.localStorage.getItem("drawcastOpts");
    this.opts = opts ? JSON.parse(opts) : { canvasBg: "transparent" };

    this.ws.onMessage("init", (data) => {
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
      this.images = data.images;
      if (this.images.length > 0 && data.settings.autofillLatest) {
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
    this.ws.onMessage("post", (data) => {
      this.images.unshift(data.img);
      this.images = this.images.slice(0, 20);
    });
    this.ws.connect();

    window.addEventListener("keyup", (e) => {
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
    });

    // on window, in case left canvas and mouse up outside
    window.addEventListener("mouseup", () => {
      this.last = null;
    });

    this.$watch("color", () => {
      this.tool = "pen";
    });
  },
});
</script>
