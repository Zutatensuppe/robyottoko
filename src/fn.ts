import childProcess from 'child_process'
import fs from 'fs'
import xhr from './net/xhr'
import { SECOND, MINUTE, HOUR, DAY, MONTH, YEAR, logger, getRandom, getRandomInt, daysUntil, hash, unicodeLength, mustParseHumanDuration } from './common/fn'

import {
  Command, GlobalVariable, RawCommand, TwitchChatContext,
  TwitchChatClient, FunctionCommand, Module, CommandTrigger,
  Bot, ChatMessageContext, CommandEffectType, CommandVariableChange, DictSearchResponseDataEntry, CountdownActionType, CountdownAction, CountdownCommandData,
} from './types'
import { User } from './repo/Users'
import TwitchHelixClient, { TwitchHelixUserSearchResponseDataEntry } from './services/TwitchHelixClient'
import JishoOrg from './services/JishoOrg'
import DictCc from './services/DictCc'
import config from './config'
import Madochan from './services/Madochan'

const log = logger('fn.ts')

function mimeToExt(mime: string) {
  if (/image\//.test(mime)) {
    return mime.replace('image/', '')
  }
  return ''
}

function decodeBase64Image(base64Str: string) {
  const matches = base64Str.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 string')
  }
  return {
    type: matches[1],
    data: Buffer.from(matches[2], 'base64'),
  }
}

export const safeFileName = (string: string): string => {
  return string.replace(/[^a-zA-Z0-9.-]/g, '_')
}

const fnRandom = <T>(values: T[]) => (): T => getRandom(values)

const sleep = (ms: number) => {
  return new Promise((resolve, _reject) => {
    setTimeout(resolve, ms)
  })
}

const sayFn = (
  client: TwitchChatClient,
  target: string | null,
) => (
  msg: string
) => {
    // in case no target is given we use the configured channels
    // we should be able to use client.channels or client.getChannels()
    // but they are always empty :/
    const targets = target ? [target] : client.opts.channels
    targets.forEach(t => {
      // TODO: fix this somewhere else?
      // client can only say things in lowercase channels
      t = t.toLowerCase()
      log.info(`saying in ${t}: ${msg}`)
      client.say(t, msg).catch((e: any) => {
        log.info(e)
      })
    })
  }

export const parseCommandFromTriggerAndMessage = (
  msg: string,
  trigger: CommandTrigger,
): RawCommand | null => {
  if (trigger.type !== 'command') {
    return null
  }
  return parseCommandFromCmdAndMessage(
    msg,
    trigger.data.command,
    trigger.data.commandExact,
  )
}

export const normalizeChatMessage = (text: string): string => {
  // strip control chars
  text = text.replace(/\p{C}/gu, '')

  // other common tasks are to normalize newlines and other whitespace

  // normalize newline
  text = text.replace(/\n\r/g, '\n')
  text = text.replace(/\p{Zl}/gu, '\n')
  text = text.replace(/\p{Zp}/gu, '\n')

  // normalize space
  text = text.replace(/\p{Zs}/gu, ' ')

  return text.trim()
}

export const parseCommandFromCmdAndMessage = (
  msg: string,
  command: string,
  commandExact: boolean,
): RawCommand | null => {
  if (
    msg === command
    || (!commandExact && msg.startsWith(command + ' '))
  ) {
    const name = msg.substring(0, command.length).trim()
    const args = msg.substring(command.length).trim().split(' ').filter(s => !!s)
    return { name, args }
  }
  return null
}

const _toInt = (value: any) => parseInt(`${value}`, 10)

const _increase = (value: any, by: any) => (_toInt(value) + _toInt(by))

const _decrease = (value: any, by: any) => (_toInt(value) - _toInt(by))


type DictFn = (phrase: string) => Promise<DictSearchResponseDataEntry[]>

const jishoOrgLookup = async (
  phrase: string,
) => {
  const data = await JishoOrg.searchWord(phrase)
  if (data.length === 0) {
    return []
  }
  const e = data[0]
  const j = e.japanese[0]
  const d = e.senses[0].english_definitions

  return [{
    from: phrase,
    to: [`${j.word} (${j.reading}) ${d.join(', ')}`],
  }]
}

const LANG_TO_FN: Record<string, DictFn> = {
  ja: jishoOrgLookup,
}
for (const key of Object.keys(DictCc.LANG_TO_URL_MAP)) {
  LANG_TO_FN[key] = (phrase) => DictCc.searchWord(phrase, key)
}

const isTwitchClipUrl = (url: string): boolean => {
  return !!url.match(/^https:\/\/clips\.twitch\.tv\/.+/)
}

const downloadVideo = async (originalUrl: string): Promise<string> => {
  // if video url looks like a twitch clip url, dl it first
  const filename = `${hash(originalUrl)}-clip.mp4`
  const outfile = `./data/uploads/${filename}`
  if (!fs.existsSync(outfile)) {
    log.debug({ outfile }, 'downloading the video')
    const child = childProcess.execFile(
      config.youtubeDlBinary,
      [originalUrl, '-o', outfile]
    )
    await new Promise((resolve) => {
      child.on('close', resolve)
    })
  } else {
    log.debug({ outfile }, 'video exists')
  }
  return `/uploads/${filename}`
}

