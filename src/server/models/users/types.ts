export interface IUserPreferences {
  timezone?: string;
  dateFormat?: string;
}
export interface IUser {
  _id: string;
  username: string;
  passwordHash: string;
  attachedPolicyIds: string[];
  groupIds: string[];
  // Profile fields (self-service via /admin/settings/profile). `email` is metadata only — the
  // app has no email infrastructure, so it is never used for login, notifications, or recovery.
  displayName?: string;
  email?: string;
  avatarKey?: string;
  preferences?: IUserPreferences;
  createdAt: Date;
  updatedAt: Date;
}
export interface IUserCreateInput {
  username: string;
  passwordHash: string;
  groupIds?: string[];
  attachedPolicyIds?: string[];
  displayName?: string;
  email?: string;
}

// The safe shape returned to clients — never includes `passwordHash`.
export interface IUserProfileDto {
  _id: string;
  username: string;
  displayName: string;
  email: string;
  avatarKey: string;
  preferences: IUserPreferences;
  groupIds: string[];
  attachedPolicyIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserProfilePatch {
  displayName?: string;
  email?: string;
  avatarKey?: string;
  preferences?: IUserPreferences;
}
