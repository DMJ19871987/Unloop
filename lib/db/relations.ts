import { relations } from "drizzle-orm";
import {
  users,
  offloadSessions,
  loops,
  loopEvents,
  weeklySummaries,
  aiUsageLog,
} from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(offloadSessions),
  loops: many(loops),
  events: many(loopEvents),
  summaries: many(weeklySummaries),
}));

export const offloadSessionsRelations = relations(offloadSessions, ({ one }) => ({
  user: one(users, { fields: [offloadSessions.userId], references: [users.id] }),
}));

export const loopsRelations = relations(loops, ({ one, many }) => ({
  user: one(users, { fields: [loops.userId], references: [users.id] }),
  events: many(loopEvents),
}));

export const loopEventsRelations = relations(loopEvents, ({ one }) => ({
  loop: one(loops, { fields: [loopEvents.loopId], references: [loops.id] }),
  user: one(users, { fields: [loopEvents.userId], references: [users.id] }),
}));

export const weeklySummariesRelations = relations(weeklySummaries, ({ one }) => ({
  user: one(users, { fields: [weeklySummaries.userId], references: [users.id] }),
}));

export const aiUsageLogRelations = relations(aiUsageLog, ({ one }) => ({
  user: one(users, { fields: [aiUsageLog.userId], references: [users.id] }),
}));
