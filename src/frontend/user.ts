import mitt from "mitt";
import api from "./api";

let me: any = null;

export const eventBus = mitt()

export const isDarkmode = (): boolean => {
  return localStorage.getItem('darkmode') === '1'
}

export const setDarkmode = (darkmode: boolean): void => {
  localStorage.setItem('darkmode', darkmode ? '1' : '0')
  eventBus.emit('darkmode', darkmode)
}

async function init(): Promise<void> {
  eventBus.emit('darkmode', isDarkmode())

  const res = await api.getMe();
  me = res.status === 200 ? (await res.json()) : null
  if (me) {
    eventBus.emit('login')
  }
}

async function logout(): Promise<{ error: string | false }> {
  const res = await api.logout();
  const data = await res.json();
  if (data.success) {
    me = null
    eventBus.emit('logout')
    return { error: false }
  } else {
    return { error: "[2021-09-25 18:36]" }
  }
}

async function login(user: string, pass: string): Promise<{ error: string | false }> {
  const res = await api.login({ user, pass });
  if (res.status === 200) {
    await init()
    return { error: false }
  } else if (res.status === 401) {
    return { error: (await res.json()).reason }
  } else {
    return { error: "Unknown error" }
  }
}

export default {
  getMe: () => me,
  isDarkmode,
  setDarkmode,
  eventBus,
  logout,
  login,
  init,
}
