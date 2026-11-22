import { beforeEach, describe, expect, it, vi } from "vitest";
import { compare, hash } from "bcrypt";
import {
  BCRYPT_COST,
  PASSWORD_MIN,
  accountDeletionSchema,
  changePassword,
  deleteAccount,
  passwordChangeSchema,
  type AccountStore,
  type PasswordHasher,
} from "./account";

// Real bcrypt, but at the lowest cost so the tests stay fast.
const hasher: PasswordHasher = {
  compare,
  hash: vi.fn((plain: string) => hash(plain, 4)),
};

type Row = { passwordHash: string | null; email: string | null };

function memoryStore(rows: Record<string, Row>) {
  const store: AccountStore & { deleted: string[] } = {
    deleted: [],
    async findCredentials(userId) {
      return rows[userId] ?? null;
    },
    async setPasswordHash(userId, passwordHash) {
      rows[userId] = { ...rows[userId], passwordHash };
    },
    async deleteUser(userId) {
      store.deleted.push(userId);
      delete rows[userId];
    },
  };
  return store;
}

const change = (currentPassword: string, newPassword: string, confirmPassword = newPassword) =>
  passwordChangeSchema.parse({ currentPassword, newPassword, confirmPassword });

describe("passwordChangeSchema", () => {
  it(`needs a new password of at least ${PASSWORD_MIN} characters`, () => {
    const short = passwordChangeSchema.safeParse({ currentPassword: "old-pass", newPassword: "short", confirmPassword: "short" });
    expect(short.error?.issues[0]?.message).toBe(`Choose a new password of at least ${PASSWORD_MIN} characters.`);
  });

  it("needs the confirmation to match", () => {
    const mismatch = passwordChangeSchema.safeParse({ currentPassword: "old-pass", newPassword: "new-password", confirmPassword: "new-passwort" });
    expect(mismatch.error?.issues[0]?.message).toBe("The new passwords don't match.");
  });

  it("refuses reusing the current password", () => {
    const same = passwordChangeSchema.safeParse({ currentPassword: "same-password", newPassword: "same-password", confirmPassword: "same-password" });
    expect(same.error?.issues[0]?.message).toBe("Choose a password different from your current one.");
  });

  it("refuses extra keys such as a user id", () => {
    expect(
      passwordChangeSchema.safeParse({ currentPassword: "a", newPassword: "new-password", confirmPassword: "new-password", userId: "x" }).success,
    ).toBe(false);
  });
});

describe("changePassword", () => {
  let rows: Record<string, Row>;
  beforeEach(async () => {
    rows = {
      alice: { passwordHash: await hash("correct horse", 4), email: "alice@example.com" },
      bob: { passwordHash: await hash("bobs password", 4), email: "bob@example.com" },
      gina: { passwordHash: null, email: "gina@example.com" },
    };
  });

  it("changes the password after checking the current one", async () => {
    const store = memoryStore(rows);
    expect(await changePassword(store, hasher, "alice", change("correct horse", "battery staple"))).toEqual({ ok: true });
    expect(await compare("battery staple", rows.alice.passwordHash!)).toBe(true);
    expect(await compare("correct horse", rows.alice.passwordHash!)).toBe(false);
    expect(hasher.hash).toHaveBeenCalledWith("battery staple", BCRYPT_COST);
  });

  it("refuses a wrong current password and changes nothing", async () => {
    const before = rows.alice.passwordHash;
    const store = memoryStore(rows);
    expect(await changePassword(store, hasher, "alice", change("wrong guess", "battery staple"))).toEqual({ ok: false, reason: "wrong-password" });
    expect(rows.alice.passwordHash).toBe(before);
  });

  it("only ever touches the given user: another user's password doesn't work", async () => {
    const store = memoryStore(rows);
    expect(await changePassword(store, hasher, "alice", change("bobs password", "battery staple"))).toEqual({ ok: false, reason: "wrong-password" });
    expect(await compare("bobs password", rows.bob.passwordHash!)).toBe(true);
  });

  it("says Google-only accounts have no password", async () => {
    expect(await changePassword(memoryStore(rows), hasher, "gina", change("anything", "battery staple"))).toEqual({ ok: false, reason: "no-password" });
  });

  it("is not-found for a deleted user", async () => {
    expect(await changePassword(memoryStore(rows), hasher, "ghost", change("x", "battery staple"))).toEqual({ ok: false, reason: "not-found" });
  });
});

describe("accountDeletionSchema", () => {
  it("needs the typed confirmation, ignoring case and spaces", () => {
    expect(accountDeletionSchema.safeParse({ confirmation: "  Delete My Account " }).success).toBe(true);
    expect(accountDeletionSchema.safeParse({ confirmation: "delete" }).success).toBe(false);
    expect(accountDeletionSchema.safeParse({ confirmation: "" }).success).toBe(false);
    expect(accountDeletionSchema.safeParse({}).success).toBe(false);
  });

  it("refuses extra keys such as a user id", () => {
    expect(accountDeletionSchema.safeParse({ confirmation: "delete my account", userId: "bob" }).success).toBe(false);
  });
});

describe("deleteAccount", () => {
  let rows: Record<string, Row>;
  beforeEach(async () => {
    rows = {
      alice: { passwordHash: await hash("correct horse", 4), email: "alice@example.com" },
      gina: { passwordHash: null, email: "gina@example.com" },
    };
  });

  it("deletes a password account only with the right password", async () => {
    const store = memoryStore(rows);
    expect(await deleteAccount(store, hasher, "alice", { confirmation: "delete my account" })).toEqual({ ok: false, reason: "wrong-password" });
    expect(await deleteAccount(store, hasher, "alice", { confirmation: "delete my account", password: "nope" })).toEqual({
      ok: false,
      reason: "wrong-password",
    });
    expect(store.deleted).toEqual([]);
    expect(await deleteAccount(store, hasher, "alice", { confirmation: "delete my account", password: "correct horse" })).toEqual({ ok: true });
    expect(store.deleted).toEqual(["alice"]);
  });

  it("deletes a Google-only account with the typed confirmation alone", async () => {
    const store = memoryStore(rows);
    expect(await deleteAccount(store, hasher, "gina", { confirmation: "delete my account" })).toEqual({ ok: true });
    expect(store.deleted).toEqual(["gina"]);
  });

  it("is not-found when the account is already gone", async () => {
    expect(await deleteAccount(memoryStore(rows), hasher, "ghost", { confirmation: "delete my account" })).toEqual({ ok: false, reason: "not-found" });
  });
});