const applyEffects = async (
  originalCmd: FunctionCommand,
  contextModule: Module,
  rawCmd: RawCommand | null,
  context: TwitchChatContext | null,
) => {
  if (!originalCmd.effects) {
    return
  }
  const variables = contextModule.bot.getRepos().variables
  const doReplace = async (value: string) => await doReplacements(value, rawCmd, context, originalCmd, contextModule.bot, contextModule.user)

  for (const effect of originalCmd.effects) {
    // TODO: extract each if to some class
    if (effect.type === CommandEffectType.VARIABLE_CHANGE) {

      const variableChange = effect.data as CommandVariableChange

      const op = variableChange.change
      const name = await doReplace(variableChange.name)
      const value = await doReplace(variableChange.value)

      // check if there is a local variable for the change
      if (originalCmd.variables) {
        const idx = originalCmd.variables.findIndex(v => (v.name === name))
        if (idx !== -1) {
          if (op === 'set') {
            originalCmd.variables[idx].value = value
          } else if (op === 'increase_by') {
            originalCmd.variables[idx].value = _increase(originalCmd.variables[idx].value, value)
          } else if (op === 'decrease_by') {
            originalCmd.variables[idx].value = _decrease(originalCmd.variables[idx].value, value)
          }
          continue
        }
      }

      const globalVars: GlobalVariable[] = await variables.all(contextModule.user.id)
      const idx = globalVars.findIndex(v => (v.name === name))
      if (idx !== -1) {
        if (op === 'set') {
          await variables.set(contextModule.user.id, name, value)
        } else if (op === 'increase_by') {
          await variables.set(contextModule.user.id, name, _increase(globalVars[idx].value, value))
        } else if (op === 'decrease_by') {
          await variables.set(contextModule.user.id, name, _decrease(globalVars[idx].value, value))
        }
        //
        continue
      }

    } else if (effect.type === CommandEffectType.CHAT) {

      const texts = effect.data.text
      const say = contextModule.bot.sayFn(contextModule.user, contextModule.user.twitch_login)
      say(await doReplacements(getRandom(texts), rawCmd, context, originalCmd, contextModule.bot, contextModule.user))

    } else if (effect.type === CommandEffectType.DICT_LOOKUP) {

      const say = contextModule.bot.sayFn(contextModule.user, contextModule.user.twitch_login)
      const tmpLang = await doReplacements(effect.data.lang, rawCmd, context, originalCmd, contextModule.bot, contextModule.user)
      const dictFn = LANG_TO_FN[tmpLang] || null
      if (!dictFn) {
        say(`Sorry, language not supported: "${tmpLang}"`)
        continue
      }

      // if no phrase is setup, use all args given to command
      const phrase = effect.data.phrase === '' ? '$args()' : effect.data.phrase
      const tmpPhrase = await doReplacements(phrase, rawCmd, context, originalCmd, contextModule.bot, contextModule.user)

      const items = await dictFn(tmpPhrase)
      if (items.length === 0) {
        say(`Sorry, I didn't find anything for "${tmpPhrase}" in language "${tmpLang}"`)
        continue
      }
      for (const item of items) {
        say(`Phrase "${item.from}": ${item.to.join(", ")}`)
      }

    } else if (effect.type === CommandEffectType.EMOTES) {

      contextModule.bot.getWebSocketServer().notifyAll([contextModule.user.id], 'general', {
        event: 'emotes',
        data: effect.data,
      })

    } else if (effect.type === CommandEffectType.MEDIA) {

      const doReplaces = async (str: string) => {
        return await doReplacements(str, rawCmd, context, originalCmd, contextModule.bot, contextModule.user)
      }
      const data = effect.data
      data.image_url = await doReplaces(data.image_url)
      if (data.video.url) {
        log.debug({ url: data.video.url }, 'video url is defined')
        data.video.url = await doReplaces(data.video.url)
        if (!data.video.url) {
          log.debug('no video url found')
        } else if (isTwitchClipUrl(data.video.url)) {
          // video url looks like a twitch clip url, dl it first
          log.debug({ url: data.video.url }, 'twitch clip found')
          data.video.url = await downloadVideo(data.video.url)
        } else {
          // otherwise assume it is already a playable video url
          // TODO: youtube videos maybe should also be downloaded
          log.debug('video is assumed to be directly playable via html5 video element')
        }
      }

      contextModule.bot.getWebSocketServer().notifyAll([contextModule.user.id], 'general', {
        event: 'playmedia',
        data: data,
        id: originalCmd.id
      })

    } else if (effect.type === CommandEffectType.MADOCHAN) {

      const model = `${effect.data.model}` || Madochan.defaultModel
      const weirdness = parseInt(effect.data.weirdness, 10) || Madochan.defaultWeirdness

      const say = contextModule.bot.sayFn(contextModule.user, contextModule.user.twitch_login)
      if (rawCmd) {
        const definition = rawCmd.args.join(' ')
        if (definition) {
          say(`Generating word for "${definition}"...`)
          try {
            const data = await Madochan.createWord({ model, weirdness, definition })
            if (data.word === '') {
              say(`Sorry, I could not generate a word :("`)
            } else {
              say(`"${definition}": ${data.word}`)
            }
          } catch (e: any) {
            log.error({ e })
            say(`Error occured, unable to generate a word :("`)
          }
        }
      }

    } else if (effect.type === CommandEffectType.SET_CHANNEL_TITLE) {

      const setChannelTitle = async () => {
        const helixClient = contextModule.bot.getUserTwitchClientManager(contextModule.user).getHelixClient()
        if (!rawCmd || !context || !helixClient) {
          log.info({
            rawCmd: rawCmd,
            context: context,
            helixClient,
          }, 'unable to execute setChannelTitle, client, command, context, or helixClient missing')
          return
        }
        const say = contextModule.bot.sayFn(contextModule.user, contextModule.user.twitch_login)
        const title = effect.data.title === '' ? '$args()' : effect.data.title
        const tmpTitle = await doReplacements(title, rawCmd, context, originalCmd, contextModule.bot, contextModule.user)
        if (tmpTitle === '') {
          const info = await helixClient.getChannelInformation(contextModule.user.twitch_id)
          if (info) {
            say(`Current title is "${info.title}".`)
          } else {
            say(`❌ Unable to determine current title.`)
          }
          return
        }

        // helix api returns 204 status code even if the title is too long and
        // cant actually be set. but there is no error returned in that case :(
        const len = unicodeLength(tmpTitle)
        const max = 140
        if (len > max) {
          say(`❌ Unable to change title because it is too long (${len}/${max} characters).`)
          return
        }

        const accessToken = await contextModule.bot.getRepos().oauthToken.getMatchingAccessToken(contextModule.user)
        if (!accessToken) {
          say(`❌ Not authorized to change title.`)
          return
        }

        const resp = await helixClient.modifyChannelInformation(
          accessToken,
          { title: tmpTitle },
          contextModule.bot,
          contextModule.user,
        )
        if (resp?.status === 204) {
          say(`✨ Changed title to "${tmpTitle}".`)
        } else {
          say('❌ Unable to change title.')
        }
      }

      await setChannelTitle()

    } else if (effect.type === CommandEffectType.SET_CHANNEL_GAME_ID) {

      const setChannelGameId = async () => {
        const helixClient = contextModule.bot.getUserTwitchClientManager(contextModule.user).getHelixClient()
        if (!rawCmd || !context || !helixClient) {
          log.info({
            rawCmd: rawCmd,
            context: context,
            helixClient,
          }, 'unable to execute setChannelGameId, client, command, context, or helixClient missing')
          return
        }
        const say = contextModule.bot.sayFn(contextModule.user, contextModule.user.twitch_login)
        const gameId = effect.data.game_id === '' ? '$args()' : effect.data.game_id
        const tmpGameId = await doReplacements(gameId, rawCmd, context, originalCmd, contextModule.bot, contextModule.user)
        if (tmpGameId === '') {
          const info = await helixClient.getChannelInformation(contextModule.user.twitch_id)
          if (info) {
            say(`Current category is "${info.game_name}".`)
          } else {
            say(`❌ Unable to determine current category.`)
          }
          return
        }

        const category = await helixClient.searchCategory(tmpGameId)
        if (!category) {
          say('🔎 Category not found.')
          return
        }

        const accessToken = await contextModule.bot.getRepos().oauthToken.getMatchingAccessToken(contextModule.user)
        if (!accessToken) {
          say(`❌ Not authorized to update category.`)
          return
        }

        const resp = await helixClient.modifyChannelInformation(
          accessToken,
          { game_id: category.id },
          contextModule.bot,
          contextModule.user,
        )
        if (resp?.status === 204) {
          say(`✨ Changed category to "${category.name}".`)
        } else {
          say('❌ Unable to update category.')
        }
      }

      await setChannelGameId()

    } else if (effect.type === CommandEffectType.ADD_STREAM_TAGS) {

      const addStreamTags = async () => {
        const helixClient = contextModule.bot.getUserTwitchClientManager(contextModule.user).getHelixClient()
        if (!rawCmd || !context || !helixClient) {
          log.info({
            rawCmd: rawCmd,
            context: context,
            helixClient,
          }, 'unable to execute addStreamTags, client, command, context, or helixClient missing')
          return
        }
        const say = contextModule.bot.sayFn(contextModule.user, contextModule.user.twitch_login)
        const tag = effect.data.tag === '' ? '$args()' : effect.data.tag
        const tmpTag = await doReplacements(tag, rawCmd, context, originalCmd, contextModule.bot, contextModule.user)
        const tagsResponse = await helixClient.getStreamTags(contextModule.user.twitch_id)
        if (!tagsResponse) {
          say(`❌ Unable to fetch current tags.`)
          return
        }
        if (tmpTag === '') {
          const names = tagsResponse.data.map(entry => entry.localization_names['en-us'])
          say(`Current tags: ${names.join(', ')}`)
          return
        }
        const idx = findIdxFuzzy(config.twitch.manual_tags, tmpTag, (item) => item.name)
        if (idx === -1) {
          say(`❌ No such tag: ${tmpTag}`)
          return
        }
        const tagEntry = config.twitch.manual_tags[idx]
        const newTagIds = tagsResponse.data.map(entry => entry.tag_id)
        if (newTagIds.includes(tagEntry.id)) {
          const names = tagsResponse.data.map(entry => entry.localization_names['en-us'])
          say(`✨ Tag ${tagEntry.name} already exists, current tags: ${names.join(', ')}`)
          return
        }

        newTagIds.push(tagEntry.id)
        const newSettableTagIds: string[] = newTagIds.filter(tagId => !config.twitch.auto_tags.find(t => t.id === tagId))
        if (newSettableTagIds.length > 5) {
          const names = tagsResponse.data.map(entry => entry.localization_names['en-us'])
          say(`❌ Too many tags already exist, current tags: ${names.join(', ')}`)
          return
        }

        const accessToken = await contextModule.bot.getRepos().oauthToken.getMatchingAccessToken(contextModule.user)
        if (!accessToken) {
          say(`❌ Not authorized to add tag: ${tagEntry.name}`)
          return
        }

        const resp = await helixClient.replaceStreamTags(
          accessToken,
          newSettableTagIds,
          contextModule.bot,
          contextModule.user,
        )
        if (!resp || resp.status < 200 || resp.status >= 300) {
          log.error(resp)
          say(`❌ Unable to add tag: ${tagEntry.name}`)
          return
        }
        say(`✨ Added tag: ${tagEntry.name}`)
      }

      await addStreamTags()

    } else if (effect.type === CommandEffectType.REMOVE_STREAM_TAGS) {

      const removeStreamTags = async () => {
        const helixClient = contextModule.bot.getUserTwitchClientManager(contextModule.user).getHelixClient()
        if (!rawCmd || !context || !helixClient) {
          log.info({
            rawCmd: rawCmd,
            context: context,
            helixClient,
          }, 'unable to execute removeStreamTags, client, command, context, or helixClient missing')
          return
        }
        const say = contextModule.bot.sayFn(contextModule.user, contextModule.user.twitch_login)
        const tag = effect.data.tag === '' ? '$args()' : effect.data.tag
        const tmpTag = await doReplacements(tag, rawCmd, context, originalCmd, contextModule.bot, contextModule.user)
        const tagsResponse = await helixClient.getStreamTags(contextModule.user.twitch_id)
        if (!tagsResponse) {
          say(`❌ Unable to fetch current tags.`)
          return
        }
        if (tmpTag === '') {
          const names = tagsResponse.data.map(entry => entry.localization_names['en-us'])
          say(`Current tags: ${names.join(', ')}`)
          return
        }
        const manualTags = tagsResponse.data.filter(entry => !entry.is_auto)
        const idx = findIdxFuzzy(manualTags, tmpTag, (item) => item.localization_names['en-us'])
        if (idx === -1) {
          const autoTags = tagsResponse.data.filter(entry => entry.is_auto)
          const idx = findIdxFuzzy(autoTags, tmpTag, (item) => item.localization_names['en-us'])
          if (idx === -1) {
            say(`❌ No such tag is currently set: ${tmpTag}`)
          } else {
            say(`❌ Unable to remove automatic tag: ${autoTags[idx].localization_names['en-us']}`)
          }
          return
        }
        const newTagIds = manualTags.filter((_value, index) => index !== idx).map(entry => entry.tag_id)
        const newSettableTagIds: string[] = newTagIds.filter(tagId => !config.twitch.auto_tags.find(t => t.id === tagId))

        const accessToken = await contextModule.bot.getRepos().oauthToken.getMatchingAccessToken(contextModule.user)
        if (!accessToken) {
          say(`❌ Not authorized to remove tag: ${manualTags[idx].localization_names['en-us']}`)
          return
        }

        const resp = await helixClient.replaceStreamTags(
          accessToken,
          newSettableTagIds,
          contextModule.bot,
          contextModule.user,
        )
        if (!resp || resp.status < 200 || resp.status >= 300) {
          say(`❌ Unable to remove tag: ${manualTags[idx].localization_names['en-us']}`)
          return
        }
        say(`✨ Removed tag: ${manualTags[idx].localization_names['en-us']}`)
      }

      await removeStreamTags()

    } else if (effect.type === CommandEffectType.CHATTERS) {

      const chatters = async () => {
        const helixClient = contextModule.bot.getUserTwitchClientManager(contextModule.user).getHelixClient()
        if (!context || !helixClient) {
          log.info({
            context: context,
            helixClient,
          }, 'unable to execute chatters command, client, context, or helixClient missing')
          return
        }

        const say = contextModule.bot.sayFn(contextModule.user, contextModule.user.twitch_login)

        const stream = await helixClient.getStreamByUserId(contextModule.user.twitch_id)
        if (!stream) {
          say(`It seems this channel is not live at the moment...`)
          return
        }

        const userNames = await contextModule.bot.getRepos().chatLog.getChatters(contextModule.user.twitch_id, new Date(stream.started_at))
        if (userNames.length === 0) {
          say(`It seems nobody chatted? :(`)
          return
        }

        say(`Thank you for chatting!`)
        joinIntoChunks(userNames, ', ', 500).forEach(msg => {
          say(msg)
        })
      }

      await chatters()

    } else if (effect.type === CommandEffectType.COUNTDOWN) {

      const countdown = async () => {
        const sayFn = contextModule.bot.sayFn(contextModule.user, contextModule.user.twitch_login)
        const doReplacements2 = async (text: string) => {
          return await doReplacements(text, rawCmd, context, originalCmd, contextModule.bot, contextModule.user)
        }
        const say = async (text: string) => {
          return sayFn(await doReplacements2(text))
        }
        const parseDuration = async (str: string) => {
          return mustParseHumanDuration(await doReplacements2(str))
        }

        const settings: CountdownCommandData = effect.data

        const t = (settings.type || 'auto')

        let actionDefs: CountdownAction[] = []
        if (t === 'auto') {
          const steps = parseInt(await doReplacements2(`${settings.steps}`), 10)
          const msgStep = settings.step || "{step}"
          const msgIntro = settings.intro || null
          const msgOutro = settings.outro || null

          if (msgIntro) {
            actionDefs.push({ type: CountdownActionType.TEXT, value: msgIntro.replace(/\{steps\}/g, `${steps}`) })
            actionDefs.push({ type: CountdownActionType.DELAY, value: settings.interval || '1s' })
          }

          for (let step = steps; step > 0; step--) {
            actionDefs.push({
              type: CountdownActionType.TEXT,
              value: msgStep.replace(/\{steps\}/g, `${steps}`).replace(/\{step\}/g, `${step}`),
            })
            actionDefs.push({ type: CountdownActionType.DELAY, value: settings.interval || '1s' })
          }

          if (msgOutro) {
            actionDefs.push({ type: CountdownActionType.TEXT, value: msgOutro.replace(/\{steps\}/g, `${steps}`) })
          }
        } else if (t === 'manual') {
          actionDefs = settings.actions
        }

        const actions = []
        for (const a of actionDefs) {
          if (a.type === CountdownActionType.TEXT) {
            actions.push(async () => say(`${a.value}`))
          } else if (a.type === CountdownActionType.MEDIA) {
            actions.push(async () => {
              contextModule.bot.getWebSocketServer().notifyAll([contextModule.user.id], 'general', {
                event: 'playmedia',
                data: a.value,
              })
            })
          } else if (a.type === CountdownActionType.DELAY) {
            let duration: number
            try {
              duration = (await parseDuration(`${a.value}`)) || 0
            } catch (e: any) {
              log.error({ message: e.message, value: a.value })
              return
            }
            actions.push(async () => await sleep(duration))
          }
        }

        for (let i = 0; i < actions.length; i++) {
          await actions[i]()
        }
      }

      await countdown()

    } else {

      // nothing :(

    }
  }
  contextModule.saveCommands()
}

