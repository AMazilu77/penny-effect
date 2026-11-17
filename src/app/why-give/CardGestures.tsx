"use client";
// Extras for the Why give cards once JavaScript is running. Without it the
// cards still work: Back and Next are ordinary links to each card's URL.
// - Arrow keys and horizontal swipes go to the previous/next card. Nothing
//   ever advances on its own.
// - After moving between cards, focus goes to the new card's heading, so
//   screen readers start reading the new card.
// - A short slide-in shows the direction of travel, unless the reader asks
//   for reduced motion.
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";

// The card shown before this one, kept across client navigations, to tell
// forward from back. null on a fresh page load (no animation, no focus move).
let previousIndex: number | null = null;

const SWIPE_MIN_PX = 60;

/** Elements that use arrow keys or drags themselves: charts, form fields, tables. */
const OWN_GESTURES = "input, textarea, select, [contenteditable], svg, table, [data-no-swipe]";

export function CardGestures({
  index,
  prevHref,
  nextHref,
  headingId,
  children,
}: {
  index: number;
  prevHref: string | null;
  nextHref: string | null;
  headingId: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const stage = useRef<HTMLDivElement>(null);

  // Runs before the browser paints the new card, so there's no flash.
  useLayoutEffect(() => {
    const from = previousIndex;
    previousIndex = index;
    if (from === null || from === index) return;

    document.getElementById(headingId)?.focus({ preventScroll: true });

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !stage.current?.animate) return;
    const offset = index > from ? 24 : -24;
    stage.current.animate(
      [
        { opacity: 0, transform: `translateX(${offset}px)` },
        { opacity: 1, transform: "none" },
      ],
      { duration: 220, easing: "cubic-bezier(0.2, 0, 0, 1)" },
    );
  }, [index, headingId]);

  useEffect(() => {
    if (prevHref) router.prefetch(prevHref);
    if (nextHref) router.prefetch(nextHref);

    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.target instanceof Element && e.target.closest(OWN_GESTURES)) return;
      if (e.key === "ArrowRight" && nextHref) router.push(nextHref);
      else if (e.key === "ArrowLeft" && prevHref) router.push(prevHref);
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, prevHref, nextHref]);

  const start = useRef<{ x: number; y: number } | null>(null);

  return (
    <div
      ref={stage}
      onTouchStart={(e) => {
        const t = e.touches[0];
        const own = e.target instanceof Element && e.target.closest(OWN_GESTURES);
        start.current = e.touches.length === 1 && !own ? { x: t.clientX, y: t.clientY } : null;
      }}
      onTouchEnd={(e) => {
        const s = start.current;
        start.current = null;
        if (!s) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - s.x;
        const dy = t.clientY - s.y;
        // Mostly sideways, and far enough that it wasn't a scroll or a tap.
        if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < 1.5 * Math.abs(dy)) return;
        if (dx < 0 && nextHref) router.push(nextHref);
        if (dx > 0 && prevHref) router.push(prevHref);
      }}
    >
      {children}
    </div>
  );
}
