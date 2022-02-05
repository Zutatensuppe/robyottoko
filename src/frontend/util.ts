import conf from "./conf";
import user from "./user";
import WsClient from "./WsClient";

const widgetUrl = (widget: string) => {
  const me = user.getMe()
  return `${location.protocol}//${location.host}/widget/${widget}/${me.widgetToken}/`;
}

const wsClient = (path: string) => {
  const cfg = conf.getConf()
  const me = user.getMe()
  return new WsClient(`${cfg.wsBase}/${path}`, me ? me.token : '');
}


export default {
  widgetUrl,
  wsClient,
}
