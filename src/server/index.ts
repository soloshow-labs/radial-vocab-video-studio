import {existsSync} from "node:fs";
import {buildServer} from "./app";
import {loadServerConfig} from "./config";

if (existsSync(".env")) process.loadEnvFile(".env");
const config = loadServerConfig();
const app = buildServer(config);

await app.listen({host: config.host, port: config.port});
console.log(`Radial Vocab server listening on http://${config.host}:${config.port}`);
