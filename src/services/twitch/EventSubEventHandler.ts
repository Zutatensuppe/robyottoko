import { User } from "../../repo/Users"
import { Bot } from "../../types"

export abstract class EventSubEventHandler<EventType> {
  public abstract handle(
    bot: Bot,
    user: User,
    data: { subscription: any, event: EventType },
  ): Promise<void>
}
