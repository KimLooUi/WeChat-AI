import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolvePeerRatePerMinute } from "./config.js";

describe("resolvePeerRatePerMinute", () => {
  it("falls back to the default when unset or blank", () => {
    for (const raw of [undefined, "", "   "]) {
      assert.equal(
        resolvePeerRatePerMinute(raw),
        20,
        `PEER_RATE_PER_MINUTE=${JSON.stringify(raw)} must use the default`,
      );
    }
  });

  it("falls back to the default on unparseable input", () => {
    for (const raw of ["abc", "10/m", "NaN"]) {
      assert.equal(
        resolvePeerRatePerMinute(raw),
        20,
        `PEER_RATE_PER_MINUTE=${JSON.stringify(raw)} must use the default`,
      );
    }
  });

  it("treats 0 as no limit and clamps negatives to 0", () => {
    assert.equal(resolvePeerRatePerMinute("0"), 0);
    assert.equal(resolvePeerRatePerMinute("-5"), 0);
  });

  it("parses positive values, truncating fractions", () => {
    assert.equal(resolvePeerRatePerMinute("20"), 20);
    assert.equal(resolvePeerRatePerMinute("600"), 600);
    assert.equal(resolvePeerRatePerMinute("20.9"), 20);
  });
});
