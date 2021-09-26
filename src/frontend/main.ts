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

(async () => {
  const router = VueRouter.createRouter({
    history: VueRouter.createWebHistory(),
    routes: [
      { name: 'index', path: '/', component: Index },
      { name: 'login', path: '/login', component: Login },
      { name: 'register', path: '/register', component: Register },
      { name: 'password-reset', path: '/password-reset', component: PasswordReset },
      { name: 'forgot-password', path: '/forgot-password', component: ForgotPassword },
      { name: 'commands', path: '/commands/', component: Commands },
      { name: 'variables', path: '/variables/', component: Variables },
      { name: 'sr', path: '/sr/', component: SongRequest },
      { name: 'speech-to-text', path: '/speech-to-text/', component: SpeechToText },
      { name: 'drawcast', path: '/drawcast/', component: Drawcast },
      { name: 'settings', path: '/settings/', component: Settings },
    ],
  })

  router.beforeEach((to, from) => {
    if (from.name) {
      document.documentElement.classList.remove(`view-${String(from.name)}`)
    }
    document.documentElement.classList.add(`view-${String(to.name)}`)
  })

  const app = Vue.createApp(App)
  app.use(router)
  app.mount('#app')
})()
