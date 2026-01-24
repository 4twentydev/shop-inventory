import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  real,
  unique,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "user"]);
export const notificationTypeEnum = pgEnum("notification_type", ["daily_summary", "problem_report"]);
export const quarterlyCountStatusEnum = pgEnum("quarterly_count_status", ["in_progress", "completed", "cancelled"]);
export const quarterlyCountRecordStatusEnum = pgEnum("quarterly_count_record_status", ["pending", "counted", "verified"]);

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  pinHash: text("pin_hash").notNull(),
  role: userRoleEnum("role").notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Sessions table
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Parts table
export const parts = pgTable("parts", {
  id: uuid("id").primaryKey().defaultRandom(),
  partId: text("part_id").notNull().unique(),
  partName: text("part_name").notNull(),
  color: text("color"),
  category: text("category"),
  // Extended fields for ACM/SPL/HPL/Rivet/Misc inventory
  jobNumber: text("job_number"),
  sizeW: real("size_w"),
  sizeL: real("size_l"),
  thickness: real("thickness"),
  brand: text("brand"),
  pallet: text("pallet"),
  unit: text("unit"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Locations table
export const locations = pgTable("locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  locationId: text("location_id").notNull().unique(),
  type: text("type"),
  zone: text("zone"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Inventory table
export const inventory = pgTable(
  "inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partId: uuid("part_id")
      .notNull()
      .references(() => parts.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    qty: integer("qty").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("inventory_part_location_unique").on(table.partId, table.locationId),
  ]
);

// Inventory moves (audit trail)
export const inventoryMoves = pgTable("inventory_moves", {
  id: uuid("id").primaryKey().defaultRandom(),
  ts: timestamp("ts").notNull().defaultNow(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  partId: uuid("part_id")
    .notNull()
    .references(() => parts.id, { onDelete: "cascade" }),
  locationId: uuid("location_id")
    .notNull()
    .references(() => locations.id, { onDelete: "cascade" }),
  deltaQty: integer("delta_qty").notNull(),
  reason: text("reason"),
  note: text("note"),
});

// Settings table for app configuration
export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Admin notifications table
export const adminNotifications = pgTable("admin_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  data: text("data").notNull(), // JSON with move details
  date: timestamp("date").notNull(),
  emailSentAt: timestamp("email_sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Admin notification reads table (tracks which users have read which notifications)
export const adminNotificationReads = pgTable(
  "admin_notification_reads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    notificationId: uuid("notification_id")
      .notNull()
      .references(() => adminNotifications.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at").notNull().defaultNow(),
  },
  (table) => [
    unique("notification_read_unique").on(table.notificationId, table.userId),
  ]
);

// Quarterly counts table (count sessions/cycles)
export const quarterlyCounts = pgTable("quarterly_counts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  status: quarterlyCountStatusEnum("status").notNull().default("in_progress"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Quarterly count records table (individual part/location counts)
export const quarterlyCountRecords = pgTable(
  "quarterly_count_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    countId: uuid("count_id")
      .notNull()
      .references(() => quarterlyCounts.id, { onDelete: "cascade" }),
    partId: uuid("part_id")
      .notNull()
      .references(() => parts.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    expectedQty: integer("expected_qty").notNull().default(0),
    countedQty: integer("counted_qty"),
    variance: integer("variance"),
    status: quarterlyCountRecordStatusEnum("status").notNull().default("pending"),
    countedBy: uuid("counted_by").references(() => users.id),
    countedAt: timestamp("counted_at"),
    notes: text("notes"),
  },
  (table) => [
    unique("quarterly_count_record_unique").on(table.countId, table.partId, table.locationId),
  ]
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  inventoryMoves: many(inventoryMoves),
  notificationReads: many(adminNotificationReads),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const partsRelations = relations(parts, ({ many }) => ({
  inventory: many(inventory),
  inventoryMoves: many(inventoryMoves),
}));

export const locationsRelations = relations(locations, ({ many }) => ({
  inventory: many(inventory),
  inventoryMoves: many(inventoryMoves),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  part: one(parts, {
    fields: [inventory.partId],
    references: [parts.id],
  }),
  location: one(locations, {
    fields: [inventory.locationId],
    references: [locations.id],
  }),
}));

export const inventoryMovesRelations = relations(inventoryMoves, ({ one }) => ({
  user: one(users, {
    fields: [inventoryMoves.userId],
    references: [users.id],
  }),
  part: one(parts, {
    fields: [inventoryMoves.partId],
    references: [parts.id],
  }),
  location: one(locations, {
    fields: [inventoryMoves.locationId],
    references: [locations.id],
  }),
}));

export const adminNotificationsRelations = relations(adminNotifications, ({ many }) => ({
  reads: many(adminNotificationReads),
}));

export const adminNotificationReadsRelations = relations(adminNotificationReads, ({ one }) => ({
  notification: one(adminNotifications, {
    fields: [adminNotificationReads.notificationId],
    references: [adminNotifications.id],
  }),
  user: one(users, {
    fields: [adminNotificationReads.userId],
    references: [users.id],
  }),
}));

export const quarterlyCountsRelations = relations(quarterlyCounts, ({ one, many }) => ({
  creator: one(users, {
    fields: [quarterlyCounts.createdBy],
    references: [users.id],
  }),
  records: many(quarterlyCountRecords),
}));

export const quarterlyCountRecordsRelations = relations(quarterlyCountRecords, ({ one }) => ({
  count: one(quarterlyCounts, {
    fields: [quarterlyCountRecords.countId],
    references: [quarterlyCounts.id],
  }),
  part: one(parts, {
    fields: [quarterlyCountRecords.partId],
    references: [parts.id],
  }),
  location: one(locations, {
    fields: [quarterlyCountRecords.locationId],
    references: [locations.id],
  }),
  counter: one(users, {
    fields: [quarterlyCountRecords.countedBy],
    references: [users.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Part = typeof parts.$inferSelect;
export type NewPart = typeof parts.$inferInsert;
export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
export type Inventory = typeof inventory.$inferSelect;
export type InventoryMove = typeof inventoryMoves.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type AdminNotification = typeof adminNotifications.$inferSelect;
export type AdminNotificationRead = typeof adminNotificationReads.$inferSelect;
export type QuarterlyCount = typeof quarterlyCounts.$inferSelect;
export type NewQuarterlyCount = typeof quarterlyCounts.$inferInsert;
export type QuarterlyCountRecord = typeof quarterlyCountRecords.$inferSelect;
export type NewQuarterlyCountRecord = typeof quarterlyCountRecords.$inferInsert;
