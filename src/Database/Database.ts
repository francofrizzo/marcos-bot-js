import * as sqlite3 from "sqlite3";
import * as sqlite from "sqlite";
import { FrequencySet, Serializable } from "../MarkovChain/FrequencySet";
import { User } from "../MarcosBot/Messenger";
export {
  DatabaseTransitionQuerier,
  DatabaseUserQuerier,
  DatabaseSwordQuerier,
  updateDatabaseSchema,
};

const dbPromise: Promise<sqlite.Database> = sqlite.open({
  filename: "local/marcos.sqlite3",
  driver: sqlite3.Database,
});

const updateDatabaseSchema = async function () {
  const db: sqlite.Database = await dbPromise;
  db.run(`CREATE TABLE IF NOT EXISTS transitions (
        id           INTEGER  PRIMARY KEY  AUTOINCREMENT,
        chainId      INTEGER  NOT NULL,
        fromState    TEXT     NOT NULL,
        toState      TEXT     NOT NULL,
        frequency    INTEGER  NOT NULL,
        UNIQUE (chainid, fromState, toState)
    )`);
  db.run(`CREATE TABLE IF NOT EXISTS users (
        id           INTEGER  PRIMARY KEY  AUTOINCREMENT,
        userId       INTEGER  NOT NULL,
        chainId      INTEGER  NOT NULL,
        firstName    TEXT,
        lastName     TEXT,
        username     TEXT,
        UNIQUE (userId, chainId)
    )`);
  db.run(`CREATE TABLE IF NOT EXISTS swords (
        id           INTEGER  PRIMARY KEY  AUTOINCREMENT,
        chainId      INTEGER  NOT NULL,
        setName      TEXT     NOT NULL,
        word         TEXT     NOT NULL,
        UNIQUE (chainId, setName, word)
    )`);
};

class DatabaseQuerier {
  chainId: number;

  constructor(chainId: number) {
    this.chainId = chainId;
  }
}

class DatabaseTransitionQuerier<
  T extends Serializable<T>
> extends DatabaseQuerier {
  async addTransition(fromState: T, toState: T): Promise<void> {
    const db: sqlite.Database = await dbPromise;
    let queryArgs = {
      $chainId: this.chainId,
      $fromState: fromState.serialize(),
      $toState: toState.serialize(),
    };
    await db.run(
      `
            INSERT OR IGNORE INTO transitions(chainId, fromState, toState, frequency)
                VALUES ($chainId, $fromState, $toState, 0);
        `,
      queryArgs
    );
    await db.run(
      `
            UPDATE transitions
                SET frequency = frequency + 1
                WHERE chainId = $chainId AND fromState = $fromState AND toState = $toState
        `,
      queryArgs
    );
  }

  async getTransitionsFrom(state: T): Promise<FrequencySet<T>> {
    const db: sqlite.Database = await dbPromise;
    let transitions = new FrequencySet<T>();
    let rows = await db.all(
      `
        SELECT toState, frequency FROM transitions
        WHERE chainId = $chainId AND fromState = $fromState
        `,
      { $chainId: this.chainId, $fromState: state.serialize() }
    );
    rows.forEach((row) => {
      transitions.addAppearences(state.deserialize(row.toState), row.frequency);
    });
    return transitions;
  }

  async getTransitionsTo(state: T): Promise<FrequencySet<T>> {
    const db: sqlite.Database = await dbPromise;
    let transitions = new FrequencySet<T>();
    let rows = await db.all(
      `
            SELECT fromState, frequency FROM transitions
                WHERE chainId = $chainId AND toState = $toState
        `,
      { $chainId: this.chainId, $toState: state.serialize() }
    );
    rows.forEach((row) => {
      transitions.addAppearences(
        state.deserialize(row.fromState),
        row.frequency
      );
    });
    return transitions;
  }
}

class DatabaseUserQuerier extends DatabaseQuerier {
  async getUsers(): Promise<User[]> {
    const db: sqlite.Database = await dbPromise;
    let users: User[] = [];
    let rows = await db.all(
      `
            SELECT userId, firstName, lastName, username FROM users
                WHERE chainId = $chainId
        `,
      { $chainId: this.chainId }
    );
    rows.forEach((row) => {
      users.push({
        id: row.userId,
        first_name: row.firstName,
        last_name: row.lastName,
        username: row.username,
      });
    });
    return users;
  }

  async addUser(user: User): Promise<void> {
    const db: sqlite.Database = await dbPromise;
    let queryArgs = {
      $userId: user.id,
      $chainId: this.chainId,
      $firstName: user.first_name,
      $lastName: user.last_name,
      $username: user.username,
    };
    await db.run(
      `
            INSERT OR IGNORE INTO users(userId, chainId, firstName, lastName, username)
                VALUES ($userId, $chainId, $firstName, $lastName, $username);
        `,
      queryArgs
    );
  }
}

class DatabaseSwordQuerier extends DatabaseQuerier {
  async getSwords(): Promise<Map<string, string[]>>;
  async getSwords(setName: string): Promise<string[]>;
  async getSwords(setName?: string): Promise<any> {
    const db: sqlite.Database = await dbPromise;
    if (setName) {
      let swords: string[] = [];
      let rows = await db.all(
        `
                SELECT word FROM swords
                    WHERE chainId = $chainId AND setName = $setName
            `,
        { $chainId: this.chainId, $setName: setName }
      );
      rows.forEach((row) => swords.push(row.word));
      return swords;
    } else {
      let swords = new Map<string, string[]>();
      let rows = await db.all(
        `
                SELECT setName, word FROM swords
                    WHERE chainId = $chainId
            `,
        { $chainId: this.chainId }
      );
      rows.forEach((row) => {
        if (swords.has(row.setName)) {
          swords.get(row.setName)!.push(row.word);
        } else {
          swords.set(row.setName, [row.word]);
        }
      });
      return swords;
    }
  }

  async addSword(setName: string, word: string): Promise<void> {
    const db: sqlite.Database = await dbPromise;
    let queryArgs = {
      $chainId: this.chainId,
      $setName: setName,
      $word: word,
    };
    await db.run(
      `
            INSERT OR IGNORE INTO swords(chainId, setName, word)
                VALUES ($chainId, $setName, $word);
        `,
      queryArgs
    );
  }
}
