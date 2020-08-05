export default Vue.component('upload', {
  props: {
    accept: String,
    label: String,
  },
  template: `
<label>
    <input type="file" style="display: none" @change="upload" :accept="accept" />
    <span class="btn"><i class="fa fa-upload" /> {{label || 'Upload File'}}</span>
</label>
`,
  methods: {
    async upload(evt) {
      const file = evt.target.files[0]
      if (!file) return;
      const formData = new FormData();
      formData.append('file', file, file.name);
      const res = await fetch('/upload', {
        method: 'post',
        body: formData,
      })
      const j = await res.json()
      this.$emit('uploaded', j)
    },
  }
})