async function replaceAsync(
  str: string,
  regex: RegExp,
  asyncFn: (...args: string[]) => Promise<string>,
): Promise<string> {
  const promises: Promise<string>[] = []
  str.replace(regex, (match: string, ...args: string[]): string => {
    const promise = asyncFn(match, ...args)
    promises.push(promise)
    return match
  })
  if (!promises.length) {
    return str
  }
  const data = await Promise.all(promises)
  return str.replace(regex, () => data.shift() || '')
}

const getTwitchUser = async (
  usernameOrDisplayname: string,
  helixClient: TwitchHelixClient,
  bot: Bot,
): Promise<TwitchHelixUserSearchResponseDataEntry | null> => {
  const twitchUser = await helixClient.getUserByName(usernameOrDisplayname)
  if (twitchUser) {
    return twitchUser
  }
  // no twitchUser found, maybe the username is not the username but the display name
  // look up the username in the local chat log
  // TODO: keep a record of userNames -> userDisplayNames in db instead
  //       of relying on the chat log
  const username = await bot.getRepos().chatLog.getUsernameByUserDisplayName(usernameOrDisplayname)
  if (username === null || username === usernameOrDisplayname) {
    return null
  }
  return await helixClient.getUserByName(username)
}

export const doReplacements = async (
  text: string,
  rawCmd: RawCommand | null,
  context: TwitchChatContext | null,
  originalCmd: Command | FunctionCommand | null,
  bot: Bot | null,
  user: User | null,
) => {
  const doReplace = async (value: string) => await doReplacements(value, rawCmd, context, originalCmd, bot, user)

  const replaces: { regex: RegExp, replacer: (...args: string[]) => Promise<string> }[] = [
    {
      regex: /\$args(?:\((\d*)(:?)(\d*)\))?/g,
      replacer: async (_m0: string, m1: string, m2: string, m3: string): Promise<string> => {
        if (!rawCmd) {
          return ''
        }
        let from = 0
        let to = rawCmd.args.length
        if (m1 !== '' && m1 !== undefined) {
          from = parseInt(m1, 10)
          to = from
        }
        if (m2 !== '' && m1 !== undefined) {
          to = rawCmd.args.length - 1
        }
        if (m3 !== '' && m1 !== undefined) {
          to = parseInt(m3, 10)
        }
        if (from === to) {
          const index = from
          if (index < rawCmd.args.length) {
            return rawCmd.args[index]
          }
          return ''
        }
        return rawCmd.args.slice(from, to + 1).join(' ')
      },
    },
    {
      regex: /\$daysuntil\("([^"]+)"\)/g,
      replacer: async (_m0: string, m1: string): Promise<string> => {
        return daysUntil(m1, '{days}', '{days}', '{days}', '???')
      },
    },
    {
      regex: /\$daysuntil\("([^"]+)",\s*?"([^"]*)"\s*,\s*?"([^"]*)"\s*,\s*?"([^"]*)"\s*\)/g,
      replacer: async (_m0: string, m1: string, m2: string, m3: string, m4: string): Promise<string> => {
        return daysUntil(m1, m2, m3, m4, '???')
      },
    },
    {
      regex: /\$rand\(\s*(\d+)?\s*,\s*?(\d+)?\s*\)/g,
      replacer: async (_m0: string, m1: string, m2: string): Promise<string> => {
        const min = typeof m1 === 'undefined' ? 1 : parseInt(m1, 10)
        const max = typeof m2 === 'undefined' ? 100 : parseInt(m2, 10)
        return `${getRandomInt(min, max)}`
      },
    },
    {
      regex: /\$var\(([^)]+)\)/g,
      replacer: async (_m0: string, m1: string): Promise<string> => {
        if (!originalCmd || !originalCmd.variables) {
          return ''
        }
        if (!bot || !user) {
          return ''
        }
        const v = originalCmd.variables.find(v => v.name === m1)
        const val = v ? v.value : (await bot.getRepos().variables.get(user.id, m1))
        return val === null ? '' : String(val)
      },
    },
    {
      regex: /\$bot\.(version|date|website|github|features)/g,
      replacer: async (_m0: string, m1: string): Promise<string> => {
        if (!bot) {
          return ''
        }
        if (m1 === 'version') {
          return bot.getBuildVersion()
        }
        if (m1 === 'date') {
          return bot.getBuildDate()
        }
        if (m1 === 'website') {
          return 'https://hyottoko.club'
        }
        if (m1 === 'github') {
          return 'https://github.com/zutatensuppe/robyottoko'
        }
        if (m1 === 'features') {
          return 'this twitch bot has commands, media commands, timers, translation commands, user-submitted drawings widget, png-tuber, song requests, captions (speech-to-text)!'
        }
        return '';
      },
    },
    {
      regex: /\$user(?:\(([^)]+)\)|())\.(name|username|twitch_url|profile_image_url|recent_clip_url|last_stream_category)/g,
      replacer: async (_m0: string, m1: string, m2: string, m3): Promise<string> => {
        if (!context) {
          return ''
        }

        const username = m1 || m2 || context.username
        if (username === context.username && m3 === 'name') {
          return String(context['display-name'])
        }

        if (username === context.username && m3 === 'username') {
          return String(context.username)
        }

        if (username === context.username && m3 === 'twitch_url') {
          return String(`twitch.tv/${context.username}`)
        }

        if (!bot || !user) {
          log.info('no bot, no user, no watch')
          return ''
        }
        const helixClient = bot.getUserTwitchClientManager(user).getHelixClient()
        if (!helixClient) {
          return ''
        }

        const twitchUser = await getTwitchUser(username, helixClient, bot)
        if (!twitchUser) {
          log.info('no twitch user found', username)
          return ''
        }
        if (m3 === 'name') {
          return String(twitchUser.display_name)
        }
        if (m3 === 'username') {
          return String(twitchUser.login)
        }
        if (m3 === 'twitch_url') {
          return String(`twitch.tv/${twitchUser.login}`)
        }
        if (m3 === 'profile_image_url') {
          return String(twitchUser.profile_image_url)
        }
        if (m3 === 'recent_clip_url') {
          const end = new Date()
          const start = new Date(end.getTime() - 30 * DAY)
          const maxDurationSeconds = 30

          const clip = await helixClient.getClipByUserId(
            twitchUser.id,
            start.toISOString(),
            end.toISOString(),
            maxDurationSeconds,
          )
          return String(clip?.embed_url || '')
        }
        if (m3 === 'last_stream_category') {
          const channelInfo = await helixClient.getChannelInformation(twitchUser.id)
          return String(channelInfo?.game_name || '');
        }
        return ''
      },
    },
    {
      regex: /\$customapi\(([^$)]*)\)\['([A-Za-z0-9_ -]+)'\]/g,
      replacer: async (_m0: string, m1: string, m2: string): Promise<string> => {
        try {
          const url = await doReplace(m1)
          // both of getText and JSON.parse can fail, so everything in a single try catch
          const resp = await xhr.get(url)
          const txt = await resp.text()
          return String(JSON.parse(txt)[m2])
        } catch (e: any) {
          log.error(e)
          return ''
        }
      },
    },
    {
      regex: /\$customapi\(([^$)]*)\)/g,
      replacer: async (_m0: string, m1: string): Promise<string> => {
        try {
          const url = await doReplace(m1)
          const resp = await xhr.get(url)
          return await resp.text()
        } catch (e: any) {
          log.error(e)
          return ''
        }
      },
    },
    {
      regex: /\$urlencode\(([^$)]*)\)/g,
      replacer: async (_m0: string, m1: string): Promise<string> => {
        const value = await doReplace(m1)
        return encodeURIComponent(value)
      },
    },
    {
      regex: /\$calc\((\d+)([*/+-])(\d+)\)/g,
      replacer: async (_m0: string, arg1: string, op: string, arg2: string): Promise<string> => {
        const arg1Int = parseInt(arg1, 10)
        const arg2Int = parseInt(arg2, 10)
        switch (op) {
          case '+':
            return `${(arg1Int + arg2Int)}`
          case '-':
            return `${(arg1Int - arg2Int)}`
          case '/':
            return `${(arg1Int / arg2Int)}`
          case '*':
            return `${(arg1Int * arg2Int)}`
        }
        return ''
      },
    },
  ]
  let replaced = String(text)
  let orig
  do {
    orig = replaced
    for (const replace of replaces) {
      replaced = await replaceAsync(
        replaced,
        replace.regex,
        replace.replacer
      )
    }
  } while (orig !== replaced)
  return replaced
}

