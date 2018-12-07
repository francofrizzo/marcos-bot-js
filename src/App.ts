import { MarcosBot, MarcosBotConfiguration } from "./MarcosBot/MarcosBot"
import { TelegramBotMessenger } from "./MarcosBot/Messenger"
import { Actions } from "./MarcosBot/Actions";
import * as fs  from "fs";
import { prompt } from "enquirer";
export { marcos }

type AppConfiguration = { token: string, botConfig: MarcosBotConfiguration }

interface MarcosBotApp {
    config: AppConfiguration | undefined;
    messenger: TelegramBotMessenger | undefined;
    bot: MarcosBot | undefined;

    start: () => Promise<void>;

    loadConfiguration: () => Promise<AppConfiguration>;
    validateConfiguration: (config: any) => Promise<AppConfiguration>;
    askToken: () => Promise<string>;

    registerBotActions: () => void;
}

const marcos: MarcosBotApp = {
    config: undefined,
    messenger: undefined,
    bot: undefined,

    start: async function(): Promise<void> {
        this.config = await this.loadConfiguration();
        this.messenger = new TelegramBotMessenger(this.config.token);
        this.bot = new MarcosBot(this.config.botConfig, this.messenger)
        console.log("MarcosBot succesfully initialized");
        this.registerBotActions();
        console.log("MarcosBot is listening...")
    },

    loadConfiguration: async function(): Promise<AppConfiguration> {
        let defaultConfig = require("../default/config.json");
    
        let localConfig = {};
        try {
            localConfig = require("../local/config.json");
        }
        catch {
            console.log("No local config file provided. Using default settings")
        }
        localConfig = await this.validateConfiguration(localConfig);
        fs.writeFile(
            __dirname + "/../local/config.json",
            JSON.stringify(localConfig, undefined, 4),
            (err) => {if (err) console.log(err) }
        );
    
        let config = Object.assign(defaultConfig, localConfig);
        return config;
    },
    
    validateConfiguration: async function(config: any): Promise<AppConfiguration> {
        if (! config.token) {
            config.token = await this.askToken();
        }
        return config;
    },

    askToken: async function(): Promise<string> {
        const response = await prompt({
            type: 'input',
            name: 'token',
            message: 'Please, provide a Telegam Bot API token to continue' 
        }) as { token: string };
        return response.token;
    },
    
    registerBotActions: function(): void {
        console.log("Registering actions...");
        [
            Actions.start,
            Actions.message,
            Actions.beginWith,
            Actions.endWith,
            Actions.use,
            Actions.transitionsFrom,
            Actions.transitionsTo,
            Actions.someone,
            Actions.addSwords
        ].forEach(action =>
            this.bot!.registerAction(action)
        );
    }
}

marcos.start();
