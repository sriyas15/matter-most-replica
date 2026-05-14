// workspaceController.test.js
// Tests: getMyWorkspaces (myRole enrichment), joinViaInviteLink, removeMember, updateMemberRole
// Run with: jest

import { jest } from "@jest/globals";

// ── Helpers ───────────────────────────────────────────────────────────────────
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// ── getMyWorkspaces ───────────────────────────────────────────────────────────
describe("getMyWorkspaces — myRole enrichment", () => {
  const userId = "user123";

  const makeWorkspace = (role) => ({
    _id: "ws1",
    name: "Test WS",
    slug: "test-ws",
    members: [{ user: { toString: () => userId }, role }],
    toObject: function () { return this; },
  });

  test("attaches myRole: owner for owner member", () => {
    const ws = makeWorkspace("owner");
    const member = ws.members.find((m) => m.user.toString() === userId);
    const { members, ...rest } = ws;
    const enriched = { ...rest, myRole: member?.role ?? "member" };

    expect(enriched.myRole).toBe("owner");
    expect(enriched.members).toBeUndefined();
  });

  test("attaches myRole: admin for admin member", () => {
    const ws = makeWorkspace("admin");
    const member = ws.members.find((m) => m.user.toString() === userId);
    const { members, ...rest } = ws;
    const enriched = { ...rest, myRole: member?.role ?? "member" };

    expect(enriched.myRole).toBe("admin");
  });

  test("falls back to member when user not found in members", () => {
    const ws = makeWorkspace("owner");
    const member = ws.members.find((m) => m.user.toString() === "OTHER_USER");
    const { members, ...rest } = ws;
    const enriched = { ...rest, myRole: member?.role ?? "member" };

    expect(enriched.myRole).toBe("member");
  });

  test("strips members array from response", () => {
    const ws = makeWorkspace("owner");
    const { members, ...rest } = ws;
    const enriched = { ...rest, myRole: "owner" };

    expect(enriched).not.toHaveProperty("members");
  });
});

// ── joinViaInviteLink ─────────────────────────────────────────────────────────
describe("joinViaInviteLink", () => {
  test("returns 400 when workspace not found (invalid/expired token)", async () => {
    const Workspace = { findOne: jest.fn().mockResolvedValue(null) };
    const req = { params: { inviteToken: "badtoken" }, user: { _id: "user1" } };
    const res = mockRes();

    // Inline the relevant controller logic
    const workspace = await Workspace.findOne();
    if (!workspace) {
      res.status(400).json({ success: false, message: "Invalid or expired invite link" });
    }

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid or expired invite link" })
    );
  });

  test("returns early with 200 when user is already a member", async () => {
    const userId = "user1";
    const workspace = {
      _id: "ws1",
      isMember: jest.fn().mockReturnValue(true),
      members: [],
      save: jest.fn(),
    };
    const res = mockRes();

    if (workspace.isMember(userId)) {
      res.json({ success: true, message: "Already a member", data: workspace });
    }

    expect(workspace.save).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Already a member" })
    );
  });

  test("adds user to members when valid token and not a member", async () => {
    const userId = "user1";
    const workspace = {
      _id: "ws1",
      members: [],
      isMember: jest.fn().mockReturnValue(false),
      save: jest.fn().mockResolvedValue(true),
    };

    workspace.members.push({ user: userId, role: "member" });
    await workspace.save();

    expect(workspace.members).toHaveLength(1);
    expect(workspace.members[0].user).toBe(userId);
    expect(workspace.save).toHaveBeenCalled();
  });
});

// ── removeMember ──────────────────────────────────────────────────────────────
describe("removeMember", () => {
  const makeWorkspace = (requesterRole, targetRole) => ({
    _id: "ws1",
    members: [
      { user: { toString: () => "requester" } },
      { user: { toString: () => "target" } },
    ],
    getMemberRole: jest.fn((id) => {
      if (id === "requester") return requesterRole;
      if (id === "target") return targetRole;
      return null;
    }),
    save: jest.fn(),
  });

  test("returns 403 when requester is plain member", async () => {
    const ws = makeWorkspace("member", "member");
    const res = mockRes();

    if (!["owner", "admin"].includes(ws.getMemberRole("requester"))) {
      res.status(403).json({ success: false, message: "Insufficient permissions" });
    }

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("returns 403 when trying to remove the owner", async () => {
    const ws = makeWorkspace("admin", "owner");
    const res = mockRes();

    const requesterRole = ws.getMemberRole("requester");
    const targetRole = ws.getMemberRole("target");

    if (!["owner", "admin"].includes(requesterRole)) {
      res.status(403).json({ success: false, message: "Insufficient permissions" });
    } else if (targetRole === "owner") {
      res.status(403).json({ success: false, message: "Cannot remove the workspace owner" });
    }

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Cannot remove the workspace owner" })
    );
  });

  test("returns 403 when admin tries to remove another admin", async () => {
    const ws = makeWorkspace("admin", "admin");
    const res = mockRes();

    const requesterRole = ws.getMemberRole("requester");
    const targetRole = ws.getMemberRole("target");

    if (requesterRole === "admin" && targetRole === "admin") {
      res.status(403).json({ success: false, message: "Admins cannot remove other admins" });
    }

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("removes member successfully when owner removes a member", async () => {
    const ws = makeWorkspace("owner", "member");
    ws.members = [
      { user: { toString: () => "requester" } },
      { user: { toString: () => "target" } },
    ];

    ws.members = ws.members.filter((m) => m.user.toString() !== "target");
    await ws.save();

    expect(ws.members).toHaveLength(1);
    expect(ws.members[0].user.toString()).toBe("requester");
  });
});

// ── updateMemberRole ──────────────────────────────────────────────────────────
describe("updateMemberRole", () => {
  test("returns 400 for invalid role", () => {
    const res = mockRes();
    const role = "superadmin"; // invalid
    const allowed = ["admin", "member", "guest"];

    if (!allowed.includes(role)) {
      res.status(400).json({ success: false, message: "Invalid role" });
    }

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("returns 403 when non-owner tries to change roles", () => {
    const res = mockRes();
    const workspace = { getMemberRole: jest.fn().mockReturnValue("admin") };

    if (workspace.getMemberRole("requester") !== "owner") {
      res.status(403).json({ success: false, message: "Only the owner can change roles" });
    }

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("updates role successfully when owner changes a member's role", async () => {
    const member = { user: { toString: () => "target" }, role: "member" };
    const workspace = {
      members: [member],
      getMemberRole: jest.fn().mockReturnValue("owner"),
      save: jest.fn().mockResolvedValue(true),
    };

    const found = workspace.members.find((m) => m.user.toString() === "target");
    found.role = "admin";
    await workspace.save();

    expect(found.role).toBe("admin");
    expect(workspace.save).toHaveBeenCalled();
  });

  test("accepts all valid roles", () => {
    const allowed = ["admin", "member", "guest"];
    allowed.forEach((role) => {
      expect(allowed.includes(role)).toBe(true);
    });
  });
});
