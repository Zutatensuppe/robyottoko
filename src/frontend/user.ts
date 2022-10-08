import mitt from "mitt";
import { ApiUserData } from "../types";
import api from "./api";

let me: ApiUserData | null = null;

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

export default {
  getMe: () => me,
  isDarkmode,
  setDarkmode,
  eventBus,
  logout,
  init,
}
