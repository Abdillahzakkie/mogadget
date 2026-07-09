export const Permission = {
  ProductsWrite: "products:write",
  ProductsRead: "products:read",
  AnalyticsRead: "analytics:read",
  AuditRead: "audit:read",
  IamManage: "iam:manage",
  SettingsWrite: "settings:write",
} as const;
export type TPermission = (typeof Permission)[keyof typeof Permission];
export const ALL_PERMISSIONS: TPermission[] = Object.values(Permission);

export interface IPolicyStatement {
  effect: "Allow" | "Deny";
  actions: string[];
}

export function isValidPolicyAction(a: string): boolean {
  if (a === "*") return true;
  if (a.endsWith(":*")) return ALL_PERMISSIONS.some((p) => p.startsWith(a.slice(0, -1)));
  return (ALL_PERMISSIONS as string[]).includes(a);
}
export function isValidPolicyStatement(s: IPolicyStatement): boolean {
  return (
    (s.effect === "Allow" || s.effect === "Deny") &&
    Array.isArray(s.actions) &&
    s.actions.every(isValidPolicyAction)
  );
}
export function expandActions(actions: string[]): TPermission[] {
  const out = new Set<TPermission>();
  for (const a of actions) {
    if (a === "*") {
      ALL_PERMISSIONS.forEach((p) => out.add(p));
    } else if (a.endsWith(":*")) {
      const prefix = a.slice(0, -1);
      ALL_PERMISSIONS.filter((p) => p.startsWith(prefix)).forEach((p) => out.add(p));
    } else if ((ALL_PERMISSIONS as string[]).includes(a)) {
      out.add(a as TPermission);
    }
  }
  return Array.from(out);
}
export function compileStatements(statements: IPolicyStatement[]): TPermission[] {
  const allow = new Set<TPermission>();
  const deny = new Set<TPermission>();
  for (const s of statements) {
    const target = s.effect === "Deny" ? deny : allow;
    for (const p of expandActions(s.actions)) target.add(p);
  }
  for (const p of Array.from(deny)) allow.delete(p);
  return Array.from(allow).sort();
}

export const BUILTIN_POLICIES = [
  {
    name: "AdministratorAccess",
    managed: true,
    statements: [{ effect: "Allow", actions: ["*"] }] as IPolicyStatement[],
  },
] as const;
export const BUILTIN_GROUPS = [
  { name: "Administrators", managed: true, policyNames: ["AdministratorAccess"] },
] as const;

// Edge-proxy access map: which permission a UI section requires.
export const SECTION_PERMISSIONS: Array<{ prefix: string; permission: TPermission }> = [
  { prefix: "/admin", permission: Permission.ProductsWrite },
];
