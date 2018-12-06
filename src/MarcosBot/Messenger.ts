import TelegramBot = require("node-telegram-bot-api");
export { Messenger, TelegramBotMessenger, Message, TextMessage, TextMessageHandler, CommandLineMessenger }

// This decouples the type of the messages used inside our application
// from the specific Telegram message format
type ChatType = "private" | "group" | "supergroup" | "channel";
interface Message {
    chat: { id: number, type: ChatType };
}
interface TextMessage extends Message {
    text: string;
}
type TextMessageHandler = (message: TextMessage) => void;

/**
 * A Messenger is used by Marcos to recieve and send messages to the
 * external world. The interface allows to decouple the use of these
 * functionalities from the specific inner workings of a Telegram bot
 */
interface Messenger {
    /**
     * The username by which the bot is identified in conversations
     */
    botUsername: string | undefined;

    /**
     * Specifies that a certain handler should be executed by the messenger
     * any time that a text message is recieved
     */
    addTextMessageListener(handler: TextMessageHandler): void;

    /**
     * Sends a text message, given the ID of the chat to which it should be sent
     */
    sendMessage(chatId: number, text: string): void;
}

/**
 * Implementation of the interface Messenger that serves as a wrapper of a
 * Telegram bot
 */
class TelegramBotMessenger implements Messenger {
    botUsername: string | undefined;
    private bot: TelegramBot;

    constructor(token: string) {
        this.bot = new TelegramBot(token, { polling: true });
        this.findOutBotUsername();
    }

    private async findOutBotUsername(): Promise<void> {
        this.botUsername = (await this.bot.getMe() as TelegramBot.User).username;
    }
    
    addTextMessageListener(handler: TextMessageHandler) {
        this.bot.on("text", handler);
    }

    async sendMessage(chatId: number, text: string): Promise<void> {
        this.bot.sendMessage(chatId, text);
    }
}

class CommandLineMessenger implements Messenger {
    botUsername: string = "DummyBot";
    private listeners: TextMessageHandler[] = [];

    constructor(chatId: number, chatType: ChatType) {
        let stdin = process.openStdin();
        stdin.addListener("data", d => {
            let message: TextMessage = {
                chat: { id: chatId, type: chatType },
                text: d.toString().trim()
            };
            this.listeners.forEach(listener => {
                listener(message);
            });
        });
    }

    addTextMessageListener(handler: TextMessageHandler) {
        this.listeners.push(handler);
    }

    sendMessage(chatId: number, text: string): void {
        process.stdout.write(">>> " + text + "\n");
    }
}
