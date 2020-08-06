export default {
  name: 'responsive-image',
  props: {
    src: String,
    title: String,
    height: {
      type: String,
      default: '100%'
    },
    width: {
      type: String,
      default: '100%'
    },
  },
  template: `
  <div :style="style" :title="title"></div>
  `,
  computed: {
    style() {
      return {
        display: 'inline-block',
        verticalAlign: 'text-bottom',
        backgroundImage: 'url(/uploads/' + this.src + ')',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        width: this.width,
        height: this.height,
      }
    }
  }
}
