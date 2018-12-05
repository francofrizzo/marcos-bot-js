import TelegramBot = require('node-telegram-bot-api');
import { MarcosBotAction } from './Actions'
import { Word, Phraser } from "../MarkovChain/Words"
import { MarkovChainProperties } from '../MarkovChain/MarkovChain';
export { MarcosBotApplication, MarcosBotConfiguration }

interface MarcosBotConfiguration { // TODO: see how to provide defaults
    token: string;
    locales: { [ id: string ]: string };
    substitutePeople: boolean;
    listenToAyyLmao: boolean;
    mutationProbability: number
}

class MarcosBotApplication {
    private config: MarcosBotConfiguration;
    private bot: TelegramBot;
    private actions: MarcosBotAction[] = [];
    botName: string;
    phraser: Phraser;

    constructor(config: MarcosBotConfiguration) {
        this.config = config;
        this.setup();
    }

    private async setup(): Promise<void> {
        this.setupPhraser();
        await this.createBot();
        this.setupListeners();
    }

    private setupPhraser() {
        this.phraser = new Phraser(this.getChainProperties());
    }

    private async createBot(): Promise<void> {
        this.bot = new TelegramBot(this.config.token, { polling: true });
        this.botName = (await this.bot.getMe() as TelegramBot.User).username;
    }

    private setupListeners(): void {
        this.bot.on("text", message => this.handleTextMessage(message));
        if (this.config.listenToAyyLmao) {
            this.bot.on("text", message => this.handleAyyLmao(message));
        }
    }

    private getAction(command: string): MarcosBotAction {
        return this.actions.filter(action => action.command == command)[0];
    }

    registerAction(action: MarcosBotAction) {
        if (!this.getAction(action.command)) {
            this.actions.push(action)
        }
        else {
            throw this.$("There already exists an action registered for " +
                "the command '" + action.command + "'");
        }
    }

    handleTextMessage(message: TelegramBot.Message) {
        const messageText = message.text;
        const commandMatch = /^\/([^\s@]+)(?:@(\S+))?(?:\s(.*))?/.exec(messageText);
        if (commandMatch) {
            const command = commandMatch[1];
            const recipient = commandMatch[2];
            const args = commandMatch[3];
            
            if (!recipient || recipient == this.botName) {
                const action = this.getAction(command);
                if (action) {
                    this.executeAction(message, action, args);
                }
                // We don't want to generate noise in group chats
                // answering to unknown commands not directly targeted
                // at this bot, hence the following condition
                else if (message.chat.type == "private" || recipient == this.botName) {
                    this.handleUnknownCommand(message, command);
                }
            }
        }
        else {
            this.handleNonCommandMessage(message);
        }
    }

    executeAction(
        message: TelegramBot.Message,
        action: MarcosBotAction,
        args: string
    ) {
        const argRegExp = action.argRegExp || /.*/;
        const argMatch = argRegExp.exec(args);
        if (argMatch) {
            action.handler(this, message, argMatch);
        }
        else {
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

    private getChainProperties(): MarkovChainProperties<Word> {
        return {
            mutationProbability: this.config.mutationProbability
        }
    }

    answer(message: TelegramBot.Message, response: string) {
        this.bot.sendMessage(message.chat.id, response);
    }

    $(id: string): string {
        return this.config.locales[id];
    }
}
