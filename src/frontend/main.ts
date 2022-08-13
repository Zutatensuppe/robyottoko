import * as VueRouter from 'vue-router'
import * as Vue from 'vue'

import Toast from "vue-toastification";
import "vue-toastification/dist/index.css";

import App from './App.vue'
import Index from './views/Index.vue'
import Login from './views/Login.vue'
import Drawcast from './views/Drawcast.vue'
import Variables from './views/Variables.vue'
import Register from './views/Register.vue'
import Settings from './views/Settings.vue'
import SongRequest from './views/SongRequest.vue'
import Commands from './views/Commands.vue'
import SpeechToText from './views/SpeechToText.vue'
import Avatar from './views/Avatar.vue'
import PasswordReset from './views/PasswordReset.vue'
import ForgotPassword from './views/ForgotPassword.vue'
import PomoModuleView from './views/PomoModuleView.vue'

import Checkbox from "./components/Checkbox.vue";
import DoubleclickButton from "./components/DoubleclickButton.vue";
import draggable from "vuedraggable";
import DropdownButton from "./components/DropdownButton.vue";
import DropdownInput from "./components/DropdownInput.vue";
import Duration from "./components/Duration.vue";
import DurationInput from "./components/DurationInput.vue";
import GlobalUserInfo from "./components/GlobalUserInfo.vue";
import ImageUpload from './components/ImageUpload.vue'
import MacroSelect from "./components/MacroSelect.vue";
import Navbar from "./components/Navbar.vue";
import Player from "./components/Player.vue";
import ProblemsDialog from "./components/ProblemsDialog.vue";
import ResponsiveImage from "./components/ResponsiveImage.vue";
import Slider from "./components/Slider.vue";
import SoundUpload from './components/SoundUpload.vue'
import Upload from "./components/Upload.vue";
import VolumeSlider from "./components/VolumeSlider.vue";
import Youtube from "./components/Youtube.vue";

import CommandsCommandEditor from "./components/Commands/CommandEditor.vue";
import CommandsMediaCommandEditor from "./components/Commands/MediaCommandEditor.vue";
import CommandsTextCommandEditor from "./components/Commands/TextCommandEditor.vue";
import CommandsDictLookupCommandEditor from "./components/Commands/DictLookupCommandEditor.vue";
import CommandsMadochanCreatewordCommandEditor from "./components/Commands/MadochanCreatewordCommandEditor.vue";
import CommandsCommandsEditor from "./components/Commands/CommandsEditor.vue";
import CommandsCountdownEditor from "./components/Commands/CountdownEditor.vue";
import CommandsTriggerEditor from "./components/Commands/TriggerEditor.vue";
import CommandsTriggerInfo from "./components/Commands/TriggerInfo.vue";

import SongRequestPlaylistEditor from "./components/SongRequest/PlaylistEditor.vue";
import SongRequestSettings from "./components/SongRequest/Settings.vue";
import SongRequestTagsEditor from "./components/SongRequest/TagsEditor.vue";

import AvatarEditor from "./components/Avatar/AvatarEditor.vue";
import AvatarSlotDefinitionEditor from "./components/Avatar/AvatarSlotDefinitionEditor.vue";
import AvatarSlotItemEditor from "./components/Avatar/AvatarSlotItemEditor.vue";
import AvatarPreview from "./components/Avatar/AvatarPreview.vue";
import AvatarSlotItemStateEditor from "./components/Avatar/AvatarSlotItemStateEditor.vue";
import AvatarFrameUpload from "./components/Avatar/AvatarFrameUpload.vue";
import AvatarAnimation from "./components/Avatar/AvatarAnimation.vue";

import Widget from './widgets/Widget.vue';

import global from './global'
import conf from './conf'
import user from './user'
import wsstatus from './wsstatus'

