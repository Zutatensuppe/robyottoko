import type { ModuleDefinition} from '../types'
import { MODULE_NAME } from '../enums'

export const moduleDefinitions: ModuleDefinition[] = [
  {
    module: MODULE_NAME.SR,
    title: 'Song Request',
  },
  {
    module: MODULE_NAME.GENERAL,
    title: 'General',
  },
  {
    module: MODULE_NAME.AVATAR,
    title: 'Avatar',
  },
  {
    module: MODULE_NAME.SPEECH_TO_TEXT,
    title: 'Speech-to-Text',
  },
  {
    module: MODULE_NAME.POMO,
    title: 'Pomo',
  },
  {
    module: MODULE_NAME.VOTE,
    title: 'Vote',
  },
  {
    module: MODULE_NAME.DRAWCAST,
    title: 'Drawcast',
  },
]
