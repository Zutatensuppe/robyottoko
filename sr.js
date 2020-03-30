const fn = require('./fn.js')

const save = (r) => fn.save('sr', r.data)

const extractYoutubeId = (youtubeUrl) => {
  const patterns = [
    /youtu\.be\/(.*?)(?:\?|"|$)/i,
    /\.youtube\.com\/(?:watch\?v=|v\/|embed\/)([^&"'#]*)/i,
  ]
  for (const pattern of patterns) {
    let m = youtubeUrl.match(pattern)
    if (m) {
      return m[1]
    }
  }
  if (youtubeUrl.match(/^[a-z0-9_-]+$/i)) {
    return youtubeUrl
  }
  return null
}

const sr = {
  data: fn.load('sr', {
    playlist: [],
    cur: -1,
  }),
  wss: null,
  skip: () => {
    if (sr.data.playlist.length === 0) {
      return
    }
    if (sr.data.cur + 1 >= sr.data.playlist.length) {
      // rotate
      sr.data.playlist.push(sr.data.playlist.shift())
    } else {
      sr.data.cur++
    }
    save(sr)
    sr.updateClients()
  },
  clear: () => {
    sr.data.playlist = []
    sr.data.cur = -1
    save(sr)
    sr.updateClients()
  },
  shuffle: () => {
    if (sr.data.cur === -1) {
      // just shuffle
      sr.data.playlist = fn.shuffle(sr.data.playlist)
    } else {
      // shuffle and go to same element
      const id = sr.data.playlist[sr.data.cur].id
      sr.data.playlist = fn.shuffle(sr.data.playlist)
      sr.data.cur = sr.data.playlist.findIndex(item => item.id ===id)
    }
    save(sr)
    sr.updateClients()
  },
  remove: () => {
    if (sr.data.cur === -1) {
      return
    }
    sr.playlist.splice(sr.data.cur, 1)
    if (sr.playlist.length === 0) {
      sr.data.cur = -1
    } else if (sr.playlist.length <= sr.data.cur) {
      sr.data.cur = 0
    }
    save(sr)
    sr.updateClients()
  },
  updateClients: () => {
    sr.wss.clients.forEach(function each(ws) {
      sr.updateClient(ws)
    })
  },
  updateClient: (ws) => {
    if (ws.isAlive) {
      ws.send(JSON.stringify(sr.data))
    }
  },
  addToPlaylist: (youtubeUrl) => {
    sr.data.playlist.push({ id: Math.random(), yt: youtubeUrl })
    if (sr.data.cur < 0) {
      sr.data.cur = 0
    }
    save(sr)
    sr.updateClients()
  },
  init: (client) => {
    const ws = require('ws')
    sr.wss = new ws.Server({ port: 1338 })
    function noop() { }
    sr.wss.on('connection', ws => {
      ws.isAlive = true
      ws.on('pong', function () { this.isAlive = true; })
      ws.on('message', function (data) {
        console.log(data)
        const d = JSON.parse(data)
        if (typeof d.cur !== 'undefined') {
          sr.data.cur = d.cur
          save(sr)
        }
      })
      sr.updateClient(ws)
    })
    const interval = setInterval(function ping() {
      sr.wss.clients.forEach(function each(ws) {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping(noop);
      });
    }, 30000)
    sr.wss.on('close', function close() {
      clearInterval(interval);
    }
    );
  },
  cmds: {
    '!sr': (context, params) => {
      if (params.length === 0) {
        return `Usage: !sr YOUTUBE-URL`
      }
      switch (params[0]) {
        case 'current':
          return `Currently playing: ${sr.data.playlist[sr.data.cur].yt}`
        case 'skip':
          if (fn.isBroadcaster(context)) {
            sr.skip()
            return
          }
          break
        case 'clear':
          if (fn.isBroadcaster(context)) {
            sr.clear()
            return
          }
          break
        case 'rm':
          if (fn.isBroadcaster(context)) {
            sr.remove()
            return
          }
          break
        case 'shuffle':
          if (fn.isBroadcaster(context)) {
            sr.shuffle()
            return
          }
          break
      }

      const youtubeUrl = params[0]
      const youtubeId = extractYoutubeId(youtubeUrl)
      if (!youtubeId) {
        return `Could not process that song request`
      }
      sr.addToPlaylist(youtubeId)
      return `Added ${youtubeId} to the playlist!`
    },
  },
  routes: {
    '/sr/player/': (req, res) => {
      return {
        code: 200,
        type: 'text/html',
        body: `
<html>
<head> <meta charset="utf-8"/>
<style type="text/css">
body { margin: 0; background: #333; color: #eec }
#playlist { width: 640px; }
ol { list-style: inside decimal; padding: 0 }
ol li { padding: .5em 1em; margin: .5em 0; border: solid 1px #444; }
.playing { background: #b2fb49; color: #444; }
.playing:before { display: inline-block; content: "[PLAYING] " }
.next { background: #ffd533; color: #444; }
.next:before { display: inline-block; content: "[QUEUED] " }
.played { background: #999; }
.played:before { display: inline-block; content: "[already played] " }
</style>
</head>
<body>
<div id="player"></div>
<div id="playlist"></div>
<script>

function prepareWs() {
  return new Promise((resolve, reject) => {
    let inited = false
    const s = new WebSocket('ws://robyottoko:1338/')
    s.onmessage = (e) => {
      const d = JSON.parse(e.data)
      if (!inited && d.playlist) {
        inited = true
	resolve({s, playlist: d.playlist, cur: d.cur})
      }
    }
  })
}

function prepareYt() {
  return new Promise((resolve, reject) => {
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    window.onYouTubeIframeAPIReady = () => {
      let player
      const onReady = () => {
	resolve(player);
      }
      player = new YT.Player('player', {
        height: '390',
        width: '640',
        events: { onReady },
      })
    }
  })
}

function doEverything (s, player, playlist, cur) {
  const updatePlaylistView = () => {
    const finished = playlist.slice(0, cur)
    const upcoming = playlist.slice(cur)
    document.getElementById('playlist').innerHTML = '<h3>EXPERIMENTAL SONG REQUEST</h3>' +
	'<ol>' +
	upcoming.map((item, idx) => '<li class="' + (idx === 0 ? 'playing' : 'next') + '">' + item.yt + '</li>').join('') +
	finished.map((item) => '<li class="played">' + item.yt + '</li>').join('') +
	'</ol>'
  }

  const play = (idx, force) => {
    if (idx < 0) {
      player.stopVideo()
      updatePlaylistView()
      return
    }
    if (
      player.getPlayerState() === 1
      && idx === cur
      && !force
    ) {
      updatePlaylistView()
      return
    }
    const item = playlist[idx]
    player.cueVideoById(item.yt)
    player.playVideo()
    cur = idx
    updatePlaylistView()
    s.send(JSON.stringify({'cur': cur}))
  }

  const next = () => {
    const idx = (cur + 1) >= playlist.length ? 0 : cur + 1
    play(idx)
  }


  player.addEventListener('onStateChange', (event) => {
    if (event.data == YT.PlayerState.ENDED) {
      next()
    }
  })

  play(cur)
  s.onmessage = function (e) {
    const d = JSON.parse(e.data)
    if (d.playlist) {
      // if playlist length is same, song was probably skipped
      const forceplay = d.playlist.length === playlist.length
      playlist = d.playlist
      play(d.cur, forceplay)
    }
  }
}

prepareWs().then(({s, playlist, cur}) => {
  prepareYt().then(p => {
    console.log(s, playlist, cur)
    doEverything(s, p, playlist, cur)
  })
})
</script>
</body>
</html>
	       `
      }
    },
  },
}

module.exports = sr
