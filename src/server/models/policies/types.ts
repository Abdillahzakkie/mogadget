import type { IPolicyStatement } from "@/server/validators/iam";

export interface IPolicy {
  _id: string;
  name: string;
  managed: boolean;
  statements: IPolicyStatement[];
}
