import Ws from "./ws.js"
import { getCookie } from "./cookies.js"

export class Sockhyottoko extends Ws {
  constructor(addr) {
    super(window.WS_BASE + addr, ['x-token', getCookie('x-token')]);
  }
}

export class WidgetSocket extends Ws {
  constructor(addr) {
    super(window.WS_BASE + addr, ['x-widget-token', window.WIDGET_TOKEN]);
  }
}
