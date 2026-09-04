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
  assert.ok(tables.includes("verification_requests"));
  assert.ok(tables.includes("notifications"));
});

test("phone verification challenges remain tied to an application user", () => {
  const database = migratedDatabase();
  assert.throws(() => database.prepare(
    "INSERT INTO phone_verification_challenges (user_id,phone) VALUES (?,?)",
  ).run("missing-user", "+251911111111"), /FOREIGN KEY constraint failed/);
});
