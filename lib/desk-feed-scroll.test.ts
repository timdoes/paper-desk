import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scrollFeedThreadToLatest } from "./desk-feed-scroll";

describe("scrollFeedThreadToLatest", () => {
  it("scrolls only the given overflow container to its bottom", () => {
    const calls: ScrollToOptions[] = [];
    const scroller = {
      scrollHeight: 1280,
      scrollTo(options: ScrollToOptions) {
        calls.push(options);
      },
    };

    scrollFeedThreadToLatest(scroller, "smooth");

    assert.deepEqual(calls, [{ top: 1280, behavior: "smooth" }]);
  });

  it("defaults to instant container scroll and ignores a missing scroller", () => {
    const calls: ScrollToOptions[] = [];
    const scroller = {
      scrollHeight: 640,
      scrollTo(options: ScrollToOptions) {
        calls.push(options);
      },
    };

    scrollFeedThreadToLatest(null);
    scrollFeedThreadToLatest(undefined);
    scrollFeedThreadToLatest(scroller);

    assert.deepEqual(calls, [{ top: 640, behavior: "auto" }]);
  });
});
