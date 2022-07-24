'use strict'

import { logger, MINUTE } from "../../common/fn";
import { isBroadcaster, isMod, isSubscriber } from "../../common/permissions";
import { WhereRaw } from "../../DbPostgres";
import fn from "../../fn";
import { Bot, CommandTriggerType, TwitchChatContext } from "../../types";
import { CommandExecutor } from "../CommandExecutor";
import { User } from "../Users";

const log = logger('ChatEventHandler.ts')

const rolesLettersFromTwitchChatContext = (context: TwitchChatContext): string[] => {
  const roles: string[] = []
  if (isMod(context)) {
    roles.push('M')
  }
  if (isSubscriber(context)) {
    roles.push('S')
  }
  if (isBroadcaster(context)) {
    roles.push('B')
  }
  return roles
}

export class ChatEventHandler {
  async handle(
    bot: Bot,
    user: User,
    target: string,
    context: TwitchChatContext,
    msg: string,
  ): Promise<void> {
    const roles = rolesLettersFromTwitchChatContext(context)
    log.debug(`${context.username}[${roles.join('')}]@${target}: ${msg}`)

    await bot.getDb().insert('robyottoko.chat_log', {
      created_at: new Date(),
      broadcaster_user_id: context['room-id'],
      user_name: context.username,
      display_name: context['display-name'],
      message: msg,
    })

    const countChatMessages = async (where: WhereRaw): Promise<number> => {
      const db = bot.getDb()
      const whereObject = db._buildWhere(where)
      const row = await db._get(
        `select COUNT(*) as c from robyottoko.chat_log ${whereObject.sql}`,
        whereObject.values
      )
      return parseInt(`${row.c}`, 10)
    }
    let _isFirstChatAlltime: null | boolean = null
    let _isFirstChatStream: null | boolean = null
    const determineIsFirstChatAlltime = async (): Promise<boolean> => {
      return await countChatMessages({
        broadcaster_user_id: context['room-id'],
        user_name: context.username,
      }) === 1
    }
    const isFirstChatAlltime = async (): Promise<boolean> => {
      if (_isFirstChatAlltime === null) {
        _isFirstChatAlltime = await determineIsFirstChatAlltime()
      }
      return _isFirstChatAlltime
    }
    const determineIsFirstChatStream = async (): Promise<boolean> => {
      const helixClient = bot.getUserTwitchClientManager(user).getHelixClient()
      if (!helixClient) {
        return false
      }

      const stream = await helixClient.getStreamByUserId(context['room-id'])
      let minDate: Date
      if (stream) {
        minDate = new Date(stream.started_at)
      } else {
        minDate = new Date(new Date().getTime() - (5 * MINUTE))
        log.info(`No stream is running atm for channel ${context['room-id']}. Using fake start date ${minDate}.`)
      }

      return await countChatMessages({
        broadcaster_user_id: context['room-id'],
        user_name: context.username,
        created_at: { '$gte': minDate },
      }) === 1
    }
    const isFirstChatStream = async (): Promise<boolean> => {
      if (_isFirstChatStream === null) {
        _isFirstChatStream = await determineIsFirstChatStream()
      }
      return _isFirstChatStream
    }
    const chatClient = bot.getUserTwitchClientManager(user).getChatClient()
    if (!chatClient) {
      return
    }
    const chatMessageContext = { client: chatClient, target, context, msg }

    for (const m of bot.getModuleManager().all(user.id)) {
      const commands = m.getCommands() || []
      let triggers = []
      const relevantTriggers = []
      for (const command of commands) {
        for (const trigger of command.triggers) {
          if (trigger.type === CommandTriggerType.COMMAND) {
            triggers.push(trigger)
          } else if (trigger.type === CommandTriggerType.FIRST_CHAT) {
            if (trigger.data.since === 'alltime' && await isFirstChatAlltime()) {
              relevantTriggers.push(trigger)
            } else if (trigger.data.since === 'stream' && await isFirstChatStream()) {
              relevantTriggers.push(trigger)
            }
          }
        }
      }

      // make sure longest commands are found first
      // so that in case commands `!draw` and `!draw bad` are set up
      // and `!draw bad` is written in chat, that command only will be
      // executed and not also `!draw`
      triggers = triggers.sort((a, b) => b.data.command.length - a.data.command.length)
      let rawCmd = null
      for (const trigger of triggers) {
        rawCmd = fn.parseCommandFromTriggerAndMessage(chatMessageContext.msg, trigger)
        if (!rawCmd) {
          continue
        }
        relevantTriggers.push(trigger)
        break
      }

      if (relevantTriggers.length > 0) {
        const exec = new CommandExecutor()
        await exec.executeMatchingCommands(
          bot,
          user,
          rawCmd,
          target,
          context,
          relevantTriggers,
        )
      }
      await m.onChatMsg(chatMessageContext);
    }
  }
}