const run = async () => {
  const router = VueRouter.createRouter({
    history: VueRouter.createWebHistory(),
    routes: [
      {
        name: 'index', path: '/', component: Index, meta: {
          title: 'Hyottoko.club',
          protected: true,
        }
      },
      {
        name: 'login', path: '/login', component: Login, meta: {
          title: 'Login',
          protected: false,
        }
      },
      {
        name: 'register', path: '/register', component: Register, meta: {
          title: 'Register',
          protected: false,
        }
      },
      {
        name: 'password-reset', path: '/password-reset', component: PasswordReset, meta: {
          title: 'Password Reset',
          protected: false,
        }
      },
      {
        name: 'forgot-password', path: '/forgot-password', component: ForgotPassword, meta: {
          title: 'Forgot Password',
          protected: false,
        }
      },
      {
        name: 'commands', path: '/commands/', component: Commands, meta: {
          title: 'Commands',
          protected: true,
        }
      },
      {
        name: 'variables', path: '/variables/', component: Variables, meta: {
          title: 'Variables',
          protected: true,
        }
      },
      {
        name: 'sr', path: '/sr/', component: SongRequest, meta: {
          title: 'Song Request',
          protected: true,
        }
      },
      {
        name: 'speech-to-text', path: '/speech-to-text/', component: SpeechToText, meta: {
          title: 'Speech to text',
          protected: true,
        }
      },
      {
        name: 'avatar', path: '/avatar/', component: Avatar, meta: {
          title: 'Avatar',
          protected: true,
        }
      },
      {
        name: 'pomo', path: '/pomo/', component: PomoModuleView, meta: {
          title: 'Pomo',
          protected: true,
        }
      },
      {
        name: 'drawcast', path: '/drawcast/', component: Drawcast, meta: {
          title: 'Drawcast',
          protected: true,
        }
      },
      {
        name: 'settings', path: '/settings/', component: Settings, meta: {
          title: 'Settings',
          protected: true,
        }
      },
      {
        name: 'widget', path: '/widget/:widget_type/:widget_token/', component: Widget, meta: {
          title: 'Widget',
          protected: false,
        }
      },
      {
        name: 'pub', path: '/pub/:pub_id/', component: Widget, meta: {
          title: 'Pub',
          protected: false,
        }
      }
    ],
  })

  let initialized = false

  router.beforeEach(async (to, from, next) => {
    // is widget or pub, no extra init needed
    if (to.name === 'widget' || to.name === 'pub') {
      next()
      return
    }

    if (!initialized) {
      // load styles only when not opening a widget page.
      // widgets each have their own style
      // @ts-ignore
      import("./style.scss")

      user.eventBus.on('login', () => {
        wsstatus.init()
      })
      user.eventBus.on('logout', () => {
        wsstatus.stop()
      })
      user.eventBus.on('darkmode', (darkmode) => {
        if (darkmode) {
          document.documentElement.classList.add('darkmode')
        } else {
          document.documentElement.classList.remove('darkmode')
        }
      })

      await global.init()
      await conf.init()
      await user.init()

      initialized = true
    }

    if (to.meta.protected && !user.getMe()) {
      next({ name: 'login' })
      return
    }
    if (!to.meta.protected && user.getMe()) {
      next({ name: 'index' })
      return
    }

    if (from.name) {
      document.documentElement.classList.remove(`view-${String(from.name)}`)
    }
    document.documentElement.classList.add(`view-${String(to.name)}`)

    document.title = `${to.meta.title}`
    next()
  })
  const app = Vue.createApp(App)
  app.use(router)
  app.use(Toast, {})
  app.component('global-user-info', GlobalUserInfo)
  app.component('doubleclick-button', DoubleclickButton)
  app.component('dropdown-button', DropdownButton)
  app.component('dropdown-input', DropdownInput)
  app.component('checkbox', Checkbox)
  app.component('draggable', draggable)
  app.component('duration-input', DurationInput)
  app.component('duration', Duration)
  app.component('macro-select', MacroSelect)
  app.component('navbar', Navbar)
  app.component('player', Player)
  app.component('problems-dialog', ProblemsDialog)
  app.component('responsive-image', ResponsiveImage)
  app.component('slider', Slider)
  app.component('upload', Upload)
  app.component('image-upload', ImageUpload)
  app.component('sound-upload', SoundUpload)
  app.component('volume-slider', VolumeSlider)
  app.component('youtube', Youtube)
  app.component('commands-editor', CommandsCommandsEditor)
  app.component('command-editor', CommandsCommandEditor)
  app.component('media-command-editor', CommandsMediaCommandEditor)
  app.component('text-command-editor', CommandsTextCommandEditor)
  app.component('dict-lookup-command-editor', CommandsDictLookupCommandEditor)
  app.component('madochan-createword-command-editor', CommandsMadochanCreatewordCommandEditor)
  app.component('countdown-editor', CommandsCountdownEditor)
  app.component('trigger-editor', CommandsTriggerEditor)
  app.component('trigger-info', CommandsTriggerInfo)
  // songrequest - maybe dont register these globally?
  app.component('playlist-editor', SongRequestPlaylistEditor)
  app.component('tags-editor', SongRequestTagsEditor)
  app.component('song-request-settings', SongRequestSettings)
  // avatar - maybe dont register these globally?
  app.component('avatar-editor', AvatarEditor)
  app.component('avatar-slot-definition-editor', AvatarSlotDefinitionEditor)
  app.component('avatar-slot-item-editor', AvatarSlotItemEditor)
  app.component('avatar-preview', AvatarPreview)
  app.component('avatar-slot-item-state-editor', AvatarSlotItemStateEditor)
  app.component('avatar-frame-upload', AvatarFrameUpload)
  app.component('avatar-animation', AvatarAnimation)
  app.mount('#app')
}

run()
