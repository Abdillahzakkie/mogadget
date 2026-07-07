import type { IPolicyStatement } from "@mogadget/contracts/iam";

export interface IPolicy {
  _id: string;
  name: string;
  managed: boolean;
  statements: IPolicyStatement[];
}
