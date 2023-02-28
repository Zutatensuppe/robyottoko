import WsClient from '../WsClient'

export interface WidgetApiData {
  widget: string
  title: string
  wsUrl: string
  widgetToken: string
}

const getParam = (name: string) => (new URLSearchParams(window.location.search)).get(name) || ''

export default {
  wsClient: (wdata: WidgetApiData) => new WsClient(`${wdata.wsUrl}/widget_${wdata.widget}`, wdata.widgetToken),
  getParam,
}
