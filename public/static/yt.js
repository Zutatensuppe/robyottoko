let apiRdy = false
function createApi() {
  if (apiRdy) {
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    const tag = document.createElement('script')
    tag.src = "https://www.youtube.com/iframe_api"
    document.head.append(tag)
    window.onYouTubeIframeAPIReady = () => {
      apiRdy = true
      resolve()
    }
  })
}

function createPlayer(id) {
  return new Promise((resolve) => {
    const player = new YT.Player(id, {
      playerVars: {
        iv_load_policy: 3, // do not load annotations
        modestbranding: 1, // remove youtube logo
      },
      events: {
        onReady: () => {
          resolve(player)
        }
      },
    })
  })
}

export async function prepareYt(id) {
  await createApi()
  return await createPlayer(id)
}
