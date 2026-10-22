import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const files = {
  optionsPage: readFileSync(new URL("../app/options/page.tsx", import.meta.url), "utf8"),
  optionsLayout: readFileSync(
    new URL("../app/options/layout.tsx", import.meta.url),
    "utf8",
  ),
  optionsDesk: readFileSync(
    new URL("../components/options/options-desk.tsx", import.meta.url),
    "utf8",
  ),
  optionsSetup: readFileSync(
    new URL("../components/options/options-setup.tsx", import.meta.url),
    "utf8",
  ),
  optionsRoute: readFileSync(
    new URL("../app/api/options/route.ts", import.meta.url),
    "utf8",
  ),
  proxy: readFileSync(new URL("../proxy.ts", import.meta.url), "utf8"),
  nextConfig: readFileSync(new URL("../next.config.ts", import.meta.url), "utf8"),
  rootLayout: readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  banner: readFileSync(
    new URL("../components/desk/disclaimer-banner.tsx", import.meta.url),
    "utf8",
  ),
  constants: readFileSync(new URL("./constants.ts", import.meta.url), "utf8"),
  host: readFileSync(new URL("./opd-host.ts", import.meta.url), "utf8"),
  header: readFileSync(
    new URL("../components/options/options-header.tsx", import.meta.url),
    "utf8",
  ),
};

describe("options desk source locks", () => {
  it("is read-only: GET snapshot only, no write exports, no desk feed", () => {
    assert.match(files.optionsRoute, /export async function GET/);
    assert.doesNotMatch(files.optionsRoute, /export async function POST/);
    assert.doesNotMatch(files.optionsRoute, /export async function PUT/);
    assert.doesNotMatch(files.optionsRoute, /export async function PATCH/);
    assert.doesNotMatch(files.optionsRoute, /export async function DELETE/);
    assert.match(files.optionsRoute, /jsonPrivate/);
    for (const source of [
      files.optionsPage,
      files.optionsDesk,
      files.optionsSetup,
      files.optionsRoute,
    ]) {
      assert.doesNotMatch(source, /desk-feed/);
      assert.doesNotMatch(source, /DeskFeed/);
      assert.doesNotMatch(source, /\/api\/desk-feed/);
    }
  });

  it("noindexes the options host without changing BotMarket robots", () => {
    assert.match(files.optionsLayout, /index:\s*false/);
    assert.match(files.optionsLayout, /follow:\s*false/);
    assert.match(files.proxy, /X-Robots-Tag/);
    assert.match(files.proxy, /OPTIONS_ROBOTS_TAG/);
    assert.match(files.host, /noindex, nofollow/);
    assert.match(files.host, /Disallow: \//);
    assert.match(files.constants, /options\.timdoes\.com/);
    assert.doesNotMatch(files.nextConfig, /X-Robots-Tag/);
    assert.doesNotMatch(files.rootLayout, /index:\s*false/);
    assert.doesNotMatch(files.nextConfig, /botmarket\.timdoes\.com/);
  });

  it("brands TimDOES / BotMarket Options and never uses a last name", () => {
    const joined = Object.values(files).join("\n");
    assert.match(joined, /TimDOES/);
    assert.match(joined, /BotMarket Options/);
    assert.doesNotMatch(joined, /Tim [A-Z][a-z]{2,}/);
    assert.match(files.banner, /OPD_PAPER_DISCLAIMER/);
    assert.match(files.banner, /PAPER_DISCLAIMER/);
  });
});
