<template>
  <div
    v-if="modules"
    class="view"
  >
    <div
      id="top"
      ref="top"
    >
      <NavbarElement />
    </div>
    <div
      id="main"
      ref="main"
    >
      <div
        v-for="(m, idx) in modules"
        :key="idx"
        class="module-box has-background-light mb-5 p-3"
      >
        <h4 class="title is-4 mb-0">
          <div class="field">
            Module: {{ m.title }}
            <label>
              <input
                v-model="modules[idx].enabled"
                type="checkbox"
                @change="updateEnabled(m)"
              />
              {{ m.enabled ? 'Is enabled' : 'Is disabled' }}
            </label>
          </div>
        </h4>
        <table
          v-if="m.widgets.length"
          class="table is-striped is-fullwidth"
        >
          <thead>
            <tr>
              <th>Widget</th>
              <th />
              <th>Hint</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(widget, idx2) in m.widgets"
              :key="idx2"
            >
              <td>
                <a
                  :href="widget.url"
                  target="blank"
                >{{ widget.title }}</a>
              </td>
              <td>
                <div class="widget-actions">
                  <span
                    class="button is-small ml-1"
                    @click="copyUrl(widget)"
                  >Copy URL</span>
                  <span
                    class="button is-small ml-1"
                    @click="resetUrl(widget)"
                  >Reset URL</span>
                </div>
              </td>
              <td>{{ widget.hint }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api from '../_api'
import { useToast } from 'vue-toastification'
import NavbarElement from '../components/NavbarElement.vue'
import { useRouter } from 'vue-router'

interface WidgetDefinition {
  type: string
  pub: boolean
  title: string
  hint: string
  url: string
}

interface ModuleDefinition {
  key: string
  title: string
  enabled: boolean
  widgets: WidgetDefinition[]
}

const router = useRouter()
const toast = useToast()
const modules = ref<ModuleDefinition[]>([])

const updateEnabled = async (m: { key: string, enabled: boolean }): Promise<void> => {
  await api.setModuleEnabled(m)
}

const copyUrl = async (widget: WidgetDefinition): Promise<void> => {
  await navigator.clipboard.writeText(widget.url)
  toast.success('URL copied to clipboard')
}

const resetUrl = async (widget: WidgetDefinition): Promise<void> => {
  if (!confirm('Are you sure you want to reset the URL?')) {
    return
  }
  const res = await api.createWidgetUrl({
    type: widget.type,
    pub: widget.pub,
  })
  if (res.status !== 200) {
    toast.error('New URL couldn\'t be created')
    return
  }

  try {
    const json = await res.json()
    if (json.url) {
      modules.value = modules.value.map((m: ModuleDefinition) => {
        m.widgets = m.widgets.map((w) => {
          if (w.type === widget.type) {
            w.url = json.url
          }
          return w
        })
        return m
      })
    }
    toast.success('New URL created')
  } catch (e: any) {
    toast.error('New URL couldn\'t be created')
  }
}

onMounted(async () => {
  const res = await api.getPageIndexData()
  if (res.status !== 200) {
    router.push({ name: 'login' })
    return
  }

  const data: { modules: ModuleDefinition[] } = await res.json()
  modules.value = data.modules
})
</script>
