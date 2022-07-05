import { CommandTriggerType } from "../types";

export const possibleTriggerActions = () => ([
  { type: CommandTriggerType.COMMAND, label: "Add Command", title: "Command" },
  { type: CommandTriggerType.FIRST_CHAT, label: "Add First Chat", title: "First Chat" },
  {
    type: CommandTriggerType.REWARD_REDEMPTION,
    label: "Add Reward Redemption",
    title: "Reward Redemption",
  },
  { type: CommandTriggerType.SUB, label: "Add Sub", title: "Sub" },
  { type: CommandTriggerType.BITS, label: "Add Bits", title: "Bits" },
  { type: CommandTriggerType.FOLLOW, label: "Add Follow", title: "Follow" },
  { type: CommandTriggerType.TIMER, label: "Add Timer", title: "Timer" },
])
