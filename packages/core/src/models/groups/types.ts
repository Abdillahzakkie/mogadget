import type { IPolicyStatement } from "@mogadget/contracts/iam";

export interface IGroup {
  _id: string;
  name: string;
  managed: boolean;
  policyIds: string[];
  statements: IPolicyStatement[];
}