export const joinIntoChunks = (
  strings: string[],
  glue: string,
  maxChunkLen: number,
) => {
  const chunks = []
  let chunk = []
  for (let i = 0; i < strings.length; i++) {
    chunk.push(strings[i])
    if (chunk.join(glue).length > maxChunkLen) {
      chunk.pop()
      chunks.push(chunk.join(glue))
      chunk = []
      chunk.push(strings[i])
    }
  }
  chunks.push(chunk.join(glue))
  return chunks
}

export const parseISO8601Duration = (
  duration: string
): number => {
  // P(n)Y(n)M(n)DT(n)H(n)M(n)S
  const m = duration.match(/^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/)
  if (!m) {
    return 0
  }

  const Y = m[1] ? parseInt(m[1], 10) : 0
  const Mo = m[2] ? parseInt(m[2], 10) : 0
  const D = m[3] ? parseInt(m[3], 10) : 0
  const H = m[4] ? parseInt(m[4], 10) : 0
  const M = m[5] ? parseInt(m[5], 10) : 0
  const S = m[6] ? parseInt(m[6], 10) : 0

  // note: we just calculate month as having 30 days,
  // because knowledge about what exact year it is is missing
  return (
    (S * SECOND)
    + (M * MINUTE)
    + (H * HOUR)
    + (D * DAY)
    + (Mo * MONTH)
    + (Y * YEAR)
  )
}

