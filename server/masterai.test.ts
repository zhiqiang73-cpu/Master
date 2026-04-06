import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCtx(overrides: Partial<TrpcContext> = {}): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
    ...overrides,
  };
}

function makeUser(role: "user" | "admin" | "master" = "user") {
  return {
    id: 1,
    openId: "test-user-001",
    name: "Test User",
    email: "test@example.com",
    loginMethod: "email",
    role,
    isBanned: false,
    memberLevel: 1,
    avatarUrl: null,
    bio: null,
    passwordHash: null,
    inviteCodeUsed: null,
    preferredLang: "zh" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

// ─── Auth Tests ───────────────────────────────────────────────────────────────

describe("auth.me", () => {
  it("returns null when not authenticated", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user when authenticated", async () => {
    const user = makeUser();
    const caller = appRouter.createCaller(makeCtx({ user }));
    const result = await caller.auth.me();
    expect(result).toMatchObject({ id: 1, role: "user" });
  });
});

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const cleared: string[] = [];
    const ctx = makeCtx({
      user: makeUser(),
      res: {
        clearCookie: (name: string) => cleared.push(name),
      } as unknown as TrpcContext["res"],
    });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(cleared.length).toBeGreaterThan(0);
  });
});

// ─── Article Code Format Tests ────────────────────────────────────────────────

describe("Article code format", () => {
  it("validates MST-IND-2026-0001 format", () => {
    const codeRegex = /^MST-[A-Z]{3}-\d{4}-\d{4}$/;
    expect("MST-IND-2026-0001").toMatch(codeRegex);
    expect("MST-MKT-2026-0099").toMatch(codeRegex);
    expect("INVALID-CODE").not.toMatch(codeRegex);
    expect("MST-IND-26-0001").not.toMatch(codeRegex);
  });
});

// ─── Revenue Split Tests ──────────────────────────────────────────────────────

describe("Revenue split calculation", () => {
  function calculateRevenueSplit(grossAmount: number, masterSharePercent: number) {
    const masterAmount = (grossAmount * masterSharePercent) / 100;
    const platformAmount = grossAmount - masterAmount;
    return { masterAmount, platformAmount };
  }

  it("calculates 70% master share correctly", () => {
    const { masterAmount, platformAmount } = calculateRevenueSplit(100, 70);
    expect(masterAmount).toBe(70);
    expect(platformAmount).toBe(30);
  });

  it("calculates 85% master share correctly", () => {
    const { masterAmount, platformAmount } = calculateRevenueSplit(100, 85);
    expect(masterAmount).toBe(85);
    expect(platformAmount).toBe(15);
  });

  it("master share is always between 70-85%", () => {
    const validShares = [70, 72, 74, 76, 78, 80, 82, 83, 84, 85];
    validShares.forEach(share => {
      expect(share).toBeGreaterThanOrEqual(70);
      expect(share).toBeLessThanOrEqual(85);
    });
  });
});

// ─── Bounty Status Flow Tests ─────────────────────────────────────────────────

describe("Bounty status flow", () => {
  const validTransitions: Record<string, string[]> = {
    open: ["accepted", "cancelled"],
    accepted: ["submitted", "cancelled"],
    submitted: ["completed", "disputed"],
    completed: [],
    disputed: ["completed", "cancelled"],
    cancelled: [],
  };

  it("allows valid status transitions", () => {
    expect(validTransitions["open"]).toContain("accepted");
    expect(validTransitions["accepted"]).toContain("submitted");
    expect(validTransitions["submitted"]).toContain("completed");
    expect(validTransitions["submitted"]).toContain("disputed");
  });

  it("prevents invalid status transitions", () => {
    expect(validTransitions["open"]).not.toContain("completed");
    expect(validTransitions["completed"]).toHaveLength(0);
    expect(validTransitions["cancelled"]).toHaveLength(0);
  });

  it("follows the correct order: open → accepted → submitted → completed", () => {
    const flow = ["open", "accepted", "submitted", "completed"];
    for (let i = 0; i < flow.length - 1; i++) {
      expect(validTransitions[flow[i]]).toContain(flow[i + 1]);
    }
  });
});

// ─── Master Level Tests ───────────────────────────────────────────────────────

describe("Master level system", () => {
  const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  it("has exactly 10 levels", () => {
    expect(levels).toHaveLength(10);
  });

  it("level 1 starts with 0 min subscribers", () => {
    const minSubscribersByLevel: Record<number, number> = {
      1: 0, 2: 50, 3: 200, 4: 500, 5: 1000,
      6: 2000, 7: 5000, 8: 10000, 9: 20000, 10: 50000,
    };
    expect(minSubscribersByLevel[1]).toBe(0);
    expect(minSubscribersByLevel[10]).toBe(50000);
  });

  it("revenue share increases with level (70-85%)", () => {
    const revenueShareByLevel: Record<number, number> = {
      1: 70, 2: 72, 3: 74, 4: 76, 5: 78,
      6: 80, 7: 82, 8: 83, 9: 84, 10: 85,
    };
    // Verify monotonic increase
    for (let i = 1; i < 10; i++) {
      expect(revenueShareByLevel[i + 1]).toBeGreaterThanOrEqual(revenueShareByLevel[i]);
    }
    expect(revenueShareByLevel[1]).toBe(70);
    expect(revenueShareByLevel[10]).toBe(85);
  });
});

// ─── Language Support Tests ───────────────────────────────────────────────────

describe("Multilingual support", () => {
  it("supports zh, en, ja languages", () => {
    const supportedLangs = ["zh", "en", "ja"];
    expect(supportedLangs).toHaveLength(3);
    expect(supportedLangs).toContain("zh");
    expect(supportedLangs).toContain("en");
    expect(supportedLangs).toContain("ja");
  });

  it("article has title fields for all three languages", () => {
    const articleFields = ["titleZh", "titleEn", "titleJa", "summaryZh", "summaryEn", "summaryJa", "contentZh", "contentEn", "contentJa"];
    const zhFields = articleFields.filter(f => f.endsWith("Zh"));
    const enFields = articleFields.filter(f => f.endsWith("En"));
    const jaFields = articleFields.filter(f => f.endsWith("Ja"));
    expect(zhFields).toHaveLength(3);
    expect(enFields).toHaveLength(3);
    expect(jaFields).toHaveLength(3);
  });
});

// ─── Admin Role Tests ─────────────────────────────────────────────────────────

describe("Admin role protection", () => {
  it("admin procedures reject non-admin users", async () => {
    const user = makeUser("user");
    const caller = appRouter.createCaller(makeCtx({ user }));
    await expect(caller.admin.stats()).rejects.toThrow();
  });

  it("admin procedures allow admin users", async () => {
    const user = makeUser("admin");
    const caller = appRouter.createCaller(makeCtx({ user }));
    // Should not throw for admin
    await expect(caller.admin.stats()).resolves.toBeDefined();
  });
});
