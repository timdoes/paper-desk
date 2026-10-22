import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  OPTIONS_ROBOTS_TAG,
  OPTIONS_ROBOTS_TXT,
  hostnameFromHostHeader,
  isAllowedOptionsHostPath,
  isBotMarketBrokerApiPath,
  isOpdDeskRequest,
  isOptionsHost,
  isOptionsPath,
} from "./opd-host";

describe("options host routing", () => {
  it("recognizes options.timdoes.com and strips the port", () => {
    assert.equal(hostnameFromHostHeader("options.timdoes.com:443"), "options.timdoes.com");
    assert.equal(isOptionsHost("options.timdoes.com"), true);
    assert.equal(isOptionsHost("OPTIONS.timdoes.com"), true);
    assert.equal(isOptionsHost("botmarket.timdoes.com"), false);
    assert.equal(isOptionsHost("paper-desk-git-main.vercel.app"), false);
  });

  it("treats /options as the preview path on any host", () => {
    assert.equal(isOptionsPath("/options"), true);
    assert.equal(isOptionsPath("/options/fixture"), true);
    assert.equal(isOptionsPath("/"), false);
    assert.equal(isOptionsPath("/archive/test-1"), false);
    assert.equal(isOpdDeskRequest("botmarket.timdoes.com", "/options"), true);
    assert.equal(isOpdDeskRequest("botmarket.timdoes.com", "/"), false);
    assert.equal(isOpdDeskRequest("options.timdoes.com", "/"), true);
  });

  it("keeps BotMarket broker and desk-feed APIs off the options host allow-list", () => {
    assert.equal(isBotMarketBrokerApiPath("/api/account"), true);
    assert.equal(isBotMarketBrokerApiPath("/api/desk-feed"), true);
    assert.equal(isBotMarketBrokerApiPath("/api/options"), false);
    assert.equal(isAllowedOptionsHostPath("/"), true);
    assert.equal(isAllowedOptionsHostPath("/options"), true);
    assert.equal(isAllowedOptionsHostPath("/options/fixture"), true);
    assert.equal(isAllowedOptionsHostPath("/api/options"), true);
    assert.equal(isAllowedOptionsHostPath("/api/desk-feed"), false);
    assert.equal(isAllowedOptionsHostPath("/archive/test-1"), false);
  });

  it("disallows every crawler on the options host robots file", () => {
    assert.equal(OPTIONS_ROBOTS_TXT, "User-agent: *\nDisallow: /\n");
    assert.equal(OPTIONS_ROBOTS_TAG, "noindex, nofollow");
    assert.doesNotMatch(OPTIONS_ROBOTS_TXT, /sitemap/i);
    assert.doesNotMatch(OPTIONS_ROBOTS_TXT, /Allow:/);
  });
});