export const findIdxFuzzy = <T>(
  array: T[],
  search: string,
  keyFn: (item: T) => string = String
) => {
  let idx = findIdxBySearchExact(array, search, keyFn)
  if (idx === -1) {
    idx = findIdxBySearchExactStartsWith(array, search, keyFn)
  }
  if (idx === -1) {
    idx = findIdxBySearchExactWord(array, search, keyFn)
  }
  if (idx === -1) {
    idx = findIdxBySearchExactPart(array, search, keyFn)
  }
  if (idx === -1) {
    idx = findIdxBySearchInOrder(array, search, keyFn)
  }
  if (idx === -1) {
    idx = findIdxBySearch(array, search, keyFn)
  }
  return idx
}

export const accentFolded = (str: string): string => {
  // @see https://stackoverflow.com/a/37511463/392905 + comments about ł
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\u0142/g, "l")
}

export const findShortestIdx = <T>(
  array: T[],
  indexes: number[],
  keyFn: (item: T) => string
) => {
  let shortestIdx = -1;
  let shortest = 0;
  array.forEach((item, idx) => {
    const len = keyFn(item).length
    if (indexes.includes(idx) && (shortestIdx === -1 || len < shortest)) {
      shortest = len
      shortestIdx = idx
    }
  })
  return shortestIdx
}

