import conf from "./conf";
import user from "./user";
import WsClient from "./WsClient";

const wsClient = (path: string) => {
  const cfg = conf.getConf()
  const me = user.getMe()
  return new WsClient(`${cfg.wsBase}/${path}`, me ? me.token : '');
}

export default {
  wsClient,
}
