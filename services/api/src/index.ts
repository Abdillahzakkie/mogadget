import { serve } from "@hono/node-server";
import { bootstrap } from "@mogadget/core";
import { createApp } from "./app";

const port = Number(process.env.PORT ?? 4000);
await bootstrap();
serve({ fetch: createApp().fetch, port });
console.log(`@mogadget/api on :${port}`);
