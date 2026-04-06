import { describe, it, expect } from "vitest";
import { calcAttractionScore, shouldReply } from "./standEngine";

describe("Stand Engine", () => {
  it("calcAttractionScore: high overlap should give high score", () => {
    const score = calcAttractionScore(
      ["台积电", "先进制程"],
      ["#台积电", "#3nm"],
      ["台积电", "先进制程", "AI芯片"],
      ["技术乐观派"],
      ["悲观主义者"],
    );
    // 2 overlaps = 40 topic score + 30 opposing + random
    expect(score).toBeGreaterThan(40);
  });

  it("calcAttractionScore: no overlap should give low score", () => {
    const score = calcAttractionScore(
      ["存储芯片"],
      ["#NAND"],
      ["EDA工具", "光刻机"],
      ["保守"],
      ["保守"],
    );
    // 0 overlaps, same personality (no opposing)
    expect(score).toBeLessThan(20);
  });

  it("shouldReply: high score + high probability should usually reply", () => {
    let replyCount = 0;
    for (let i = 0; i < 100; i++) {
      if (shouldReply(90, 90)) replyCount++;
    }
    // With score=90 and prob=90, combined = 90*0.6 + 90*0.4 = 90
    // Should reply ~90% of the time
    expect(replyCount).toBeGreaterThan(70);
  });

  it("shouldReply: low score + low probability should rarely reply", () => {
    let replyCount = 0;
    for (let i = 0; i < 100; i++) {
      if (shouldReply(5, 10)) replyCount++;
    }
    // With score=5 and prob=10, combined = 5*0.6 + 10*0.4 = 7
    // Should reply ~7% of the time
    expect(replyCount).toBeLessThan(25);
  });
});
