import "reflect-metadata";
import { DataSource, DataSourceOptions, Repository } from "typeorm";
import { DatabaseConfiguration } from "../Config/Config";
import { User } from "../MarcosBot/Messenger";
import { FrequencySet, Serializable } from "../MarkovChain/FrequencySet";
import { Sword, Transition, UserEntity } from "./entities";

export {
  DatabaseSwordQuerier,
  DatabaseTransitionQuerier,
  DatabaseUserQuerier,
  initializeDatabase,
  updateDatabaseSchema,
};

let dataSource: DataSource | null = null;

const createDataSourceOptions = (
  config: DatabaseConfiguration
): DataSourceOptions => {
  const baseOptions = {
    synchronize: config.synchronize || false,
    logging: config.logging || false,
    entities: [Transition, UserEntity, Sword],
    migrations: [],
    subscribers: [],
  };

  if (config.type === "sqlite") {
    // For SQLite, extract the file path from the URL
    const dbPath = config.url.replace(/^sqlite:\/\//, "");
    return {
      type: "sqlite",
      database: dbPath,
      ...baseOptions,
    };
  } else {
    // For other database types, use the URL
    return {
      type: config.type,
      url: config.url,
      ...baseOptions,
    };
  }
};

const initializeDatabase = async function (
  config: DatabaseConfiguration
): Promise<void> {
  if (dataSource?.isInitialized) {
    return;
  }

  const dataSourceOptions = createDataSourceOptions(config);
  dataSource = new DataSource(dataSourceOptions);

  await dataSource.initialize();
};

const updateDatabaseSchema = async function (): Promise<void> {
  if (!dataSource?.isInitialized) {
    throw new Error("Database not initialized. Call initializeDatabase first.");
  }

  // TypeORM will handle schema updates automatically if synchronize is enabled
  // For production, you might want to use migrations instead
  await dataSource.synchronize();
};

class DatabaseQuerier {
  chainId: number;

  constructor(chainId: number) {
    this.chainId = chainId;
  }

  protected getDataSource(): DataSource {
    if (!dataSource?.isInitialized) {
      throw new Error(
        "Database not initialized. Call initializeDatabase first."
      );
    }
    return dataSource;
  }
}

class DatabaseTransitionQuerier<
  T extends Serializable<T>
> extends DatabaseQuerier {
  private get repository(): Repository<Transition> {
    return this.getDataSource().getRepository(Transition);
  }

  async addTransition(fromState: T, toState: T): Promise<void> {
    const fromStateSerialized = fromState.serialize();
    const toStateSerialized = toState.serialize();

    // Try to find existing transition
    const existingTransition = await this.repository.findOne({
      where: {
        chainId: this.chainId,
        fromState: fromStateSerialized,
        toState: toStateSerialized,
      },
    });

    if (existingTransition) {
      // Update frequency
      existingTransition.frequency += 1;
      await this.repository.save(existingTransition);
    } else {
      // Create new transition
      const newTransition = this.repository.create({
        chainId: this.chainId,
        fromState: fromStateSerialized,
        toState: toStateSerialized,
        frequency: 1,
      });
      await this.repository.save(newTransition);
    }
  }

  async getTransitionsFrom(state: T): Promise<FrequencySet<T>> {
    const transitions = new FrequencySet<T>();
    const results = await this.repository.find({
      where: {
        chainId: this.chainId,
        fromState: state.serialize(),
      },
    });

    results.forEach((row) => {
      transitions.addAppearences(state.deserialize(row.toState), row.frequency);
    });

    return transitions;
  }

  async getTransitionsTo(state: T): Promise<FrequencySet<T>> {
    const transitions = new FrequencySet<T>();
    const results = await this.repository.find({
      where: {
        chainId: this.chainId,
        toState: state.serialize(),
      },
    });

    results.forEach((row) => {
      transitions.addAppearences(
        state.deserialize(row.fromState),
        row.frequency
      );
    });

    return transitions;
  }
}

class DatabaseUserQuerier extends DatabaseQuerier {
  private get repository(): Repository<UserEntity> {
    return this.getDataSource().getRepository(UserEntity);
  }

  async getUsers(): Promise<User[]> {
    const users: User[] = [];
    const results = await this.repository.find({
      where: {
        chainId: this.chainId,
      },
    });

    results.forEach((row) => {
      users.push({
        id: row.userId,
        first_name: row.firstName || "",
        last_name: row.lastName || undefined,
        username: row.username || undefined,
      });
    });

    return users;
  }

  async addUser(user: User): Promise<void> {
    // Try to find existing user
    const existingUser = await this.repository.findOne({
      where: {
        userId: user.id,
        chainId: this.chainId,
      },
    });

    if (!existingUser) {
      const newUser = this.repository.create({
        userId: user.id,
        chainId: this.chainId,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
      });
      await this.repository.save(newUser);
    }
  }
}

class DatabaseSwordQuerier extends DatabaseQuerier {
  private get repository(): Repository<Sword> {
    return this.getDataSource().getRepository(Sword);
  }

  async getSwords(): Promise<Map<string, string[]>>;
  async getSwords(setName: string): Promise<string[]>;
  async getSwords(setName?: string): Promise<any> {
    if (setName) {
      const swords: string[] = [];
      const results = await this.repository.find({
        where: {
          chainId: this.chainId,
          setName: setName,
        },
      });
      results.forEach((row) => swords.push(row.word));
      return swords;
    } else {
      const swords = new Map<string, string[]>();
      const results = await this.repository.find({
        where: {
          chainId: this.chainId,
        },
      });
      results.forEach((row) => {
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
    // Try to find existing sword
    const existingSword = await this.repository.findOne({
      where: {
        chainId: this.chainId,
        setName: setName,
        word: word,
      },
    });

    if (!existingSword) {
      const newSword = this.repository.create({
        chainId: this.chainId,
        setName: setName,
        word: word,
      });
      await this.repository.save(newSword);
    }
  }
}
