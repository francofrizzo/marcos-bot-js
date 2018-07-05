import { MarcosBotApplication } from "./MarcosBot"
import "./MarcosBot"
import { Actions } from "./Actions";
export { marcos }

let config = require("../local/config.json");
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
