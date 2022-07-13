import ngrok from 'ngrok'
import { run } from './bot'
import config, { setPublicUrl } from './config'

(async () => {
  const url = await ngrok.connect({
    addr: `${config.http.hostname}:${config.http.port}`,
  });
  setPublicUrl(url);
  run()
})();
