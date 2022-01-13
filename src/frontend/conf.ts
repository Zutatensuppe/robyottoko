import api from "./api";

let conf: any = null;

const init = async () => {
  const res = await api.getConf()
  conf = res.status === 200 ? (await res.json()) : null
}

export default {
  init,
  getConf: () => conf,
}
