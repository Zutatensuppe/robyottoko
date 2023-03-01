import { get, postJson } from '../xhr'

const getAnnouncements = async () => {
  const res = await get('/admin/api/announcements')
  return await res.json()
}

const postAnnouncement = async (title: string, message: string) => {
  const res = await postJson('/admin/api/announcements', { title, message })
  return await res.json()
}

export default {
  getAnnouncements,
  postAnnouncement,
}
