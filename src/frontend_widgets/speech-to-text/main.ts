import * as Vue from 'vue'

import './main.css'

import Page from './Page.vue'
const app = Vue.createApp(Page, { controls: true, widget: "speech-to-text" })
app.mount('#app');
