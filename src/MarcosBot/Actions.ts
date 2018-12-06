import { MarcosBot } from "./MarcosBot"
import { TextMessage } from "./Messenger"
export { MarcosBotAction, Actions }

type MarcosBotActionHandler = (
    app: MarcosBot,
    message: TextMessage,
    argMatch: string[]
) => void;

interface MarcosBotAction {
    command: string;
    description?: string;
    handler: MarcosBotActionHandler;
    argRegExp?: RegExp;
    // requiresAdmin?: boolean;
};

namespace Actions {

    export const start: MarcosBotAction = {
        command: "start",
        handler: (bot, message) => {
            const response = bot.$("WELCOME_MESSAGE")
            bot.answer(message, response);
        }
    };

    export const message: MarcosBotAction = {
        command: "message",
        handler: async (bot, message) => {
            const response = await bot.phraser.generatePhrase(
                message.chat.id);
            bot.answer(message, response);
        }
    };

    export const beginWith: MarcosBotAction = {
        command: "beginwith",
        argRegExp: /(.+)/,
        handler: async (bot, message, argMatch) => {
            const response = await bot.phraser.extendPhrase(
                message.chat.id, argMatch[1], false, true)
            bot.answer(message, response);
        }
    }

    export const endWith: MarcosBotAction = {
        command: "endwith",
        argRegExp: /(.+)/,
        handler: async (bot, message, argMatch) => {
            const response = await bot.phraser.extendPhrase(
                message.chat.id, argMatch[1], true, false)
            bot.answer(message, response);
        }
    }

    export const use: MarcosBotAction = {
        command: "use",
        argRegExp: /(.+)/,
        handler: async (bot, message, argMatch) => {
            const response = await bot.phraser.extendPhrase(
                message.chat.id, argMatch[1], true, true)
            bot.answer(message, response);
        }
    }

    export const transitionsFrom: MarcosBotAction = {
        command: "transitionsfrom", // TODO: Handle empty chains
        argRegExp: /(\S+)$/,
        handler: async (bot, message, argMatch) => {
            const transitions = await bot.phraser.transitionsFrom(
                message.chat.id, argMatch[1])
            const response = transitions.map(t => t[0] + ": " + t[1]).join("\n");
            bot.answer(message, response);
        }
    }

    export const transitionsTo: MarcosBotAction = {
        command: "transitionsto", // TODO: Handle empty chains
        argRegExp: /(\S+)$/,
        handler: async (bot, message, argMatch) => {
            const transitions = await bot.phraser.transitionsTo(
                message.chat.id, argMatch[1])
            const response = transitions.map(t => t[0] + ": " + t[1]).join("\n");
            bot.answer(message, response);
        }
    }

    export const someone: MarcosBotAction = {
        command: "someone",
        argRegExp: /(.+)/,
        handler: () => { }
    }

}
