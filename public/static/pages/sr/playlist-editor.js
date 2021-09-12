export default {
  props: {
    playlist: Array,
    filter: Object,
  },
  data() {
    return {
      hideFilteredOut: true,
      filterTagInput: '',
      tagInput: '',
      tagInputIdx: -1,
    }
  },
  methods: {
    dragEnd(evt) {
      this.sendCtrl('move', [evt.oldIndex, evt.newIndex])
    },
    applyFilter(tag) {
      this.$emit('filterChange', tag)
    },
    sendCtrl(ctrl, args) {
      this.$emit('ctrl', [ctrl, args])
    },
    isFilteredOut(item) {
      return this.filter.tag !== '' && !item.tags.includes(this.filter.tag)
    },
    startAddTag(idx) {
      this.tagInputIdx = idx
      this.$nextTick(() => {
        this.$el.querySelector('table .filter-tag-input').focus()
      })
    },
  },
  computed: {
    enhancedPlaylist() {
      return this.playlist.map(item => {
        item.filteredOut = this.isFilteredOut(item)
        return item
      })
    },
    firstIndex() {
      if (this.filter.tag === '') {
        return 0
      }
      return this.playlist.findIndex(item => item.tags.includes(this.filter.tag))
    },
  },
  watch: {
    playlist: function (newVal, oldVal) {
      if (!newVal.find(item => !this.isFilteredOut(item))) {
        this.$emit('stopPlayer')
      }
    },
    filter: function (newVal, oldVal) {
      if (!this.playlist.find(item => !this.isFilteredOut(item))) {
        this.$emit('stopPlayer')
      }
    },
  },
  template: `
  <div>
    <div class="filters">
      <div class="currentfilter">
        <div class="mr-1 pt-1">Filter: </div>
        <span class="tag mr-1" v-if="filter.tag" @click="applyFilter('')">{{ filter.tag }} <i class="fa fa-remove ml-1" /></span>
        <div v-else class="field has-addons mr-1">
          <div class="control"><input class="input is-small filter-tag-input" type="text" v-model="filterTagInput" @keyup.enter="applyFilter(filterTagInput)" /></div>
          <div class="control"><span class="button is-small" @click="applyFilter(filterTagInput)">Apply filter</span></span></div>
        </div>
        <label class="pt-1"><input class="checkbox" type="checkbox" v-model="hideFilteredOut" /> Hide filtered out</label>
      </div>
    </div>
    <table class="table is-striped" v-if="playlist.length > 0">
      <thead>
        <tr>
          <th></th>
          <th></th>
          <th></th>
          <th>Title</th>
          <th>User</th>
          <th>Plays</th>
          <th></th>
          <th></th>
          <th></th>
        </tr>
      </thead>
      <draggable :value="playlist" @end="dragEnd" tag="tbody" handle=".handle">
        <tr v-for="(item, idx) in enhancedPlaylist" v-show="!hideFilteredOut || !item.filteredOut" :key="idx">
          <td class="pt-4 handle">
            <i class="fa fa-arrows"></i>
          </td>
          <td>{{idx+1}}</td>
          <td><button
            v-if="idx !== firstIndex"
            class="button is-small"
            :disabled="item.filteredOut ? true : null"
            @click="sendCtrl('playIdx', [idx])"
            title="Play"><i class="fa fa-play"/></button></td>
          <td>
            <a :href="'https://www.youtube.com/watch?v=' + item.yt" target="_blank">
                {{ item.title || item.yt }}
                <i class="fa fa-external-link"/>
            </a>
            <div>
              <span
                v-for="(tag, idx2) in item.tags"
                :key="idx2"
                class="tag"
                @click="sendCtrl('rmtag', [tag, idx])"
              >
                {{ tag }} <i class="fa fa-remove ml-1" />
              </span>
              <span class="button is-small" @click="startAddTag(idx)"><i class="fa fa-plus" /></span>
            </div>
            <div class="field has-addons" v-if="tagInputIdx === idx">
              <div class="control"><input class="input is-small filter-tag-input" type="text" v-model="tagInput" @keyup.enter="sendCtrl('addtag', [tagInput, idx]);tagInput = '';" /></div>
              <div class="control"><span class="button is-small" :disabled="tagInput ? null : true" @click="sendCtrl('addtag', [tagInput, idx]);tagInput = '';">Add tag</span></span></div>
            </div>
          </td>
          <td>{{ item.user }}</td>
          <td>{{ item.plays }}x</td>
          <td><button class="button is-small" @click="sendCtrl('goodIdx', [idx])"><i class="fa fa-thumbs-up mr-1"/> {{ item.goods }}</button></td>
          <td><button class="button is-small" @click="sendCtrl('badIdx', [idx])"><i class="fa fa-thumbs-down mr-1"/> {{ item.bads }}</button></td>
          <td><button class="button is-small" @click="sendCtrl('rmIdx', [idx])" title="Remove"><i class="fa fa-trash"/></button></td>
        </tr>
      </draggable>
    </table>
    <div v-else>Playlist is empty</div>
  </div>`
}
