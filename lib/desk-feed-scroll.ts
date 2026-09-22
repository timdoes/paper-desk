export type FeedThreadScroller = Pick<HTMLElement, "scrollHeight"> & {
  scrollTo(options: ScrollToOptions): void;
};

/**
 * Scroll only the desk-feed overflow container to the latest message.
 * Never uses scrollIntoView, which would also move window/document.
 */
export function scrollFeedThreadToLatest(
  scroller: FeedThreadScroller | null | undefined,
  behavior: ScrollBehavior = "auto",
): void {
  if (!scroller) {
    return;
  }
  scroller.scrollTo({
    top: scroller.scrollHeight,
    behavior,
  });
}
