import { MarcosBotApplication, MarcosBotConfiguration } from "./MainApp/MarcosBot"
import "./MainApp/MarcosBot"
import { Actions } from "./MainApp/Actions";
import { exists } from "fs";
export { marcos }

let config : MarcosBotConfiguration;
try {
    config = require("../local/config.json");
} catch (e) {
    console.log("Error: The configuration file (local/config.json) could not be found");
    process.exit(1);
}
// Note that it assumed that the config file is well-formed
var marcos = new MarcosBotApplication(config);
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
