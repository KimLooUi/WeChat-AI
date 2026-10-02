import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RateLimiter } from "./rate-limit.js";

describe("RateLimiter", () => {
  it("allows up to max within window", () => {
    const rl = new RateLimiter(3, 60_000);
    assert.equal(rl.tryTake("a", 1000), true);
    assert.equal(rl.tryTake("a", 1001), true);
    assert.equal(rl.tryTake("a", 1002), true);
    assert.equal(rl.tryTake("a", 1003), false);
  });

  it("resets after window", () => {
    const rl = new RateLimiter(1, 1000);
    assert.equal(rl.tryTake("b", 0), true);
    assert.equal(rl.tryTake("b", 500), false);
    assert.equal(rl.tryTake("b", 1001), true);
  });

  it("still denies across many distinct keys", () => {
    const rl = new RateLimiter(2, 60_000, 128);
    for (let i = 0; i < 500; i++) rl.tryTake(`k${i}`, 1000);
    // The key we keep hitting must never be evicted out from under itself
    assert.equal(rl.tryTake("hot", 1000), true);
    assert.equal(rl.tryTake("hot", 1001), true);
    assert.equal(rl.tryTake("hot", 1002), false);
  });

  it("bounds the key map under unbounded distinct keys", () => {
    const rl = new RateLimiter(5, 60_000, 128);
    for (let i = 0; i < 100_000; i++) rl.tryTake(`ip-${i}`, 1000);
    assert.ok(
      rl.size <= 128,
      `expected bounded map, got ${rl.size}`,
    );
  });

  it("drops keys whose window went empty", () => {
    const rl = new RateLimiter(5, 1000);
    rl.tryTake("gone", 0);
    assert.equal(rl.size, 1);
    // Same key, long after the window — re-inserted with a single hit
    assert.equal(rl.tryTake("gone", 10_000), true);
    assert.equal(rl.remaining("gone", 10_000), 4);
  });

  it("treats max <= 0 as unlimited", () => {
    const rl = new RateLimiter(0, 60_000);
    for (let i = 0; i < 5_000; i++) {
      assert.equal(rl.tryTake("chat", 1000), true);
    }
    assert.equal(rl.size, 0, "a disabled limiter records no buckets");
    assert.equal(
      rl.remaining("chat", 1000),
      Number.POSITIVE_INFINITY,
      "remaining must not read as exhausted while limiting is off",
    );
  });

  it("re-enables cleanly after leaving the disabled state", () => {
    const rl = new RateLimiter(0, 60_000);
    assert.equal(rl.tryTake("a", 1000), true);
    rl.setLimits(2, 60_000);
    assert.equal(rl.tryTake("a", 1000), true);
    assert.equal(rl.tryTake("a", 1001), true);
    assert.equal(rl.tryTake("a", 1002), false);
  });

  it("setLimits(0) disables an active limiter", () => {
    const rl = new RateLimiter(1, 60_000);
    assert.equal(rl.tryTake("b", 1000), true);
    assert.equal(rl.tryTake("b", 1001), false);
    rl.setLimits(0);
    assert.equal(rl.tryTake("b", 1002), true);
  });
});
