import { describe, expect, it } from "vitest";
import { Permission } from "../server/validators/iam";
import { SETTINGS_SECTIONS, visibleSections } from "./settingsNav";

describe("settingsNav", () => {
  it("always shows self-service sections (no permission required)", () => {
    const visible = visibleSections([]);
    const keys = visible.map((s) => s.key);
    expect(keys).toContain("profile");
    expect(keys).toContain("security");
    // Permission-gated sections are hidden without the permission.
    expect(keys).not.toContain("iam");
    expect(keys).not.toContain("site");
  });

  it("reveals gated sections when the permission is present", () => {
    const visible = visibleSections([Permission.IamManage, Permission.SettingsWrite]);
    const keys = visible.map((s) => s.key);
    expect(keys).toContain("iam");
    expect(keys).toContain("site");
    expect(keys).not.toContain("audit");
  });

  it("an admin with '*' effectively sees every section", () => {
    const allPerms = SETTINGS_SECTIONS.map((s) => s.permission).filter(Boolean) as string[];
    expect(visibleSections(allPerms)).toHaveLength(SETTINGS_SECTIONS.length);
  });
});
