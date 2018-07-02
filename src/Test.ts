import { MarcosBotApplication } from "./MarcosBot"
export { marcos }

let config = require("../local/config.json");
var marcos = new MarcosBotApplication(config);
console.log("MarcosBot succesfully initialized")
console.log("MarcosBot is listening...")
