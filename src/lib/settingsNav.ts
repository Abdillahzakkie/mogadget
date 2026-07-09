import { routes } from "../constants/routes";
import { Permission } from "../server/validators/iam";

export interface ISettingsSection {
  key: string;
  label: string;
  description: string;
  href: string;
  // Permission required to see/use the section. `undefined` = any authenticated admin (self-
  // service). The server enforces the same permission independently at each route.
  permission?: string;
}

// Single source of truth for the settings sub-sections, consumed by both the nav and the home
// grid so they never drift.
export const SETTINGS_SECTIONS: ISettingsSection[] = [
  {
    key: "profile",
    label: "Profile",
    description: "Your display name, avatar, and account details.",
    href: routes.adminSettingsProfile,
  },
  {
    key: "security",
    label: "Security",
    description: "Password, passkeys, and two-factor authentication.",
    href: routes.adminSettingsSecurity,
  },
  {
    key: "site",
    label: "Site config",
    description: "Contact channels, business identity, SEO, and toggles.",
    href: routes.adminSettingsSite,
    permission: Permission.SettingsWrite,
  },
  {
    key: "analytics",
    label: "Analytics",
    description: "Click trends across WhatsApp and Instagram.",
    href: routes.adminSettingsAnalytics,
    permission: Permission.AnalyticsRead,
  },
  {
    key: "audit",
    label: "Audit log",
    description: "A record of every admin action.",
    href: routes.adminSettingsAudit,
    permission: Permission.AuditRead,
  },
  {
    key: "iam",
    label: "Access (IAM)",
    description: "Users, groups, and permission policies.",
    href: routes.adminSettingsIam,
    permission: Permission.IamManage,
  },
];

// The sections a permission set may access. `permissions` is the effective set from /admin/me.
export function visibleSections(permissions: string[]): ISettingsSection[] {
  return SETTINGS_SECTIONS.filter((s) => !s.permission || permissions.includes(s.permission));
}
