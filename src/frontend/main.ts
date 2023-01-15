import * as VueRouter from 'vue-router'
import * as Vue from 'vue'

import Toast from "vue-toastification";
import "vue-toastification/dist/index.css";

import App from './App.vue'
import AvatarView from './views/AvatarView.vue'
import CommandsView from './views/CommandsView.vue'
import DrawcastView from './views/DrawcastView.vue'
import IndexView from './views/IndexView.vue'
import LoginView from './views/LoginView.vue'
import PomoModuleView from './views/PomoModuleView.vue'
import SettingsView from './views/SettingsView.vue'
import SongRequestView from './views/SongRequestView.vue'
import SpeechToTextView from './views/SpeechToTextView.vue'
import VariablesView from './views/VariablesView.vue'

import draggable from "vuedraggable";

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
      await conf.init()
      await user.init()

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
  app.component('VueDraggable', draggable)
  app.mount('#app')
}

run()
