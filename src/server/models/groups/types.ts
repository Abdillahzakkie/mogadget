import type { IPolicyStatement } from "@/server/validators/iam";

export interface IGroup {
  _id: string;
  name: string;
  managed: boolean;
  policyIds: string[];
  statements: IPolicyStatement[];
}
