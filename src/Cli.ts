import { ConfigurationLoader } from "./Config/Config";
import { updateDatabaseSchema } from "./Database/Database";
import { Actions } from "./MarcosBot/Actions";
import { MarcosBot } from "./MarcosBot/MarcosBot";
import { CommandLineMessenger } from "./MarcosBot/Messenger";
export { marcos };

updateDatabaseSchema();
let messenger = new CommandLineMessenger(1, "private");
const config = ConfigurationLoader.loadConfiguration();
var marcos = new MarcosBot(config.botConfig, messenger);
console.log("Test MarcosBot succesfully initialized");

console.log("Registering actions...");
[
  Actions.start,
  Actions.help,
  Actions.message,
  Actions.beginWith,
  Actions.endWith,
  Actions.use,
  Actions.haiku,
  Actions.transitionsFrom,
  Actions.transitionsTo,
  Actions.someone,
  Actions.addSwords,
  Actions.seeSwords,
].forEach((action) => marcos.registerAction(action));

console.log("MarcosBot is listening...");
