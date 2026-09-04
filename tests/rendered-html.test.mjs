import assert from "node:assert/strict";
import test from "node:test";
import { localDevAuthEnabled } from "../lib/local-dev-guard.mjs";

async function requestBuiltApp(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

const renderHome = () => requestBuiltApp();

test("server-renders the Debal marketplace homepage", async () => {
  const response = await renderHome();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Debal \| Find a room\. Find your people\.<\/title>/i);
  assert.match(html, /Find a place\./i);
  assert.match(html, /Find your people\./i);
  assert.match(html, /Built for safer sharing/i);
  assert.match(html, /Always view a property and verify the person before sending money/i);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/i);
});

test("homepage exposes essential discovery and accessibility landmarks", async () => {
  const html = await (await renderHome()).text();
  assert.match(html, /aria-label="Main navigation"/i);
  assert.match(html, /href="\/listings"/i);
  assert.match(html, /href="\/roommates"/i);
  assert.match(html, /href="\/register"/i);
  assert.match(html, /name="description" content="Verified rooms, homes, and compatible roommates across Ethiopia\."/i);
  assert.match(html, /<footer>/i);
});

test("homepage loads featured inventory without rendering sample properties", async () => {
  const html = await (await renderHome()).text();
  assert.match(html, /Loading available homes/);
  assert.doesNotMatch(html, /Sunlit private room|Modern room near ECA/);
});

test("local authentication is limited to development requests on loopback hosts", () => {
  assert.equal(localDevAuthEnabled("localhost:3000", "development"), true);
  assert.equal(localDevAuthEnabled("127.0.0.1:3000", "development"), true);
  assert.equal(localDevAuthEnabled("example.com", "development"), false);
  assert.equal(localDevAuthEnabled("localhost:3000", "production"), false);
});
