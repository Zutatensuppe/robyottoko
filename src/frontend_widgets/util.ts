import WsClient from "../frontend/WsClient";

const v = (name: string, def: string): string => {
  // @ts-ignore
  return `${window[name] !== `{{${name}}}` ? window[name] : def}`;
};
const env = (name: string): string => {
  // @ts-ignore
  return `${import.meta.env[name]}`
}

const wsUrl = v("wsUrl", env('VITE_WS_URL'));
const token = v("widgetToken", env('VITE_WIDGET_TOKEN'));

export default {
  wsClient: (type: string) => new WsClient(wsUrl + '/widget_' + type, token),
  getParam: (name: string) => (new URLSearchParams(window.location.search)).get(name) || '',
}
