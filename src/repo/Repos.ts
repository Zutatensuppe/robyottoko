import Db from "../DbPostgres"
import { ChatLogRepo } from "./ChatLogRepo"
import { EventSubRepo } from "./EventSubRepo"
import { ModuleRepo } from "./ModuleRepo"
import { OauthTokenRepo } from "./OauthTokenRepo"
import { PubRepo } from "./PubRepo"
import { StreamsRepo } from "./StreamsRepo"
import Tokens from "./Tokens"
import Users from "./Users"
import { VariablesRepo } from "./VariablesRepo"

export class Repos {
  public user: Users
  public token: Tokens
  public pub: PubRepo
  public streams: StreamsRepo
  public variables: VariablesRepo
  public oauthToken: OauthTokenRepo
  public module: ModuleRepo
  public chatLog: ChatLogRepo
  public eventSub: EventSubRepo

  constructor (db: Db) {
    this.user = new Users(db)
    this.token = new Tokens(db)
    this.pub = new PubRepo(db)
    this.streams = new StreamsRepo(db)
    this.variables = new VariablesRepo(db)
    this.oauthToken = new OauthTokenRepo(db)
    this.module = new ModuleRepo(db)
    this.chatLog = new ChatLogRepo(db)
    this.eventSub = new EventSubRepo(db)
  }
}
