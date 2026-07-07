import { describe, it, expect } from "vitest";
import { compileStatements, expandActions, Permission } from "./iam";

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
