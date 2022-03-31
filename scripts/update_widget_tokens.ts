import config from '../src/config'
import Db from '../src/Db'


const widgets = [
  { type: 'sr', pub: false, },
  { type: 'media', pub: false, },
  { type: 'speech-to-text', pub: false, },
  { type: 'speech-to-text_receive', pub: false, },
  { type: 'avatar', pub: false, },
  { type: 'avatar_receive', pub: false, },
  { type: 'drawcast_receive', pub: false, },
  { type: 'drawcast_draw', pub: true, },
  { type: 'drawcast_control', pub: false, },
  { type: 'pomo', pub: false, },
]

  ; (async () => {

    const db = new Db(config.db)
    // make sure we are always on latest db version
    db.patch(false)

    // user_id: number
    // type: string
    // token: string
    const tokens = db.getMany('token', { type: 'widget' }) as any[]
    for (const token of tokens) {
      // check if there exists each of the widget tokens
      for (const w of widgets) {
        const t = db.get('token', { user_id: token.user_id, type: `widget_${w.type}` })
        if (!t) {
          db.insert('token', {
            user_id: token.user_id,
            type: `widget_${w.type}`,
            token: token.token,
          })
        }
      }
      //
      console.log('deleting token')
      db.delete('token', { user_id: token.user_id, type: token.type, token: token.token })
    }
  })();
