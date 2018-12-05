import TelegramBot = require('node-telegram-bot-api');
import { MarcosBotApplication } from "./MarcosBot"
export { MarcosBotAction, Actions }

type MarcosBotActionHandler = (
    app?: MarcosBotApplication,
    message?: TelegramBot.Message,
    argMatch?: string[]
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
        handler: (app, message) => {
            const response = app.$("WELCOME_MESSAGE")
            app.answer(message, response);
        }
    };

    export const message: MarcosBotAction = {
        command: "message",
        handler: async (app, message) => {
            const response = await app.phraser.generatePhrase(
                message.chat.id);
            app.answer(message, response);
        }
    };

    export const beginWith: MarcosBotAction = {
        command: "beginwith",
        argRegExp: /(.+)/,
        handler: async (app, message, argMatch) => {
            const response = await app.phraser.extendPhrase(
                message.chat.id, argMatch[1], false, true)
            app.answer(message, response);
        }
    }

    export const endWith: MarcosBotAction = {
        command: "endwith",
        argRegExp: /(.+)/,
        handler: async (app, message, argMatch) => {
            const response = await app.phraser.extendPhrase(
                message.chat.id, argMatch[1], true, false)
            app.answer(message, response);
        }
    }

    export const use: MarcosBotAction = {
        command: "use",
        argRegExp: /(.+)/,
        handler: async (app, message, argMatch) => {
            const response = await app.phraser.extendPhrase(
                message.chat.id, argMatch[1], true, true)
            app.answer(message, response);
        }
    }

    export const transitionsFrom: MarcosBotAction = {
        command: "transitionsfrom", // TODO: Handle empty chains
        argRegExp: /(\S+)$/,
        handler: async (app, message, argMatch) => {
            const transitions = await app.phraser.transitionsFrom(
                message.chat.id, argMatch[1])
            const response = transitions.map(t => t[0] + ": " + t[1]).join("\n");
            app.answer(message, response);
        }
    }

    export const transitionsTo: MarcosBotAction = {
        command: "transitionsto", // TODO: Handle empty chains
        argRegExp: /(\S+)$/,
        handler: async (app, message, argMatch) => {
            const transitions = await app.phraser.transitionsTo(
                message.chat.id, argMatch[1])
            const response = transitions.map(t => t[0] + ": " + t[1]).join("\n");
            app.answer(message, response);
        }
    }

    export const someone: MarcosBotAction = {
        command: "someone",
        argRegExp: /(.+)/,
        handler: () => { }
    }

}
