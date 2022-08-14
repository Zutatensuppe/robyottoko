import config from '../src/config'
import Db from '../src/DbPostgres'
import { WIDGET_TYPE } from '../src/types';


const widgets = [
  { type: WIDGET_TYPE.SR, pub: false, },
  { type: WIDGET_TYPE.MEDIA, pub: false, },
  { type: WIDGET_TYPE.SPEECH_TO_TEXT_CONTROL, pub: false, },
  { type: WIDGET_TYPE.SPEECH_TO_TEXT_RECEIVE, pub: false, },
  { type: WIDGET_TYPE.AVATAR_CONTROL, pub: false, },
  { type: WIDGET_TYPE.AVATAR_RECEIVE, pub: false, },
  { type: WIDGET_TYPE.DRAWCAST_RECEIVE, pub: false, },
  { type: WIDGET_TYPE.DRAWCAST_DRAW, pub: true, },
  { type: WIDGET_TYPE.DRAWCAST_CONTROL, pub: false, },
  { type: WIDGET_TYPE.POMO, pub: false, },
]

  ; (async () => {

    const db = new Db(config.db.connectStr, config.db.patchesDir)
    // make sure we are always on latest db version
    db.patch(false)

    // user_id: number
    // type: string
    // token: string
    const tokens = await db.getMany('token', { type: 'widget' }) as any[]
    for (const token of tokens) {
      // check if there exists each of the widget tokens
      for (const w of widgets) {
        const t = await db.get('token', { user_id: token.user_id, type: `widget_${w.type}` })
        if (!t) {
          await db.insert('token', {
            user_id: token.user_id,
            type: `widget_${w.type}`,
            token: token.token,
          })
        }
      }
      //
      console.log('deleting token')
      await db.delete('token', { user_id: token.user_id, type: token.type, token: token.token })
    }
  })();
