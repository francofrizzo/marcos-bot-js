import { MarcosBot, MarcosBotConfiguration } from "./MarcosBot/MarcosBot"
import { CommandLineMessenger } from "./MarcosBot/Messenger"
import { updateDatabaseSchema } from "./Database/Database"
import { Actions } from "./MarcosBot/Actions";
export { marcos }

// Dummy config
let botConfig : MarcosBotConfiguration = {
        "locales": {
            "WELCOME_MESSAGE": "Hello! I am Marcos the Bot. Talk to me and I will generate random messages based on the things you say.",
            "ERR_MALFORMED_ARGUMENTS": "The arguments provided are not correct",
            "ERR_UNKNOWN_COMMAND": "I don't understand that command"
        },
        "substitutePeople": true,
        "listenToAyyLmao": true,
        "mutationProbability": 0.2
    };

updateDatabaseSchema();
let messenger = new CommandLineMessenger(1, "private");
var marcos = new MarcosBot(botConfig, messenger);
console.log("Test MarcosBot succesfully initialized");

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
    Actions.addSwords,
    Actions.seeSwords
].forEach(action =>
    marcos.registerAction(action)
);

console.log("MarcosBot is listening...")
