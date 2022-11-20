import { SongrequestModuleCustomCssPreset } from "./SongrequestModuleCommon"

export const presets: SongrequestModuleCustomCssPreset[] = [
  {
    name: 'default',
    showProgressBar: false,
    maxItemsShown: 5,
    showThumbnails: 'left',
    timestampFormat: '',
    hidePlayer: false,
    css: '',
  },
  {
    name: 'Preset 1: No video',
    showProgressBar: false,
    maxItemsShown: 5,
    showThumbnails: 'left',
    hidePlayer: true,
    timestampFormat: '',
    css: `@import url('https://fonts.googleapis.com/css2?family=Sunflower:wght@300&display=swap');
body { font-family: 'Sunflower', sans-serif; font-size: 15px; }
.playing { background: #1E1B1A; color: #AC7870; }
.not-playing { background: #1D1D1C; color: #525259; }
.playing .vote { font-size: 15px; color: #8B7359}
.playing .meta { font-size: 14px; color: #8B7359}
.vote { font-size: 15px; color: #4A544D}
.meta { font-size: 14px; color: #4A544D}
.playing .title:before { content: '▶ ' }
.meta-left .meta-user:after,
.meta-left .meta-plays { display: none; }
.meta-right .meta-plays { display: inline-block; }
.meta-user-text-before,
.meta-user-text-after {display: none}`
  },
  {
    name: 'Preset 2: No video, round thumbnails',
    showProgressBar: false,
    maxItemsShown: 10,
    showThumbnails: 'left',
    timestampFormat: '',
    hidePlayer: true,
    css: `@import url('https://fonts.googleapis.com/css2?family=Sunflower:wght@300&display=swap');
body { font-family: 'Sunflower', sans-serif; font-size: 16px; }
.playing { background: #1E1B1A; color: #AC7870; }
.not-playing { background: #1D1D1C; color: #525259; box-shadow: 0px 5px 5px inset rgba(0,0,0,0.4); }
.item { margin: 0px; padding: 0px; column-gap: 0px; }
.thumbnail { width: calc(90px*0.5625); padding: 6px 6px; height: 100%}
.media-16-9 { padding-bottom: 100%; overflow: hidden; border-radius: 99px; box-shadow: 2px 2px 3px rgba(0,0,0,0.5); }
.thumbnail img { object-fit: cover; }
.title { overflow: hidden; white-space: nowrap; line-height: 20px; margin: 6px; margin-top: 10px; }
.item:nth-child(n+6) { display: none; }
.playing .vote { font-size: 14px; color: #8B7359; }
.playing .meta { color: #8B7359 }
.vote { font-size: 14px; color: #4A544D}
.meta { color: #4A544D}
.playing .title:before { content: '▶️ ' }
.meta-left .meta-user { margin-left: 6px; }
.meta-left .meta-plays { display: none; }
.meta-right .meta-plays { display: inline-block;}
.meta-right { margin-right: 10px; }
.meta-right * { margin-right: 3px; }
.fa { margin-right: 0px; }
.meta-left .meta-user:after,
.meta-user-text-before,
.meta-user-text-after {display: none}`
  },
  {
    name: 'Preset 3: Video on the left',
    showProgressBar: false,
    maxItemsShown: 10,
    showThumbnails: 'left',
    timestampFormat: '',
    hidePlayer: false,
    css: `@import url('https://fonts.googleapis.com/css2?family=Sunflower:wght@300&display=swap');
body { font-family: 'Sunflower', sans-serif; font-size: 15px; }
.playing { background: #1E1B1A; color: #AC7870; }
.not-playing { background: #1D1D1C; color: #525259; }
.wrapper { display: grid; grid-template-areas: "player playlist"; grid-template-columns: 50% auto; }
.playing .vote { font-size: 15px; color: #8B7359}
.playing .meta { font-size: 14px; color: #8B7359}
.vote { font-size: 15px; color: #4A544D}
.meta { font-size: 14px; color: #4A544D}
.playing .title:before { content: '▶ ' }
.meta-left .meta-user:after,
.meta-left .meta-plays { display: none; }
.meta-right .meta-plays { display: inline-block; }
.meta-user-text-before,
.meta-user-text-after {display: none}
.thumbnail {display: none}
.video-16-9 {overflow: visible; }
.progress { position: absolute; top: 100%; }`
  },
  {
    name: 'Preset 4: Video',
    showProgressBar: false,
    maxItemsShown: 10,
    showThumbnails: 'left',
    timestampFormat: '',
    hidePlayer: false,
    css: `@import url('https://fonts.googleapis.com/css2?family=Sunflower:wght@300&display=swap');
body { font-family: 'Sunflower', sans-serif; font-size: 15px; }
.playing { background: #1E1B1A; color: #AC7870; }
.not-playing { background: #1D1D1C; color: #525259; }
.item:nth-child(n+6) { display: none; }
.playing .vote { font-size: 15px; color: #8B7359}
.playing .meta { font-size: 14px; color: #8B7359}
.vote { font-size: 15px; color: #4A544D}
.meta { font-size: 14px; color: #4A544D}
.playing .title:before { content: '▶ ' }
.meta-left .meta-user:after,
.meta-left .meta-plays { display: none; }
.meta-right .meta-plays { display: inline-block; }
.meta-user-text-before,
.meta-user-text-after {display: none}
.thumbnail {display: none}`
  },
  {
    name: 'Preset 5: No video, transparent',
    showProgressBar: false,
    maxItemsShown: 10,
    showThumbnails: 'left',
    timestampFormat: '',
    hidePlayer: true,
    css: `@import url('https://fonts.googleapis.com/css2?family=Sunflower:wght@300&display=swap');
body { font-family: 'Sunflower', sans-serif; font-size: 15px; }
.playing .title { text-overflow: hidden; overflow: hidden; }
.not-playing .title { text-overflow: ellipsis; overflow: hidden; }
.playing { background: #1E1B1A00; color: #f4faf6; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3), 0 3px 5px rgba(0, 0, 0, 0.2), 0 5px 10px rgba(0, 0, 0, 0.25); border: 0 }
.not-playing { background: #1D1D1C00; color: #f4faf6; text-shadow:0 1px 3px rgba(0, 0, 0, 0.3), 0 3px 5px rgba(0, 0, 0, 0.2), 0 5px 10px rgba(0, 0, 0, 0.25); font-size: 10px; border: 0; padding-left: 30px; padding-right: 30px;}
.playing .title:before { content: '▶ ' }
.meta-left .meta-user:after,
.meta-left .meta-plays { display: none; }
.meta-right .meta-plays { display: inline-block; padding: 5px}
.meta-user-text-before,
.meta-user-text-after {display: none}`
  },
  {
    name: 'Preset 6: Video, Progress bar under text',
    showProgressBar: true,
    maxItemsShown: 1,
    showThumbnails: 'left',
    timestampFormat: '',
    hidePlayer: false,
    css: `.thumbnail { display: none }
.item { grid-template-areas: "title"; grid-template-columns: auto; }
.video-16-9  {overflow: visible; }
.progress { position: absolute; top: 100%; }
.progress { height: 12vw; background: #334466;  }
.progress-value { background: #dd0077; }
.meta-left, .meta-right { display: none; }
.title {margin-bottom: 0; }
.player { position: relative;}
.list { position:relative; z-index: 5;}
.item {background: transparent !important ; border: none; padding: 0 .5em; }
.title { color: white; font-size: 5vw; line-height: 12vw; white-space: nowrap; text-shadow: 0 2px 2px rgba(0,0,0, 1); overflow:hidden; text-overflow: ellipsis; }`
  },
  {
    name: 'Preset 7: Title only, Progress bar, Pulsating text',
    hidePlayer: true,
    showProgressBar: true,
    maxItemsShown: 1,
    showThumbnails: 'left',
    timestampFormat: '',
    css: `.playing .title:before { content: '🎶 now playing: '; color: #FFDD00; margin-right: .5em; }
.title { margin: 0; white-space: nowrap; font-size: 20px; }
.not-playing .title { text-overflow: ellipsis; overflow: hidden; }
.meta, .vote { display: none; }
.playing { background: #222; color: #0057B7; }
.not-playing { display: none; }
.item { border: 0; }
.thumbnail { display: none; }
.wrapper { font-family: "DPComic"; font-size: 10px; letter-spacing: .1em; }
.playing { animation: back 2s linear 2s infinite; }
@keyframes back {
  0% { color: #0057B7; }
  50% { color: #FFDD00; }
  51% { color: #FFDD00; }
  100% { color: #0057B7; }
}
.progress { height: 5px; }
.wrapper { display: grid; grid-template-areas: "list" "player"; }
.player { grid-area: player }
.video-16-9 { height: 5px; }
.list { grid-area: list }
.progress { background: #222; }
.progress-value { background: #639bff; }`
  }
]

export default {
  presets
}