export const findIdxBySearchExact = <T>(
  array: T[],
  search: string,
  keyFn: (item: T) => string = String
) => {
  const searchLower = accentFolded(search.toLowerCase())
  const indexes: number[] = []
  array.forEach((item, index) => {
    if (accentFolded(keyFn(item).toLowerCase()) === searchLower) {
      indexes.push(index)
    }
  })
  return findShortestIdx(array, indexes, keyFn)
}

export const findIdxBySearchExactStartsWith = <T>(
  array: T[],
  search: string,
  keyFn: (item: T) => string = String
) => {
  const searchLower = accentFolded(search.toLowerCase())
  const indexes: number[] = []
  array.forEach((item, index) => {
    if (accentFolded(keyFn(item).toLowerCase()).startsWith(searchLower)) {
      indexes.push(index)
    }
  })
  return findShortestIdx(array, indexes, keyFn)
}

export const findIdxBySearchExactWord = <T>(
  array: T[],
  search: string,
  keyFn: (item: T) => string = String
) => {
  const searchLower = accentFolded(search.toLowerCase())
  const indexes: number[] = []
  array.forEach((item, index) => {
    const keyLower = accentFolded(keyFn(item).toLowerCase())
    const idx = keyLower.indexOf(searchLower)
    if (idx === -1) {
      return
    }
    const idxBefore = idx - 1
    if (idxBefore >= 0 && keyLower[idxBefore].match(/\w/)) {
      return
    }
    const idxAfter = idx + searchLower.length
    if (idxAfter < keyLower.length && keyLower[idxAfter].match(/\w/)) {
      return
    }
    indexes.push(index)
  })
  return findShortestIdx(array, indexes, keyFn)
}

