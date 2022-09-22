import * as VueRouter from 'vue-router'
import * as Vue from 'vue'

import Toast from "vue-toastification";
import "vue-toastification/dist/index.css";

import App from './App.vue'
import AvatarView from './views/AvatarView.vue'
import CommandsView from './views/CommandsView.vue'
import DrawcastView from './views/DrawcastView.vue'
import ForgotPasswordView from './views/ForgotPasswordView.vue'
import IndexView from './views/IndexView.vue'
import LoginView from './views/LoginView.vue'
import PasswordResetView from './views/PasswordResetView.vue'
import PomoModuleView from './views/PomoModuleView.vue'
import RegisterView from './views/RegisterView.vue'
import SettingsView from './views/SettingsView.vue'
import SongRequestView from './views/SongRequestView.vue'
import SpeechToTextView from './views/SpeechToTextView.vue'
import VariablesView from './views/VariablesView.vue'

import CheckboxInput from "./components/CheckboxInput.vue";
import DoubleclickButton from "./components/DoubleclickButton.vue";
import draggable from "vuedraggable";
import DropdownButton from "./components/DropdownButton.vue";
import DropdownInput from "./components/DropdownInput.vue";
import DurationDisplay from "./components/DurationDisplay.vue";
import DurationInput from "./components/DurationInput.vue";
import GlobalUserInfo from "./components/GlobalUserInfo.vue";
import ImageUpload from './components/ImageUpload.vue'
import MacroSelect from "./components/MacroSelect.vue";
import NavbarElement from "./components/NavbarElement.vue";
import AudioPlayer from "./components/AudioPlayer.vue";
import ProblemsDialog from "./components/ProblemsDialog.vue";
import ResponsiveImage from "./components/ResponsiveImage.vue";
import SliderInput from "./components/SliderInput.vue";
import SoundUpload from './components/SoundUpload.vue'
import UploadInput from "./components/UploadInput.vue";
import VolumeSlider from "./components/VolumeSlider.vue";
import YoutubePlayer from "./components/YoutubePlayer.vue";

import CommandsMediaCommandEditor from "./components/Commands/MediaCommandEditor.vue";
import CommandsTextCommandEditor from "./components/Commands/TextCommandEditor.vue";
import CommandsDictLookupCommandEditor from "./components/Commands/DictLookupCommandEditor.vue";
import CommandsMadochanCreatewordCommandEditor from "./components/Commands/MadochanCreatewordCommandEditor.vue";
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
        name: 'index', path: '/', component: IndexView, meta: {
          title: 'Hyottoko.club',
          protected: true,
        }
      },
      {
        name: 'login', path: '/login', component: LoginView, meta: {
          title: 'Login',
          protected: false,
        }
      },
      {
        name: 'register', path: '/register', component: RegisterView, meta: {
          title: 'Register',
          protected: false,
        }
      },
      {
        name: 'password-reset', path: '/password-reset', component: PasswordResetView, meta: {
          title: 'Password Reset',
          protected: false,
        }
      },
      {
        name: 'forgot-password', path: '/forgot-password', component: ForgotPasswordView, meta: {
          title: 'Forgot Password',
          protected: false,
        }
      },
      {
        name: 'commands', path: '/commands/', component: CommandsView, meta: {
          title: 'Commands',
          protected: true,
        }
      },
      {
        name: 'variables', path: '/variables/', component: VariablesView, meta: {
          title: 'Variables',
          protected: true,
        }
      },
      {
        name: 'sr', path: '/sr/', component: SongRequestView, meta: {
          title: 'Song Request',
          protected: true,
        }
      },
      {
        name: 'speech-to-text', path: '/speech-to-text/', component: SpeechToTextView, meta: {
          title: 'Speech to text',
          protected: true,
        }
      },
      {
        name: 'avatar', path: '/avatar/', component: AvatarView, meta: {
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
        name: 'drawcast', path: '/drawcast/', component: DrawcastView, meta: {
          title: 'Drawcast',
          protected: true,
        }
      },
      {
        name: 'settings', path: '/settings/', component: SettingsView, meta: {
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
  app.component('GlobalUserInfo', GlobalUserInfo)
  app.component('DoubleclickButton', DoubleclickButton)
  app.component('DropdownButton', DropdownButton)
  app.component('DropdownInput', DropdownInput)
  app.component('CheckboxInput', CheckboxInput)
  app.component('VueDraggable', draggable)
  app.component('DurationInput', DurationInput)
  app.component('DurationDisplay', DurationDisplay)
  app.component('MacroSelect', MacroSelect)
  app.component('NavbarElement', NavbarElement)
  app.component('AudioPlayer', AudioPlayer)
  app.component('ProblemsDialog', ProblemsDialog)
  app.component('ResponsiveImage', ResponsiveImage)
  app.component('SliderInput', SliderInput)
  app.component('UploadInput', UploadInput)
  app.component('ImageUpload', ImageUpload)
  app.component('SoundUpload', SoundUpload)
  app.component('VolumeSlider', VolumeSlider)
  app.component('YoutubePlayer', YoutubePlayer)
  app.component('MediaCommandEditor', CommandsMediaCommandEditor)
  app.component('TextCommandEditor', CommandsTextCommandEditor)
  app.component('DictLookupCommandEditor', CommandsDictLookupCommandEditor)
  app.component('MadochanCreatewordCommandEditor', CommandsMadochanCreatewordCommandEditor)
  app.component('CountdownEditor', CommandsCountdownEditor)
  app.component('TriggerEditor', CommandsTriggerEditor)
  app.component('TriggerInfo', CommandsTriggerInfo)
  // songrequest - maybe dont register these globally?
  app.component('PlaylistEditor', SongRequestPlaylistEditor)
  app.component('TagsEditor', SongRequestTagsEditor)
  app.component('SongRequestSettings', SongRequestSettings)
  // avatar - maybe dont register these globally?
  app.component('AvatarEditor', AvatarEditor)
  app.component('AvatarSlotDefinitionEditor', AvatarSlotDefinitionEditor)
  app.component('AvatarSlotItemEditor', AvatarSlotItemEditor)
  app.component('AvatarPreview', AvatarPreview)
  app.component('AvatarSlotItemStateEditor', AvatarSlotItemStateEditor)
  app.component('AvatarFrameUpload', AvatarFrameUpload)
  app.component('AvatarAnimation', AvatarAnimation)
  app.mount('#app')
}

run()
