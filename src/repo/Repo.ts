import Db from "../DbPostgres";

export abstract class Repo {
  constructor(protected readonly db: Db) {
  }
}
