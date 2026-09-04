import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

function migratedDatabase() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys=ON");
  const directory = fileURLToPath(new URL("../drizzle/", import.meta.url));
  for (const filename of readdirSync(directory).filter((name) => name.endsWith(".sql")).sort()) {
    const sql = readFileSync(join(directory, filename), "utf8").replaceAll("--> statement-breakpoint", "");
    database.exec(sql);
  }
  return database;
}

test("the complete D1 migration chain applies to an empty database", () => {
  const database = migratedDatabase();
  const tables = database.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => row.name);
  assert.ok(tables.includes("rental_offers"));
  assert.ok(tables.includes("phone_verification_challenges"));
  assert.ok(tables.includes("user_intents"));
  assert.ok(tables.includes("dev_accounts"));
  assert.ok(tables.includes("dev_sessions"));
  assert.ok(tables.includes("verification_requests"));
  assert.ok(tables.includes("notifications"));
});

test("phone verification challenges remain tied to an application user", () => {
  const database = migratedDatabase();
  assert.throws(() => database.prepare(
    "INSERT INTO phone_verification_challenges (user_id,phone) VALUES (?,?)",
  ).run("missing-user", "+251911111111"), /FOREIGN KEY constraint failed/);
});

test("user intents support multiple goals without duplicates or invalid values", () => {
  const database = migratedDatabase();
  database.prepare("INSERT INTO users (id,email) VALUES (?,?)").run("member-1", "member@example.com");
  const insert = database.prepare("INSERT INTO user_intents (user_id,intent) VALUES (?,?)");
  insert.run("member-1", "find_home");
  insert.run("member-1", "list_property");
  assert.equal(database.prepare("SELECT COUNT(*) AS total FROM user_intents WHERE user_id=?").get("member-1").total, 2);
  assert.throws(() => insert.run("member-1", "find_home"), /UNIQUE constraint failed/);
  assert.throws(() => insert.run("member-1", "unknown"), /CHECK constraint failed/);
});

test("local development credentials and sessions remain tied to their user", () => {
  const database = migratedDatabase();
  database.prepare("INSERT INTO users (id,email) VALUES (?,?)").run("dev-member", "dev@example.com");
  database.prepare("INSERT INTO dev_accounts (user_id,display_name,password_hash,password_salt) VALUES (?,?,?,?)")
    .run("dev-member", "Dev Member", "derived-hash", "random-salt");
  database.prepare("INSERT INTO dev_sessions (id,user_id,expires_at) VALUES (?,?,?)")
    .run("hashed-session", "dev-member", "2099-01-01T00:00:00.000Z");
  database.prepare("DELETE FROM users WHERE id=?").run("dev-member");
  assert.equal(database.prepare("SELECT COUNT(*) AS total FROM dev_accounts").get().total, 0);
  assert.equal(database.prepare("SELECT COUNT(*) AS total FROM dev_sessions").get().total, 0);
});
