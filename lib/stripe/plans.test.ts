import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isPublicPlan,
  parsePublicPlan,
  parseCheckoutPlan,
  signUpUrl,
  subscribeUrl,
} from "./plans";

describe("plan allow-list", () => {
  it("accepts annual and monthly", () => {
    assert.equal(isPublicPlan("annual"), true);
    assert.equal(isPublicPlan("monthly"), true);
    assert.equal(parsePublicPlan("annual"), "annual");
  });

  it("rejects arbitrary price ids and lifetime during beta", () => {
    assert.equal(isPublicPlan("price_123"), false);
    assert.equal(parsePublicPlan("lifetime"), null);
    assert.equal(parseCheckoutPlan("price_123"), null);
    assert.equal(parseCheckoutPlan("lifetime"), null);
  });

  it("builds sign-up and subscribe URLs", () => {
    assert.equal(signUpUrl("annual"), "/sign-up?plan=annual");
    assert.equal(subscribeUrl("monthly"), "/subscribe?plan=monthly");
  });
});
