import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isCheckinDue,
  isWeeklySummaryDue,
  isTrialReminderDue,
  weeklySummaryDeliveryKey,
} from "./due";

describe("lifecycle due-time", () => {
  it("detects check-in due within grace window", () => {
    const tz = "Europe/London";
    const now = new Date("2026-07-11T19:30:00Z");
    assert.equal(isCheckinDue(tz, 20, null, now), true);
  });

  it("skips check-in already sent today", () => {
    const tz = "Europe/London";
    const now = new Date("2026-07-11T19:30:00Z");
    const lastSent = new Date("2026-07-11T18:00:00Z");
    assert.equal(isCheckinDue(tz, 20, lastSent, now), false);
  });

  it("builds stable weekly summary delivery keys", () => {
    const key = weeklySummaryDeliveryKey("user-1", "America/New_York");
    assert.match(key, /^weekly-summary:user-1:\d{4}-\d{2}-\d{2}$/);
  });

  it("detects trial reminder window", () => {
    const now = new Date("2026-07-11T12:00:00Z");
    const trialEnds = new Date("2026-07-13T12:00:00Z");
    assert.equal(isTrialReminderDue(trialEnds, null, now), true);
    assert.equal(isTrialReminderDue(trialEnds, new Date(), now), false);
  });

  it("weekly summary due on Sunday evening local time", () => {
    const tz = "Europe/London";
    const sundayEvening = new Date("2026-07-12T17:30:00Z");
    assert.equal(isWeeklySummaryDue(tz, 18, 0, sundayEvening), true);
  });
});
