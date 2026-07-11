import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getSubscriptionAccess, canUseFreeOffload, needsCheckout } from "./subscription";

const baseUser = {
  id: "u1",
  clerkId: "c1",
  email: "a@b.com",
  timezone: "Europe/London",
  checkinHour: 20,
  microstepsEnabled: false,
  weeklyEmailEnabled: false,
  notificationFrequency: 1,
  stripeCustomerId: null,
  subscriptionStatus: "trialing",
  trialEndsAt: null,
  lastResurfaceShownAt: null,
  keepTranscripts: true,
  crisisCardShownAt: null,
  onboardingComplete: false,
  sessionsCompleted: 0,
  pushSubscription: null,
  pastDueSince: null,
  lastCheckinSentAt: null,
  trialReminderSentAt: null,
  freeOffloadUsed: false,
  freeActivationComplete: false,
  createdAt: new Date(),
};

describe("subscription gate states", () => {
  it("allows full access during active trial", () => {
    const user = {
      ...baseUser,
      trialEndsAt: new Date(Date.now() + 86400000),
    };
    assert.equal(getSubscriptionAccess(user), "full");
  });

  it("allows free offload before checkout", () => {
    assert.equal(canUseFreeOffload(baseUser), true);
    assert.equal(getSubscriptionAccess(baseUser), "full");
  });

  it("read_only after trial lapses", () => {
    const user = {
      ...baseUser,
      trialEndsAt: new Date(Date.now() - 86400000),
    };
    assert.equal(getSubscriptionAccess(user), "read_only");
  });

  it("needs checkout after free activation", () => {
    const user = {
      ...baseUser,
      freeOffloadUsed: true,
      freeActivationComplete: true,
    };
    assert.equal(needsCheckout(user), true);
  });

  it("lifetime is always full", () => {
    const user = { ...baseUser, subscriptionStatus: "lifetime" };
    assert.equal(getSubscriptionAccess(user), "full");
  });
});
