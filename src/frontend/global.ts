import api from "./api";


const global = {
  data: {
    registeredUserCount: 0,
  },
}

const init = async () => {
  try {
    const res = await api.getDataGlobal();
    const data = await res.json();
    global.data.registeredUserCount = data.registeredUserCount;
  } catch (e: any) {
    console.error(e);
  }
}

export default {
  getData: () => global.data,
  init,
}
