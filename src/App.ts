import { MarcosBot, MarcosBotConfiguration } from "./MarcosBot/MarcosBot"
import { TelegramBotMessenger } from "./MarcosBot/Messenger"
import { Actions } from "./MarcosBot/Actions";
export { marcos }

// Read configuration file
// It is assumed that the configuration file is well-formed
let config : { token: string, botConfig: MarcosBotConfiguration }
try {
    config = require("../local/config.json");
}
catch (e) {
    console.log("Error: The configuration file (local/config.json) could not be found");
    process.exit(1);
}

let messenger = new TelegramBotMessenger(config!.token);
var marcos = new MarcosBot(config!.botConfig, messenger);
console.log("MarcosBot succesfully initialized");

console.log("Registering actions...");
[
    Actions.start,
    Actions.message,
    Actions.beginWith,
    Actions.endWith,
    Actions.use,
    Actions.transitionsFrom,
    Actions.transitionsTo,
    Actions.someone
].forEach(action =>
    marcos.registerAction(action)
);

console.log("MarcosBot is listening...")
