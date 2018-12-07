import { MarcosBotAction } from './Actions'
import { Messenger, User, Message, TextMessage } from './Messenger'
import { Word, Phraser } from "../MarkovChain/Words"
import { MarkovChainProperties } from '../MarkovChain/MarkovChain';
import { DatabaseUserQuerier, DatabaseSwordQuerier } from "../Database/Database"
export { MarcosBot, MarcosBotConfiguration }

interface MarcosBotConfiguration {
    locales: { [ id: string ]: string };
    substitutePeople: boolean;
    listenToAyyLmao: boolean;
    mutationProbability: number
}

class MarcosBot {
    private config: MarcosBotConfiguration;
    private messenger: Messenger;
    private actions: Map<string, MarcosBotAction> = new Map();
    phraser: Phraser;

    constructor(config: MarcosBotConfiguration, messenger: Messenger) {
        this.config = config;
        this.messenger = messenger;
        this.phraser = new Phraser(this.getChainProperties());
        this.setupListeners();
    }

    private setupListeners(): void {
        this.messenger.addMessageListener(message => this.storeMessageUser(message));
        this.messenger.addTextMessageListener(message => this.handleTextMessage(message));
        if (this.config.listenToAyyLmao) {
            this.messenger.addTextMessageListener(message => this.handleAyyLmao(message));
        }
    }

    storeMessageUser(message: Message): void {
        let querier = new DatabaseUserQuerier(message.chat.id);
        querier.addUser(message.from);
    }

    async getChatUsers(chatId: number): Promise<User[]> {
        let querier = new DatabaseUserQuerier(chatId);
        return querier.getUsers();
    }
    
    async getSwords(chatId: number): Promise<Map<string, string[]>>;
    async getSwords(chatId: number, setName: string): Promise<string[]>;
    async getSwords(chatId: number, setName?: string): Promise<any> {
        let querier = new DatabaseSwordQuerier(chatId);
        if (setName) { return querier.getSwords(setName); }
        else { return querier.getSwords(); }
    }
    
    async addSwords(chatId: number, setName: string, words: string[]): Promise<void> {
        let querier = new DatabaseSwordQuerier(chatId);
        await words.forEach(word => querier.addSword(setName, word));
    }

    async replacePlaceholders(text: string, chatId: number): Promise<string> {
        let replacedText = await this.replaceUsernamePlaceholders(text, chatId);
        replacedText = await this.replaceSwordPlaceholders(replacedText, chatId);
        return replacedText;
    }

    async replaceUsernamePlaceholders(text: string, chatId: number): Promise<string> {
        const chatUsers = await this.getChatUsers(chatId);
        const randomChatUser: () => string = function() {
            let user = chatUsers[Math.floor(Math.random() * chatUsers.length)];
            if (user.username) return "@" + user.username;
            else return [user.first_name, user.last_name].join(" ").trim();
        }
        
        const placeholderRegex = /^@(\d+)?$/;
        let replacements: Map<number, string> = new Map();

        return text.split(" ").map(word =>
            word.replace(placeholderRegex, (match, id) => {
                let replacement: string;
                if (id) {
                    if (replacements.has(id)) {
                        replacement = replacements.get(id)!;
                    }
                    else {
                        replacement = randomChatUser();
                        replacements.set(id, replacement);
                    }
                }
                else {
                    replacement = randomChatUser();
                }
                return replacement;
            })
        ).join(" ");
    }

    async replaceSwordPlaceholders(text: string, chatId: number): Promise<string> {
        let swords = await this.getSwords(chatId);
        const placeholderRegex = /^\$([\w\d-]+)$/;

        return text.split(" ").map(word =>
            word.replace(placeholderRegex, (match, setName) => {
                if (swords.has(setName)) {
                    let thisSetSwords = swords.get(setName)
                    return thisSetSwords![Math.floor(Math.random() * thisSetSwords!.length)];
                }
                else {
                    return match;
                }
            })
        ).join(" ")
    }

    private getAction(command: string): MarcosBotAction | undefined {
        return this.actions.get(command);
    }

    registerAction(action: MarcosBotAction) {
        let commands =
            Array.isArray(action.command) ? action.command : [action.command]
        commands.forEach(command => {
            if (!this.getAction(command)) {
                this.actions.set(command, action);
            }
            else {
                throw this.$("There already exists an action registered for " +
                    "the command '" + command + "'");
            }
        });
    }

    private handleTextMessage(message: TextMessage): void {
        const messageText = message.text;
        const commandMatch = /^\/([^\s@]+)(?:@(\S+))?(?:\s(.*))?/.exec(messageText);
        if (commandMatch) {
            const command = commandMatch[1];
            const recipient = commandMatch[2];
            const args = commandMatch[3] != undefined ? commandMatch[3] : "";
            
            if (!recipient || recipient == this.messenger.botUsername) {
                const action = this.getAction(command);
                if (action) {
                    this.executeAction(message, action, args);
                }
                // We don't want to generate noise in group chats
                // answering to unknown commands not directly targeted
                // at this bot, hence the following condition
                else if (message.chat.type == "private" || recipient == this.messenger.botUsername) {
                    this.handleUnknownCommand(message, command);
                }
            }
        }
        else {
            this.handleNonCommandMessage(message);
        }
    }

    executeAction(
        message: TextMessage,
        action: MarcosBotAction,
        args: string
    ): void {
        const argRegExp = action.argRegExp || /.*/;
        const argMatch = argRegExp.exec(args);
        if (argMatch) {
            action.handler(this, message, argMatch);
        }
        else {
            this.answer(message, this.$("ERR_MALFORMED_ARGUMENTS"));
        }
    }

    private handleUnknownCommand(message: TextMessage, command: string): void {
        this.answer(message, this.$("ERR_UNKNOWN_COMMAND"));
    }

    private handleNonCommandMessage(message: TextMessage): void {
        this.phraser.storePhrase(message.chat.id, message.text);
    }

    private handleAyyLmao(message: TextMessage): void {
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

    answer(message: Message, response: string) {
        this.messenger.sendMessage(message.chat.id, response);
    }

    $(id: string): string {
        return this.config.locales[id];
    }
}
