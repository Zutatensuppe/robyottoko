import conf from "./conf";
import user from "./user";
import WsClient from "./WsClient";

const widgetUrl = (widget: string) => {
  const me = user.getMe()
  return `${location.protocol}//${location.host}/widget/${widget}/${me.widgetToken}/`;
}

const wsClient = (widget: string) => {
  const cfg = conf.getConf()
  return new WsClient(`${cfg.wsBase}/${widget}`, user.getMe().token);
}


export default {
  widgetUrl,
  wsClient,
}
