let conf: any = null;

const getJson = async (path: string) => {
  const res = await fetch(path);
  return res.status === 200 ? (await res.json()) : null
}
const init = async () => {
  conf = await getJson('/api/conf')
}

export default {
  init,
  getConf: () => conf,
}
