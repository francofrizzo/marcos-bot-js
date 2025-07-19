import * as dotenv from "dotenv";
import { MarcosBotConfiguration } from "../MarcosBot/MarcosBot";

// Load environment variables from .env file
dotenv.config();

export interface DatabaseConfiguration {
  type: "sqlite" | "postgres" | "mysql" | "mariadb" | "mssql" | "oracle";
  url: string;
  synchronize?: boolean;
  logging?: boolean;
}

export interface AppConfiguration {
  token: string;
  botConfig: MarcosBotConfiguration;
  database: DatabaseConfiguration;
}

export class ConfigurationLoader {
  static loadConfiguration(): AppConfiguration {
    // Load required environment variables
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN environment variable is required");
    }

    // Load database configuration
    const database = ConfigurationLoader.loadDatabaseConfiguration();

    // Load bot configuration with defaults
    const botConfig: MarcosBotConfiguration = {
      locales: {
        WELCOME_MESSAGE:
          process.env.LOCALE_WELCOME_MESSAGE ||
          "Hello! I am Marcos the Bot. Talk to me and I will generate random messages based on the things you say.",
        AVAILABLE_COMMANDS:
          process.env.LOCALE_AVAILABLE_COMMANDS || "Available commands",
        ERR_MALFORMED_ARGUMENTS:
          process.env.LOCALE_ERR_MALFORMED_ARGUMENTS ||
          "The arguments provided are not correct",
        ERR_UNKNOWN_COMMAND:
          process.env.LOCALE_ERR_UNKNOWN_COMMAND ||
          "I don't understand that command",
        ERR_IMPOSSIBLE_HAIKU:
          process.env.LOCALE_ERR_IMPOSSIBLE_HAIKU ||
          "I am not feeling inspired for poetry today, sorry :(",
      },
      substitutePeople: ConfigurationLoader.parseBoolean(
        process.env.SUBSTITUTE_PEOPLE,
        true
      ),
      listenToAyyLmao: ConfigurationLoader.parseBoolean(
        process.env.LISTEN_TO_AYY_LMAO,
        true
      ),
      mutationProbability: ConfigurationLoader.parseFloat(
        process.env.MUTATION_PROBABILITY,
        0.2
      ),
    };

    return {
      token,
      botConfig,
      database,
    };
  }

  private static loadDatabaseConfiguration(): DatabaseConfiguration {
    // Get DATABASE_URL or use default SQLite
    const databaseUrl =
      process.env.DATABASE_URL || "sqlite://./local/marcos.sqlite3";

    // Parse database type from URL scheme
    const type = ConfigurationLoader.parseDatabaseTypeFromUrl(databaseUrl);

    return {
      type,
      url: databaseUrl,
      synchronize: ConfigurationLoader.parseBoolean(
        process.env.DATABASE_SYNCHRONIZE,
        true
      ),
      logging: ConfigurationLoader.parseBoolean(
        process.env.DATABASE_LOGGING,
        false
      ),
    };
  }

  private static parseDatabaseTypeFromUrl(
    url: string
  ): DatabaseConfiguration["type"] {
    const scheme = url.split("://")[0].toLowerCase();

    switch (scheme) {
      case "sqlite":
        return "sqlite";
      case "postgresql":
      case "postgres":
        return "postgres";
      case "mysql":
        return "mysql";
      case "mariadb":
        return "mariadb";
      case "mssql":
      case "sqlserver":
        return "mssql";
      case "oracle":
        return "oracle";
      default:
        throw new Error(
          `Unsupported database URL scheme: ${scheme}. Supported schemes: sqlite, postgresql, postgres, mysql, mariadb, mssql, sqlserver, oracle`
        );
    }
  }

  private static parseBoolean(
    value: string | undefined,
    defaultValue: boolean
  ): boolean {
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === "true";
  }

  private static parseFloat(
    value: string | undefined,
    defaultValue: number
  ): number {
    if (value === undefined) return defaultValue;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
}
