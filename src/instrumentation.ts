// Server boot hook (replaces the standalone API service's index.ts): connect Mongo +
// Redis and enforce the production secret guard once per server start.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootstrap } = await import("@/server");
    await bootstrap();
  }
}
