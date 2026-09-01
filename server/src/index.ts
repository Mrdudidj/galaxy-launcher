import { buildApp } from "./app.js";
import { env } from "./lib/env.js";

const app = buildApp();

app
  .listen({ port: env.PORT, host: "0.0.0.0" })
  .then((address: string) => {
    app.log.info(`Galaxy Launcher server listening at ${address}`);
  })
  .catch((error: unknown) => {
    app.log.error(error);
    process.exit(1);
  });
