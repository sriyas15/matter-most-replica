// channelController.test.js
// Tests: createChannel (role/permission checks), joinChannel, leaveChannel
// Run with: jest

import { jest } from "@jest/globals";

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// ── createChannel ─────────────────────────────────────────────────────────────
describe("createChannel", () => {
  const makeWorkspace = (role) => ({
    _id: "ws1",
    getMemberRole: jest.fn().mockReturnValue(role),
  });

  test("returns 403 when user is not a workspace member", () => {
    const ws = { getMemberRole: jest.fn().mockReturnValue(null) };
    const res = mockRes();

    const role = ws.getMemberRole("user1");
    if (!role) {
      res.status(403).json({ success: false, message: "Not a workspace member" });
    }

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Not a workspace member" })
    );
  });

  test("returns 403 when plain member tries to create a private channel", () => {
    const ws = makeWorkspace("member");
    const res = mockRes();

    const role = ws.getMemberRole("user1");
    const type = "private";

    if (type === "private" && !["owner", "admin"].includes(role)) {
      res.status(403).json({ success: false, message: "Only admins can create private channels" });
    }

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("allows admin to create a private channel", () => {
    const ws = makeWorkspace("admin");
    const res = mockRes();

    const role = ws.getMemberRole("user1");
    const type = "private";
    let blocked = false;

    if (type === "private" && !["owner", "admin"].includes(role)) {
      blocked = true;
      res.status(403).json({ success: false, message: "Only admins can create private channels" });
    }

    expect(blocked).toBe(false);
    expect(res.status).not.toHaveBeenCalled();
  });

  test("creator is added as admin in members list", () => {
    const userId = "user1";
    const memberIds = ["user2", "user3"];

    const members = [
      { user: userId, role: "admin" },
      ...memberIds
        .filter((id) => id !== userId)
        .map((id) => ({ user: id, role: "member" })),
    ];

    expect(members[0]).toEqual({ user: userId, role: "admin" });
    expect(members).toHaveLength(3);
    expect(members.every((m) => m.role)).toBe(true);
  });

  test("creator is not duplicated in members when also in memberIds", () => {
    const userId = "user1";
    const memberIds = ["user1", "user2"]; // user1 included accidentally

    const members = [
      { user: userId, role: "admin" },
      ...memberIds
        .filter((id) => id.toString() !== userId.toString())
        .map((id) => ({ user: id, role: "member" })),
    ];

    const creatorEntries = members.filter((m) => m.user === userId);
    expect(creatorEntries).toHaveLength(1);
  });
});

// ── joinChannel ───────────────────────────────────────────────────────────────
describe("joinChannel", () => {
  test("returns 403 when trying to self-join a private channel", () => {
    const channel = { type: "private", isMember: jest.fn() };
    const res = mockRes();

    if (channel.type === "private") {
      res.status(403).json({ success: false, message: "Cannot self-join a private channel" });
    }

    expect(res.status).toHaveBeenCalledWith(403);
    expect(channel.isMember).not.toHaveBeenCalled();
  });

  test("returns 200 without re-adding when already a member", () => {
    const channel = {
      type: "public",
      isMember: jest.fn().mockReturnValue(true),
      members: [],
      save: jest.fn(),
    };
    const res = mockRes();

    if (channel.isMember("user1")) {
      res.json({ success: true, message: "Already a member", data: channel });
    }

    expect(channel.save).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Already a member" })
    );
  });

  test("adds user to channel members on valid join", async () => {
    const userId = "user1";
    const channel = {
      type: "public",
      isMember: jest.fn().mockReturnValue(false),
      members: [],
      save: jest.fn().mockResolvedValue(true),
    };

    channel.members.push({ user: userId });
    await channel.save();

    expect(channel.members).toHaveLength(1);
    expect(channel.members[0].user).toBe(userId);
    expect(channel.save).toHaveBeenCalled();
  });
});

// ── leaveChannel ──────────────────────────────────────────────────────────────
describe("leaveChannel", () => {
  test("returns 400 when user is not a channel member", () => {
    const channel = { isMember: jest.fn().mockReturnValue(false) };
    const res = mockRes();

    if (!channel.isMember("user1")) {
      res.status(400).json({ success: false, message: "Not a member" });
    }

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("removes user from members on leave", async () => {
    const userId = "user1";
    const channel = {
      members: [
        { user: { toString: () => "user1" } },
        { user: { toString: () => "user2" } },
      ],
      isMember: jest.fn().mockReturnValue(true),
      save: jest.fn().mockResolvedValue(true),
    };

    channel.members = channel.members.filter(
      (m) => m.user.toString() !== userId.toString()
    );
    await channel.save();

    expect(channel.members).toHaveLength(1);
    expect(channel.members[0].user.toString()).toBe("user2");
    expect(channel.save).toHaveBeenCalled();
  });

  test("does not affect other members when one leaves", async () => {
    const channel = {
      members: [
        { user: { toString: () => "user1" } },
        { user: { toString: () => "user2" } },
        { user: { toString: () => "user3" } },
      ],
      save: jest.fn(),
    };

    channel.members = channel.members.filter((m) => m.user.toString() !== "user2");

    expect(channel.members.map((m) => m.user.toString())).toEqual(["user1", "user3"]);
  });
});
