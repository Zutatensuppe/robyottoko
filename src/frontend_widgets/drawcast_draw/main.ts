import * as Vue from 'vue'

import './main.scss'

import Page from './Page.vue'
import IconPen from './components/IconPen.vue'
import IconEyedropper from './components/IconEyedropper.vue'
import IconSend from './components/IconSend.vue'
import IconUndo from './components/IconUndo.vue'
import IconEraser from './components/IconEraser.vue'
import IconClear from './components/IconClear.vue'
const app = Vue.createApp(Page)
app.component('icon-pen', IconPen)
app.component('icon-eyedropper', IconEyedropper)
app.component('icon-send', IconSend)
app.component('icon-undo', IconUndo)
app.component('icon-eraser', IconEraser)
app.component('icon-clear', IconClear)
app.mount('#app');
