import client from "prom-client";

export enum IOperationType {
  Read = "read",
  Write = "write",
}
const reg = client.register;
export const databaseResponseTimeHistogram =
  (reg.getSingleMetric("db_response_seconds") as client.Histogram<string>) ??
  new client.Histogram({
    name: "db_response_seconds",
    help: "DB op time",
    labelNames: ["operation", "collection", "method", "success"],
    buckets: [0.01, 0.05, 0.1, 0.5, 1],
  });
export const restResponseTimeHistogram =
  (reg.getSingleMetric("rest_response_seconds") as client.Histogram<string>) ??
  new client.Histogram({
    name: "rest_response_seconds",
    help: "REST time",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.05, 0.1, 0.5, 1, 3],
  });
