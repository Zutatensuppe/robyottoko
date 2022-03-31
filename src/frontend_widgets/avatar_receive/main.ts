import * as Vue from 'vue'

import './../avatar/main.css'

import Page from './../avatar/Page.vue'
const app = Vue.createApp(Page, { controls: false, widget: "avatar_receive" })
app.mount('#app');