export const findIdxBySearchExactPart = <T>(
  array: T[],
  search: string,
  keyFn: (item: T) => string = String
) => {
  const searchLower = accentFolded(search.toLowerCase())
  const indexes: number[] = []
  array.forEach((item, index) => {
    if (accentFolded(keyFn(item).toLowerCase()).indexOf(searchLower) !== -1) {
      indexes.push(index)
    }
  })
  return findShortestIdx(array, indexes, keyFn)
}

export const findIdxBySearchInOrder = <T>(
  array: T[],
  search: string,
  keyFn: (item: T) => string = String
) => {
  const split = accentFolded(search).split(/\s+/)
  const regexArgs = split.map(arg => arg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(regexArgs.join('.*'), 'i')
  const indexes: number[] = []
  array.forEach((item, index) => {
    if (accentFolded(keyFn(item)).match(regex)) {
      indexes.push(index)
    }
  })
  return findShortestIdx(array, indexes, keyFn)
}

export const findIdxBySearch = <T>(
  array: T[],
  search: string,
  keyFn: (item: T) => string = String
) => {
  const split = accentFolded(search).split(/\s+/)
  const regexArgs = split.map(arg => arg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regexes = regexArgs.map(arg => new RegExp(arg, 'i'))
  return array.findIndex(item => {
    const str = accentFolded(keyFn(item))
    for (const regex of regexes) {
      if (!str.match(regex)) {
        return false
      }
    }
    return true
  })
}

/**
 * Determines new volume from an input and a current volume.
 * If the input cannot be parsed, the current volume is returned.
 */
export const determineNewVolume = (
  input: string,
  currentVal: number,
): number => {
  if (input.match(/^\+\d+$/)) {
    // prefixed with + means increase volume by an amount
    const val = parseInt(input.substring(1), 10)
    if (isNaN(val)) {
      return currentVal
    }
    return currentVal + val
  }
  if (input.match(/^-\d+$/)) {
    // prefixed with - means decrease volume by an amount
    const val = parseInt(input.substring(1), 10)
    if (isNaN(val)) {
      return currentVal
    }
    return currentVal - val
  }
  // no prefix, just set the volume to the input
  const val = parseInt(input, 10)
  if (isNaN(val)) {
    return currentVal
  }
  return val
}

export const extractEmotes = (context: ChatMessageContext) => {
  const emotes: {
    url: string
  }[] = []
  const matches = context.msg.match(/(\p{EPres}|\p{ExtPict})(\u200d(\p{EPres}|\p{ExtPict})\ufe0f?)*/gu)
  matches?.forEach((m: string) => {
    // @ts-ignore
    const code = [...m].map(e => e.codePointAt(0).toString(16)).join(`-`)
    emotes.push({ url: `https://twemoji.maxcdn.com/v/14.0.2/72x72/${code}.png` })
  })
  if (context.context.emotes) {
    for (const emoteId in context.context.emotes) {
      for (let i = 0; i < context.context.emotes[emoteId].length; i++) {
        emotes.push({ url: `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/2.0` })
      }
    }
  }
  return emotes
}

export const getChannelPointsCustomRewards = async (
  bot: Bot,
  user: User
): Promise<Record<string, string[]>> => {
  const helixClient = bot.getUserTwitchClientManager(user).getHelixClient()
  if (!helixClient) {
    log.info('getChannelPointsCustomRewards: no helix client')
    return {}
  }
  return await helixClient.getAllChannelPointsCustomRewards(bot, user)
}

export default {
  applyEffects,
  extractEmotes,
  logger,
  mimeToExt,
  decodeBase64Image,
  safeFileName,
  sayFn,
  normalizeChatMessage,
  parseCommandFromTriggerAndMessage,
  parseCommandFromCmdAndMessage,
  sleep,
  fnRandom,
  parseISO8601Duration,
  doReplacements,
  joinIntoChunks,
  findIdxFuzzy,
  findIdxBySearchExactPart,
  findIdxBySearchInOrder,
  findIdxBySearch,
  getChannelPointsCustomRewards,
}
