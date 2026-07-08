import pino from "pino";

let logger: pino.Logger | undefined;
export function getLogger(): pino.Logger {
  return (logger ??= pino({ level: process.env.LOG_LEVEL ?? "info" }));
}
