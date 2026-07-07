export interface IUser {
  _id: string;
  username: string;
  passwordHash: string;
  attachedPolicyIds: string[];
  groupIds: string[];
  createdAt: Date;
  updatedAt: Date;
}
export interface IUserCreateInput {
  username: string;
  passwordHash: string;
  groupIds?: string[];
  attachedPolicyIds?: string[];
}
