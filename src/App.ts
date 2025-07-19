import { prompt } from "enquirer";
import { AppConfiguration, ConfigurationLoader } from "./Config/Config";
import { initializeDatabase, updateDatabaseSchema } from "./Database/Database";
import { Actions } from "./MarcosBot/Actions";
import { MarcosBot } from "./MarcosBot/MarcosBot";
import { TelegramBotMessenger } from "./MarcosBot/Messenger";
export { marcos };

interface MarcosBotApp {
  config: AppConfiguration | undefined;
  messenger: TelegramBotMessenger | undefined;
  bot: MarcosBot | undefined;

  start: () => Promise<void>;

  loadConfiguration: () => Promise<AppConfiguration>;
  askToken: () => Promise<string>;

  registerBotActions: () => void;
}

const marcos: MarcosBotApp = {
  config: undefined,
  messenger: undefined,
  bot: undefined,

  start: async function (): Promise<void> {
    this.config = await this.loadConfiguration();

    // Initialize database with configuration
    console.log("Initializing database...");
    await initializeDatabase(this.config.database);
    await updateDatabaseSchema();
    console.log("Database initialized successfully");

    this.messenger = new TelegramBotMessenger(this.config.token);
    this.bot = new MarcosBot(this.config.botConfig, this.messenger);
    console.log("MarcosBot succesfully initialized");
    this.registerBotActions();
    console.log("MarcosBot is listening...");
  },

  loadConfiguration: async function (): Promise<AppConfiguration> {
    try {
      // Try to load configuration from environment variables
      return ConfigurationLoader.loadConfiguration();
    } catch (error) {
      // If token is missing from environment, prompt for it
      if ((error as Error).message.includes("TELEGRAM_BOT_TOKEN")) {
        console.log(
          "TELEGRAM_BOT_TOKEN not found in environment variables. Please provide it manually."
        );
        const token = await this.askToken();

        // Set the token in process.env so ConfigurationLoader can use it
        process.env.TELEGRAM_BOT_TOKEN = token;

        // Try loading configuration again
        return ConfigurationLoader.loadConfiguration();
      }
      throw error;
    }
  },

  askToken: async function (): Promise<string> {
    const response = (await prompt({
      type: "input",
      name: "token",
      message: "Please, provide a Telegam Bot API token to continue",
    })) as { token: string };
    return response.token;
  },

  registerBotActions: function (): void {
    console.log("Registering actions...");
    [
      Actions.start,
      Actions.help,
      Actions.message,
      Actions.beginWith,
      Actions.endWith,
      Actions.use,
      Actions.haiku,
      Actions.transitionsFrom,
      Actions.transitionsTo,
      Actions.someone,
      Actions.addSwords,
      Actions.seeSwords,
    ].forEach((action) => this.bot!.registerAction(action));
  },
};

marcos.start();
