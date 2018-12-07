import { MarcosBot, MarcosBotConfiguration } from "./MarcosBot/MarcosBot"
import { CommandLineMessenger } from "./MarcosBot/Messenger"
import { updateDatabaseSchema } from "./Database/Database"
import { Actions } from "./MarcosBot/Actions";
export { marcos }

updateDatabaseSchema();
let messenger = new CommandLineMessenger(1, "private");
var marcos = new MarcosBot(require("../default/config.json").botConfig, messenger);
console.log("Test MarcosBot succesfully initialized");

console.log("Registering actions...");
[
    Actions.start,
    Actions.help,
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
