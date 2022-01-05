import WsClient from "../frontend/WsClient";

const v = (name: string, def: string): string => {
  return `${window[name] !== `{{${name}}}` ? window[name] : def}`;
};
// TODO: remove from source, looks strange
const wsUrl = v("wsUrl", import.meta.env.VITE_WIDGET_WS_URL);
const meToken = v("widgetToken", import.meta.env.VITE_WIDGET_TOKEN);

export default {
  wsClient: (widget: string) => new WsClient(wsUrl + '/' + widget, meToken)
}
