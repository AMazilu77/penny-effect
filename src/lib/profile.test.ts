import { describe, expect, it } from "vitest";
import {
  BIO_MAX,
  NAME_MAX,
  charCount,
  initials,
  normalizeBio,
  normalizeName,
  profileUpdateSchema,
  signInMethodLabel,
  signInMethods,
} from "./profile";

describe("profileUpdateSchema: name", () => {
  it("trims and collapses whitespace", () => {
    expect(profileUpdateSchema.parse({ name: "  Ada \n  Lovelace " })).toEqual({ name: "Ada Lovelace" });
  });

  it("refuses an empty or whitespace-only name", () => {
    for (const name of ["", "   ", "\u200B\u200B"]) {
      const result = profileUpdateSchema.safeParse({ name });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("Enter a display name.");
    }
  });

  it(`allows exactly ${NAME_MAX} characters and refuses ${NAME_MAX + 1}`, () => {
    expect(profileUpdateSchema.safeParse({ name: "a".repeat(NAME_MAX) }).success).toBe(true);
    const tooLong = profileUpdateSchema.safeParse({ name: "a".repeat(NAME_MAX + 1) });
    expect(tooLong.success).toBe(false);
    expect(tooLong.error?.issues[0]?.message).toBe(`Keep your name to ${NAME_MAX} characters.`);
  });

  it("removes bidirectional overrides and zero-width characters", () => {
    expect(profileUpdateSchema.parse({ name: "Ev\u202Eil\u200B Bob" })).toEqual({ name: "Evil Bob" });
  });

  it("refuses a non-string name", () => {
    expect(profileUpdateSchema.safeParse({ name: 42 }).success).toBe(false);
  });
});

describe("profileUpdateSchema: bio", () => {
  it(`allows ${BIO_MAX} characters and refuses ${BIO_MAX + 1}`, () => {
    expect(profileUpdateSchema.safeParse({ bio: "x".repeat(BIO_MAX) }).success).toBe(true);
    const tooLong = profileUpdateSchema.safeParse({ bio: "x".repeat(BIO_MAX + 1) });
    expect(tooLong.success).toBe(false);
    expect(tooLong.error?.issues[0]?.message).toBe(`Keep your bio to ${BIO_MAX} characters.`);
  });

  it("counts an emoji as one character, like the live counter", () => {
    expect(charCount("🌍")).toBe(1);
    expect(profileUpdateSchema.safeParse({ bio: "🌍".repeat(BIO_MAX) }).success).toBe(true);
    expect(profileUpdateSchema.safeParse({ bio: "🌍".repeat(BIO_MAX + 1) }).success).toBe(false);
  });

  it("measures the length after trimming", () => {
    expect(profileUpdateSchema.safeParse({ bio: `   ${"x".repeat(BIO_MAX)}   ` }).success).toBe(true);
  });

  it("stores an empty bio, or null, as no bio", () => {
    expect(profileUpdateSchema.parse({ bio: "   " })).toEqual({ bio: null });
    expect(profileUpdateSchema.parse({ bio: null })).toEqual({ bio: null });
  });

  it("keeps HTML as plain text (it's escaped when shown, never rendered)", () => {
    expect(profileUpdateSchema.parse({ bio: "<b>hi</b> **there**" })).toEqual({ bio: "<b>hi</b> **there**" });
  });

  it("refuses absurdly long input before doing any work", () => {
    expect(profileUpdateSchema.safeParse({ bio: "x".repeat(10_000) }).success).toBe(false);
  });
});

describe("profileUpdateSchema: the request as a whole", () => {
  it("accepts the privacy choice on its own", () => {
    expect(profileUpdateSchema.parse({ showNameInTotals: true })).toEqual({ showNameInTotals: true });
    expect(profileUpdateSchema.safeParse({ showNameInTotals: "yes" }).success).toBe(false);
  });

  it("refuses an empty update", () => {
    expect(profileUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("refuses keys it doesn't know, such as another user's id or a new email", () => {
    expect(profileUpdateSchema.safeParse({ name: "Ada", userId: "someone-else" }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ email: "new@example.com" }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ role: "ADMIN" }).success).toBe(false);
  });
});

describe("normalizers", () => {
  it("normalizeName makes one line", () => {
    expect(normalizeName("a\r\nb\tc")).toBe("a b c");
  });

  it("normalizeBio keeps single newlines, at most one blank line, Unix line endings", () => {
    expect(normalizeBio("one\r\ntwo\n\n\n\nthree  \n")).toBe("one\ntwo\n\nthree");
  });
});

describe("signInMethods", () => {
  it("names how the user signs in", () => {
    expect(signInMethodLabel(signInMethods(true, []))).toBe("Email and password");
    expect(signInMethodLabel(signInMethods(false, ["google"]))).toBe("Google");
    expect(signInMethodLabel(signInMethods(true, ["google"]))).toBe("Email and password and Google");
    expect(signInMethodLabel(signInMethods(false, ["github"]))).toBe("Unknown");
  });
});

describe("initials", () => {
  it("uses the first and last word of the name", () => {
    expect(initials("Ada King Lovelace")).toBe("AL");
    expect(initials("plato")).toBe("P");
    expect(initials("  émile   zola ")).toBe("ÉZ");
  });

  it("falls back to the email, then to ?", () => {
    expect(initials(null, "zoe@example.com")).toBe("Z");
    expect(initials("", "")).toBe("?");
    expect(initials("!!!", null)).toBe("?");
  });
});
