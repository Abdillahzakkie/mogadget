import { describe, expect, it } from "vitest";
import {
  compileStatements,
  expandActions,
  isValidPolicyAction,
  isValidPolicyStatement,
  Permission,
} from "./iam";

describe("policy action validation", () => {
  it("accepts wildcard, resource-wildcard and exact actions", () => {
    expect(isValidPolicyAction("*")).toBe(true);
    expect(isValidPolicyAction("products:*")).toBe(true);
    expect(isValidPolicyAction(Permission.ProductsWrite)).toBe(true);
  });
  it("rejects unknown actions", () => {
    expect(isValidPolicyAction("billing:*")).toBe(false);
    expect(isValidPolicyAction("nonsense")).toBe(false);
  });
  it("validates whole statements", () => {
    expect(isValidPolicyStatement({ effect: "Allow", actions: ["*"] })).toBe(true);
    expect(isValidPolicyStatement({ effect: "Deny", actions: ["products:*"] })).toBe(true);
    expect(isValidPolicyStatement({ effect: "Allow", actions: ["bogus"] })).toBe(false);
    // @ts-expect-error invalid effect
    expect(isValidPolicyStatement({ effect: "Maybe", actions: [] })).toBe(false);
  });
});

describe("expandActions", () => {
  it("silently ignores unknown actions instead of granting them", () => {
    expect(expandActions(["billing:read", "nonsense"])).toEqual([]);
    expect(expandActions(["billing:*", Permission.ProductsWrite])).toEqual([
      Permission.ProductsWrite,
    ]);
  });
});

describe("compileStatements", () => {
  it("expands a wildcard action to all permissions", () => {
    const perms = compileStatements([{ effect: "Allow", actions: ["*"] }]);
    expect(perms).toContain(Permission.ProductsWrite);
    expect(perms).toContain(Permission.IamManage);
  });
  it("lets an explicit Deny override an Allow", () => {
    const perms = compileStatements([
      { effect: "Allow", actions: ["products:*"] },
      { effect: "Deny", actions: [Permission.ProductsWrite] },
    ]);
    expect(perms).not.toContain(Permission.ProductsWrite);
    expect(perms).toContain(Permission.ProductsRead);
  });
  it("expands a resource wildcard", () => {
    expect(expandActions(["products:*"])).toEqual(
      expect.arrayContaining([Permission.ProductsWrite, Permission.ProductsRead]),
    );
  });
});
