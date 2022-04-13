import WsClient from "../frontend/WsClient";

const v = (name: string, def: string): string => {
  return `${window[name] !== `{{${name}}}` ? window[name] : def}`;
};
// TODO: remove from source, looks strange
const wsUrl = v("wsUrl", import.meta.env.VITE_WIDGET_WS_URL);
const token = v("widgetToken", import.meta.env.VITE_WIDGET_TOKEN);

export default {
  wsClient: (type: string) => new WsClient(wsUrl + '/widget_' + type, token),
  getParam: (name: string) => (new URLSearchParams(window.location.search)).get(name) || '',
}
