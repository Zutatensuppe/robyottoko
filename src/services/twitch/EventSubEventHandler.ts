import type { User } from '../../repo/Users'
import type { Bot } from '../../types'
import type { Subscription } from './EventSub'

export abstract class EventSubEventHandler<EventType> {
  public abstract handle(
    bot: Bot,
    user: User,
    data: { subscription: Subscription, event: EventType },
  ): Promise<void>
}
