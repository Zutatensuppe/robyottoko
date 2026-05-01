import { pinggy } from '@pinggy/pinggy'
import { run } from './bot'
import config, { setPublicUrl } from './config'

void (async () => {
  try {
    const tunnel = await pinggy.createTunnel({
      forwarding: `${config.http.hostname}:${config.http.port}`,
    })
    await tunnel.start()
    const urls = await tunnel.urls()
    console.log(`Tunnel started at ${urls.join(', ')}`)
    setPublicUrl(urls[0])
    void run()
  } catch (e) {
    console.error(e)
  }
})()
