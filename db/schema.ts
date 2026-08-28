import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  phone: text("phone"),
  role: text("role", { enum: ["user", "owner", "agent", "moderator", "admin"] }).notNull().default("user"),
  status: text("status", { enum: ["active", "suspended", "pending"] }).notNull().default("active"),
  phoneVerifiedAt: text("phone_verified_at"),
  identityVerifiedAt: text("identity_verified_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_users_email").on(table.email), uniqueIndex("idx_users_phone").on(table.phone)]);

export const locations = sqliteTable("locations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type", { enum: ["country", "city", "neighborhood"] }).notNull(),
  parentId: integer("parent_id"),
  slug: text("slug").notNull(),
}, (table) => [uniqueIndex("idx_locations_slug").on(table.slug), index("idx_locations_parent").on(table.parentId)]);

export const profiles = sqliteTable("profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  dateOfBirth: text("date_of_birth"),
  gender: text("gender"),
  occupation: text("occupation"),
  bio: text("bio").notNull().default(""),
  cityId: integer("city_id").references(() => locations.id),
  neighborhoodId: integer("neighborhood_id").references(() => locations.id),
  profileImageKey: text("profile_image_key"),
}, (table) => [uniqueIndex("idx_profiles_user").on(table.userId), index("idx_profiles_location").on(table.cityId, table.neighborhoodId)]);

export const preferences = sqliteTable("preferences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  minBudget: integer("min_budget"), maxBudget: integer("max_budget"),
  preferredCityId: integer("preferred_city_id").references(() => locations.id),
  preferredNeighborhoodId: integer("preferred_neighborhood_id").references(() => locations.id),
  roomType: text("room_type"), roommateGender: text("roommate_gender"), moveInDate: text("move_in_date"),
  smoking: text("smoking"), pets: text("pets"), cleanliness: integer("cleanliness"),
  sleepSchedule: text("sleep_schedule"), socialPreference: text("social_preference"),
}, (table) => [uniqueIndex("idx_preferences_user").on(table.userId)]);

export const listings = sqliteTable("listings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: text("owner_id").notNull().references(() => users.id),
  title: text("title").notNull(), description: text("description").notNull(),
  cityId: integer("city_id").notNull().references(() => locations.id),
  neighborhoodId: integer("neighborhood_id").references(() => locations.id),
  latitude: real("latitude"), longitude: real("longitude"),
  monthlyRent: integer("monthly_rent").notNull(), deposit: integer("deposit").notNull().default(0),
  roomType: text("room_type", { enum: ["private_room", "shared_room", "apartment", "house"] }).notNull(),
  bedrooms: integer("bedrooms").notNull().default(1), bathrooms: integer("bathrooms").notNull().default(1),
  furnished: integer("furnished", { mode: "boolean" }).notNull().default(false),
  utilitiesIncluded: integer("utilities_included", { mode: "boolean" }).notNull().default(false),
  availableFrom: text("available_from").notNull(), houseRules: text("house_rules").notNull().default("[]"),
  verificationStatus: text("verification_status", { enum: ["unverified", "pending", "verified"] }).notNull().default("unverified"),
  status: text("status", { enum: ["draft", "active", "paused", "rented", "removed"] }).notNull().default("draft"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_listings_search").on(table.cityId, table.status, table.monthlyRent), index("idx_listings_owner").on(table.ownerId)]);

export const listingPhotos = sqliteTable("listing_photos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  listingId: integer("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(), altText: text("alt_text").notNull().default(""), sortOrder: integer("sort_order").notNull().default(0),
}, (table) => [index("idx_listing_photos_listing").on(table.listingId, table.sortOrder)]);

export const favorites = sqliteTable("favorites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  listingId: integer("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("idx_favorites_user_listing").on(table.userId, table.listingId)]);

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  senderId: text("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  receiverId: text("receiver_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  readAt: text("read_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_messages_sender_receiver_created").on(table.senderId, table.receiverId, table.createdAt),
  index("idx_messages_receiver_read").on(table.receiverId, table.readAt),
]);

export const viewingRequests = sqliteTable("viewing_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  listingId: integer("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
  renterId: text("renter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  requestedAt: text("requested_at").notNull(),
  note: text("note").notNull().default(""),
  status: text("status", { enum: ["pending", "accepted", "declined", "cancelled"] }).notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_viewing_requests_owner_status_date").on(table.ownerId, table.status, table.requestedAt),
  index("idx_viewing_requests_renter_status_date").on(table.renterId, table.status, table.requestedAt),
  index("idx_viewing_requests_listing").on(table.listingId),
]);

export const blockedUsers = sqliteTable("blocked_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  blockerId: text("blocker_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  blockedUserId: text("blocked_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("idx_blocked_users_pair").on(table.blockerId, table.blockedUserId),
  index("idx_blocked_users_blocked").on(table.blockedUserId),
]);

export const reports = sqliteTable("reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reporterId: text("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetType: text("target_type", { enum: ["listing", "member"] }).notNull(),
  listingId: integer("listing_id").references(() => listings.id, { onDelete: "set null" }),
  reportedUserId: text("reported_user_id").references(() => users.id, { onDelete: "set null" }),
  reason: text("reason").notNull(),
  details: text("details").notNull().default(""),
  status: text("status", { enum: ["open", "reviewing", "resolved", "dismissed"] }).notNull().default("open"),
  moderatorNote: text("moderator_note").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_reports_status_created").on(table.status, table.createdAt),
  index("idx_reports_reporter").on(table.reporterId, table.createdAt),
  index("idx_reports_listing").on(table.listingId),
  index("idx_reports_user").on(table.reportedUserId),
]);
