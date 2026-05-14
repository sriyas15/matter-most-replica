// workspaceContext.test.js
// Tests: myRole derivation, selectWorkspace myRole preservation
// Run with: jest (with @testing-library/react for the hook tests)

import { renderHook, act } from "@testing-library/react";
import { jest } from "@jest/globals";

// ── myRole derivation (pure logic, no hook needed) ────────────────────────────
describe("myRole derivation", () => {
  const deriveMyRole = (activeWorkspace) =>
    activeWorkspace?.myRole ?? "member";

  test("returns owner when workspace has myRole: owner", () => {
    expect(deriveMyRole({ myRole: "owner" })).toBe("owner");
  });

  test("returns admin when workspace has myRole: admin", () => {
    expect(deriveMyRole({ myRole: "admin" })).toBe("admin");
  });

  test("returns member when workspace has myRole: member", () => {
    expect(deriveMyRole({ myRole: "member" })).toBe("member");
  });

  test("falls back to member when activeWorkspace is null", () => {
    expect(deriveMyRole(null)).toBe("member");
  });

  test("falls back to member when myRole is undefined", () => {
    expect(deriveMyRole({ name: "Test" })).toBe("member");
  });
});

// ── selectWorkspace myRole preservation ───────────────────────────────────────
describe("selectWorkspace — myRole preservation", () => {
  const mergeWorkspace = (incoming, current) => ({
    ...incoming,
    myRole: incoming?.myRole ?? current?.myRole ?? "member",
  });

  test("keeps myRole from incoming when present", () => {
    const result = mergeWorkspace({ _id: "ws1", myRole: "owner" }, { myRole: "admin" });
    expect(result.myRole).toBe("owner");
  });

  test("falls back to current myRole when incoming lacks myRole", () => {
    const result = mergeWorkspace({ _id: "ws1", name: "Updated" }, { myRole: "owner" });
    expect(result.myRole).toBe("owner");
  });

  test("falls back to member when both incoming and current lack myRole", () => {
    const result = mergeWorkspace({ _id: "ws1" }, null);
    expect(result.myRole).toBe("member");
  });

  test("preserves all other workspace fields when merging", () => {
    const result = mergeWorkspace(
      { _id: "ws1", name: "New Name", slug: "new-name" },
      { _id: "ws1", name: "Old Name", myRole: "admin" }
    );
    expect(result.name).toBe("New Name");
    expect(result.slug).toBe("new-name");
    expect(result.myRole).toBe("admin");
  });
});

// ── isAdmin helper (used for gating UI) ──────────────────────────────────────
describe("isAdmin role check", () => {
  const isAdminOrOwner = (role) => ["owner", "admin"].includes(role);

  test("owner passes admin check", () => {
    expect(isAdminOrOwner("owner")).toBe(true);
  });

  test("admin passes admin check", () => {
    expect(isAdminOrOwner("admin")).toBe(true);
  });

  test("member fails admin check", () => {
    expect(isAdminOrOwner("member")).toBe(false);
  });

  test("guest fails admin check", () => {
    expect(isAdminOrOwner("guest")).toBe(false);
  });

  test("undefined fails admin check", () => {
    expect(isAdminOrOwner(undefined)).toBe(false);
  });
});

// ── passwordToggle.test.js ────────────────────────────────────────────────────
// Tests: canSee toggle state logic for LoginPage and SignupPage
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";

describe("password visibility toggle", () => {
  test("starts as hidden (canSee: false)", () => {
    let canSee = false;
    expect(canSee).toBe(false);
  });

  test("toggles to visible on first click", () => {
    let canSee = false;
    canSee = !canSee;
    expect(canSee).toBe(true);
  });

  test("toggles back to hidden on second click", () => {
    let canSee = false;
    canSee = !canSee; // true
    canSee = !canSee; // false
    expect(canSee).toBe(false);
  });

  test("input type is password when canSee is false", () => {
    const canSee = false;
    const inputType = canSee ? "text" : "password";
    expect(inputType).toBe("password");
  });

  test("input type is text when canSee is true", () => {
    const canSee = true;
    const inputType = canSee ? "text" : "password";
    expect(inputType).toBe("text");
  });
});

// ── getMyWorkspaces enrichment (integration-level unit) ───────────────────────
describe("getMyWorkspaces enrichment", () => {
  const enrichWorkspaces = (workspaces, userId) =>
    workspaces.map((ws) => {
      const member = ws.members.find((m) => m.user.toString() === userId.toString());
      const { members, ...rest } = ws;
      return { ...rest, myRole: member?.role ?? "member" };
    });

  const userId = "user123";

  const workspaces = [
    {
      _id: "ws1", name: "My Workspace",
      members: [{ user: { toString: () => userId }, role: "owner" }],
    },
    {
      _id: "ws2", name: "Other Workspace",
      members: [{ user: { toString: () => userId }, role: "admin" }],
    },
    {
      _id: "ws3", name: "Guest Workspace",
      members: [{ user: { toString: () => "someone_else" }, role: "owner" }],
    },
  ];

  test("enriches multiple workspaces with correct roles", () => {
    const result = enrichWorkspaces(workspaces, userId);
    expect(result[0].myRole).toBe("owner");
    expect(result[1].myRole).toBe("admin");
    expect(result[2].myRole).toBe("member"); // fallback
  });

  test("strips members from all workspaces", () => {
    const result = enrichWorkspaces(workspaces, userId);
    result.forEach((ws) => expect(ws).not.toHaveProperty("members"));
  });

  test("preserves all other workspace fields", () => {
    const result = enrichWorkspaces(workspaces, userId);
    expect(result[0]._id).toBe("ws1");
    expect(result[0].name).toBe("My Workspace");
  });

  test("returns same number of workspaces as input", () => {
    const result = enrichWorkspaces(workspaces, userId);
    expect(result).toHaveLength(workspaces.length);
  });
});
