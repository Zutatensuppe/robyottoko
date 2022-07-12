import localtunnel from 'localtunnel'
import { run } from './bot'
import config, { setPublicUrl } from './config'

(async () => {
  const tunnel = await localtunnel({
    local_host: config.http.hostname,
    port: config.http.port,
  });

  setPublicUrl(tunnel.url);
  run()

  tunnel.on('close', () => {
    // tunnels are closed
    // ignore for now...
    // TODO: should stop bot and print some error.. maybe?
  });
})();
