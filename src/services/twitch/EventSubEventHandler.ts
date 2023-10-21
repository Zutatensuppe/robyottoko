import { User } from '../../repo/Users'
import { Bot } from '../../types'
import { Subscription } from './EventSub'

export abstract class EventSubEventHandler<EventType> {
  public abstract handle(
    bot: Bot,
    user: User,
    data: { subscription: Subscription, event: EventType },
  ): Promise<void>
}
