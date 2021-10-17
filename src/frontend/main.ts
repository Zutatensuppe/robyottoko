import * as VueRouter from 'vue-router'
import * as Vue from 'vue'

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
import PasswordReset from './views/PasswordReset.vue'
import ForgotPassword from './views/ForgotPassword.vue'

import draggable from "vuedraggable";
import Upload from "./components/Upload.vue";
import Codearea from "./components/Codearea.vue";
import DurationInput from "./components/DurationInput.vue";
import Player from "./components/Player.vue";
import Slider from "./components/Slider.vue";
import VolumeSlider from "./components/VolumeSlider.vue";
import ResponsiveImage from "./components/ResponsiveImage.vue";
import Navbar from "./components/Navbar.vue";
import Duration from "./components/Duration.vue";
import DoubleclickButton from "./components/DoubleclickButton.vue";
import Youtube from "./components/Youtube.vue";

import CommandsCommandEdit from "./components/Commands/CommandEdit.vue";
import CommandsCountdownEdit from "./components/Commands/CountdownEdit.vue";

import SongRequestHelp from "./components/SongRequest/Help.vue";
import SongRequestPlaylistEditor from "./components/SongRequest/PlaylistEditor.vue";
import SongRequestSettings from "./components/SongRequest/Settings.vue";
import SongRequestTagsEditor from "./components/SongRequest/TagsEditor.vue";

import "./style.css"

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
    ],
  })

  const getJson = async (path) => {
    const res = await fetch(path);
    return res.status === 200 ? (await res.json()) : null
  }

  const conf = await getJson('/api/conf')
  const me = await getJson('/api/user/me')

  router.beforeEach((to, from, next) => {
    if (to.meta.protected && !me) {
      next({ name: 'login' })
      return
    }
    if (!to.meta.protected && me) {
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
  app.config.globalProperties.$conf = conf
  app.config.globalProperties.$me = me
  app.use(router)
  app.component('codearea', Codearea)
  app.component('doubleclick-button', DoubleclickButton)
  app.component('draggable', draggable)
  app.component('duration-input', DurationInput)
  app.component('duration', Duration)
  app.component('navbar', Navbar)
  app.component('player', Player)
  app.component('responsive-image', ResponsiveImage)
  app.component('slider', Slider)
  app.component('upload', Upload)
  app.component('volume-slider', VolumeSlider)
  app.component('youtube', Youtube)
  // commands - maybe dont register these globally?
  app.component('command-edit', CommandsCommandEdit)
  app.component('countdown-edit', CommandsCountdownEdit)
  // songrequest - maybe dont register these globally?
  app.component('playlist-editor', SongRequestPlaylistEditor)
  app.component('tags-editor', SongRequestTagsEditor)
  app.component('song-request-settings', SongRequestSettings)
  app.component('help', SongRequestHelp)
  app.mount('#app')
}

run()
