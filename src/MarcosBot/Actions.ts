import { MarcosBot } from "./MarcosBot";
import { TextMessage } from "./Messenger";
export { MarcosBotAction, Actions };

type MarcosBotActionHandler = (
  app: MarcosBot,
  message: TextMessage,
  argMatch: string[]
) => void;

interface MarcosBotAction {
  command: string | string[];
  description?: string;
  handler: MarcosBotActionHandler;
  argRegExp?: RegExp;
  // requiresAdmin?: boolean;
}

namespace Actions {
  export const start: MarcosBotAction = {
    command: "start",
    handler: (bot, message) => {
      const response = bot.$("WELCOME_MESSAGE");
      bot.answer(message, response);
    },
  };

  export const help: MarcosBotAction = {
    command: "help",
    handler: (bot, message) => {
      const response =
        bot.$("AVAILABLE_COMMANDS") +
        ":\n" +
        Array.from(bot.getActions())
          .map(
            (action) =>
              " - /" +
              (Array.isArray(action.command)
                ? action.command[0]
                : action.command) +
              (action.description ? ": " + action.description : "")
          )
          .join("\n");
      bot.answer(message, response);
    },
  };

  export const message: MarcosBotAction = {
    command: "message",
    handler: async (bot, message) => {
      const response = await bot.phraser.generatePhrase(message.chat.id);
      bot.answer(message, response);
    },
  };

  export const beginWith: MarcosBotAction = {
    command: ["beginwith", "beginWith"],
    argRegExp: /(.+)/,
    handler: async (bot, message, argMatch) => {
      let response = await bot.replacePlaceholders(
        argMatch[1],
        message.chat.id
      );
      response = await bot.phraser.extendPhrase(
        message.chat.id,
        response,
        false,
        true
      );
      bot.answer(message, response);
    },
  };

  export const endWith: MarcosBotAction = {
    command: ["endwith", "endWith"],
    argRegExp: /(.+)/,
    handler: async (bot, message, argMatch) => {
      let response = await bot.replacePlaceholders(
        argMatch[1],
        message.chat.id
      );
      response = await bot.phraser.extendPhrase(
        message.chat.id,
        response,
        true,
        false
      );
      bot.answer(message, response);
    },
  };

  export const haiku: MarcosBotAction = {
    command: "haiku",
    handler: async (bot, message, argMatch) => {
      let response: string;
      try {
        response = (
          await bot.phraser.generateHaiku(message.chat.id, argMatch[0])
        ).join("\n");
      } catch {
        response = bot.$("ERR_IMPOSSIBLE_HAIKU");
      }
      bot.answer(message, response);
    },
  };

  export const use: MarcosBotAction = {
    command: "use",
    argRegExp: /(.+)/,
    handler: async (bot, message, argMatch) => {
      let response = await bot.replacePlaceholders(
        argMatch[1],
        message.chat.id
      );
      response = await bot.phraser.extendPhrase(
        message.chat.id,
        response,
        true,
        true
      );
      bot.answer(message, response);
    },
  };

  export const transitionsFrom: MarcosBotAction = {
    command: ["transitionsfrom", "transitionsFrom"], // TODO: Handle empty chains
    argRegExp: /(\S+)$/,
    handler: async (bot, message, argMatch) => {
      const transitions = await bot.phraser.transitionsFrom(
        message.chat.id,
        argMatch[1]
      );
      const response = transitions.map((t) => t[0] + ": " + t[1]).join("\n");
      bot.answer(message, response);
    },
  };

  export const transitionsTo: MarcosBotAction = {
    command: ["transitionsto", "transitionsTo"], // TODO: Handle empty chains
    argRegExp: /(\S+)$/,
    handler: async (bot, message, argMatch) => {
      const transitions = await bot.phraser.transitionsTo(
        message.chat.id,
        argMatch[1]
      );
      const response = transitions.map((t) => t[0] + ": " + t[1]).join("\n");
      bot.answer(message, response);
    },
  };

  export const someone: MarcosBotAction = {
    command: "someone",
    argRegExp: /(.+)/,
    handler: async (bot, message, argMatch) => {
      const response = await bot.replacePlaceholders(
        argMatch[1],
        message.chat.id
      );
      bot.answer(message, response);
    },
  };

  export const addSwords: MarcosBotAction = {
    command: ["addwords", "addWords"],
    argRegExp: /\s*([\w\d-]+)\s*\:(.*\S.*)/,
    handler: async (bot, message, argMatch) => {
      const setName = argMatch[1];
      let swords = argMatch[2].split(",").map((word) => word.trim());
      await bot.addSwords(message.chat.id, setName, swords);
    },
  };

  export const seeSwords: MarcosBotAction = {
    command: ["seewords", "seeWords"],
    argRegExp: /\s*([\w\d-]+)\s*/,
    handler: async (bot, message, argMatch) => {
      const swords = await bot.getSwords(message.chat.id, argMatch[1]);
      bot.answer(message, argMatch[1] + ": " + swords.join(", "));
    },
  };
}
