import TelegramBot = require('node-telegram-bot-api');
import { Word, Phraser } from "./Words"
import { MarkovChainProperties } from './MarkovChain';
export { MarcosBotApplication, MarcosBotConfiguration }

// Pending features:
// - Name replacing
// - Logging
// - Easter eggs (per-chat)
// Pending tasks:
// - Replace database mocker with actual databsae
// - Thoroughly test MarkovChain and FrequencySet algorithms

interface MarcosBotConfiguration { // TODO: see how to provide defaults
    token: string;
    locales: { [ id: string ]: string };
    substitutePeople: boolean;
    listenToAyyLmao: boolean;
    mutationProbability: number
}

type MarcosBotAction = {
    command: string,
    description?: string,
    handler: MarcosBotActionHandler,
    argRegExp?: string,
    // requiresAdmin?: boolean
};

type MarcosBotActionHandler = (message?: TelegramBot.Message, argMatch?: string[]) => void;

class MarcosBotApplication {
    private config: MarcosBotConfiguration;
    private bot: TelegramBot;
    private botName: string;
    private actions: MarcosBotAction[] = [];
    private phraser: Phraser;

    constructor(config: MarcosBotConfiguration) {
        this.config = config;
        this.setup();
    }

    private async setup(): Promise<void> {
        this.setupPhraser();
        await this.createBot();
        this.setupActions();
        this.setupListeners();
    }

    private setupPhraser() {
        this.phraser = new Phraser(this.getChainProperties());
    }

    private async createBot(): Promise<void> {
        this.bot = new TelegramBot(this.config.token, { polling: true });
        this.botName = (await this.bot.getMe() as TelegramBot.User).username;
    }

    private setupActions(): void {
        [
            {
                command: "start",
                handler: message => {
                    const response = this.$("WELCOME_MESSAGE")
                    this.answer(message, response);
                }
            },
            {
                command: "message",
                handler: async message => {
                    const response = await this.phraser.generatePhrase(message.chat.id);
                    this.answer(message, response);
                }
            },
            {
                command: "beginWith",
                argRegExp: "(.+)",
                handler: async (message, argMatch) => {
                    const response = await this.phraser.extendPhrase(message.chat.id, argMatch[1], false, true)
                    this.answer(message, response);
                }
            },
            {
                command: "endWith",
                argRegExp: "(.+)",
                handler: async (message, argMatch) => {
                    const response = await this.phraser.extendPhrase(message.chat.id, argMatch[1], true, false)
                    this.answer(message, response);
                }
            },
            {
                command: "use",
                argRegExp: "(.+)",
                handler: async (message, argMatch) => {
                    const response = await this.phraser.extendPhrase(message.chat.id, argMatch[1], true, true)
                    this.answer(message, response);
                }
            },
            {
                command: "transitionsFrom", // TODO: Handle empty chains
                argRegExp: "(\\S+)$",
                handler: async (message, argMatch) => {
                    const transitions = await this.phraser.transitionsFrom(message.chat.id, argMatch[1])
                    const response = transitions.map(t => t[0] + ": " + t[1]).join("\n");
                    this.answer(message, response);
                }
            },
            {
                command: "transitionsTo", // TODO: Handle empty chains
                argRegExp: "(\\S+)$",
                handler: async (message, argMatch) => {
                    const transitions = await this.phraser.transitionsTo(message.chat.id, argMatch[1])
                    const response = transitions.map(t => t[0] + ": " + t[1]).join("\n");
                    this.answer(message, response);
                }
            },
            {
                command: "someone",
                argRegExp: "(.+)",
                handler: (message, argMatch) => { }
            }
        ].forEach(action => this.registerAction(action));
    }

    private setupListeners(): void {
        this.bot.on("text", message => this.handleTextMessage(message));
        this.bot.on("text", message => this.handleAyyLmao(message));
    }

    private getAction(command: string): MarcosBotAction {
        return this.actions.filter(action => action.command == command)[0];
    }

    private registerAction(action: MarcosBotAction) {
        if (!this.getAction(action.command)) {
            this.actions.push(action)
        }
        else {
            throw this.$("ERR_DUPLICATED_ACTION");
        }
    }

    private handleTextMessage(message: TelegramBot.Message) {
        const messageText = message.text;
        const commandMatch = /^\/([^\s@]+)@(\S+)?/.exec(messageText);
        if (commandMatch) {
            if (!commandMatch[2] || commandMatch[2] == this.botName) {
                const command = commandMatch[1];
                const action = this.getAction(command);
                if (action) {
                    this.executeAction(message, action);
                }
                else {
                    this.handleUnknownCommand(message, command);
                }
            }
        }
        else {
            this.handleNonCommandMessage(message);
        }
    }

    private executeAction(message: TelegramBot.Message, action: MarcosBotAction) {
        const effectiveRegExp = RegExp("^/" + action.command +
            (action.argRegExp ? " " + action.argRegExp : ""));
        const argMatch = effectiveRegExp.exec(message.text);
        if (argMatch) {
            action.handler(message, argMatch);
        }
        else { // Malformed arguments
            this.answer(message, this.$("ERR_MALFORMED_ARGUMENTS"));
        }
    }

    private handleUnknownCommand(message: TelegramBot.Message, command: string) {
        this.answer(message, this.$("ERR_UNKNOWN_COMMAND"));
    }

    private handleNonCommandMessage(message: TelegramBot.Message) {
        this.phraser.storePhrase(message.chat.id, message.text);
    }

    private handleAyyLmao(message: TelegramBot.Message) {
        if (this.config.listenToAyyLmao) {
            if (/rip/i.exec(message.text)) {
                this.answer(message, "in pieces");
            }
            if (/alien|ayy.*lmao|lmao.*ayy/i.exec(message.text)) {
                this.answer(message, "ayy lmao");
            }
            else {
                let match = /ayy(y*)/i.exec(message.text); 
                if (match) {
                    this.answer(message, "lmao" + "o".repeat(match[1].length));
                }
                match = /lmao(o*)/i.exec(message.text);
                if (match) {
                    this.answer(message, "ayy" + "y".repeat(match[1].length));
                }
            }
        }
    }

    private getChainProperties(): MarkovChainProperties<Word> {
        return {
            mutationProbability: this.config.mutationProbability
        }
    }

    private answer(message: TelegramBot.Message, response: string) {
        this.bot.sendMessage(message.chat.id, response);
    }

    private $(id: string): string {
        return this.config.locales[id];
    }
}
