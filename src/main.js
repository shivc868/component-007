/* ---------------------------------------------------------------------------
   REEL — split-column wipe showreel. Mounts on .mfa-reel.

   The slides are written once each in the <template> in index.html. Their
   looks, their sizing and the reduced-motion fallback are all in style.css.
   This file only builds the GSAP timeline.

   The timeline is one transition per slide change, laid end to end with no gap
   between them. That matters for the wipe and the photo: both pass through
   their resting position at the exact instant one transition finishes and the
   next starts, then keep going the same way at the same speed. With ease
   "none" throughout there is no acceleration anywhere, so the joins cannot be
   seen. The text is the deliberate exception — see TEXT_SPAN.

   ScrollTrigger maps scroll progress onto the timeline's progress, one to one.
--------------------------------------------------------------------------- */

import "./style.css";
import "./demo.css"; // showcase page styles only — do NOT copy into your project
import "lenis/dist/lenis.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

// registering twice is harmless — safe even if the host site registers too
gsap.registerPlugin(ScrollTrigger);

/* ---------------------------------------------------------------------------
   Smooth scrolling (optional)

   - Set SMOOTH_SCROLL to false if the host site manages its own scrolling.
   - If the site already runs Lenis (exposed as window.lenis, the common
     convention), that instance is reused — two Lenis instances would fight
     over wheel events and break scrolling.
--------------------------------------------------------------------------- */

const SMOOTH_SCROLL = true;

if (SMOOTH_SCROLL && !window.lenis) {
  const lenis = new Lenis({ autoRaf: false, anchors: true });
  window.lenis = lenis; // expose so other scripts (or a second copy) reuse it
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ---------------------------------------------------------------------------
   Config. Content is in index.html, sizing and looks are in style.css.
   Distances are % of the frame; the wipe itself always travels a full 100%.
--------------------------------------------------------------------------- */

const CONFIG = {
  SCROLL_PER_SLIDE: 1, // viewport heights of scroll each transition takes
  SCRUB: 0.6, // seconds the animation lags the scrollbar — 0 to lock to it
  PARALLAX_MEDIA: 10, // how far the photo drifts. Keep under --mfa-overscan
  PARALLAX_COPY: 4.5, // and the text drifts less, which is what reads as depth
  SPLIT_SHIFT: 9, // how far the two halves of the text shear past each other
  // Share of a transition the text takes. The photo and the wipe always take
  // the whole of it, so anything under 1 lands the headline early and holds it
  // still, whole and readable, while the picture keeps changing behind it.
  // Set it to 1 to have the text finish with the wipe again.
  TEXT_SPAN: 0.8,
  NARROW: 700, // px below which the split turns horizontal (matches style.css)
};

const COLUMNS = ["left", "right"];

// each column is uncovered from its own edge: the left rises, the right descends
const WIPE_FROM = { left: 100, right: -100 };

(function mfaReel() {
  const root = document.querySelector(".mfa-reel");
  if (!root) return;

  const pin = root.querySelector("[data-mfa-pin]");
  const template = root.querySelector("[data-mfa-slides]");
  const stages = {
    left: root.querySelector('[data-mfa-stage="left"]'),
    right: root.querySelector('[data-mfa-stage="right"]'),
  };
  if (!pin || !template || !stages.left || !stages.right) return;

  /* The one piece of DOM work here, and it is duplication only.

     The effect needs the same slide in both columns, because each clips it
     differently, and each slide's text twice, because the two halves shear
     past each other. Written by hand that would be four copies of every
     headline to keep in sync, so they are stamped out of the template. */
  for (const side of COLUMNS) {
    const set = template.content.cloneNode(true);

    for (const copy of set.querySelectorAll(".mfa-reel__copy")) {
      const twin = copy.firstElementChild.cloneNode(true);
      // a pixel duplicate of the half above it — say so, and keep it off the
      // tab ring, so the text is announced and reachable exactly once
      twin.setAttribute("aria-hidden", "true");
      for (const link of twin.querySelectorAll("a")) link.tabIndex = -1;
      copy.append(twin);
    }

    stages[side].append(set);
  }

  /** Everything a transition needs to move, per slide, in both columns. The
   *  two clipped halves are simply the first and last child of the copy —
   *  style.css cuts them by position, so no marker classes are needed. */
  const slides = [...stages.left.children].map((_, i) =>
    Object.fromEntries(
      COLUMNS.map((side) => {
        const slide = stages[side].children[i];
        const copy = slide.querySelector(".mfa-reel__copy");
        return [
          side,
          {
            slide, // the mask that slides in
            inner: slide.firstElementChild, // counter-moves, so content holds still
            media: slide.querySelector(".mfa-reel__media-inner"),
            copy,
            leftHalf: copy.firstElementChild,
            rightHalf: copy.lastElementChild,
          },
        ];
      }),
    ),
  );
  if (slides.length < 2) return; // one slide: nothing to transition to

  /** The same element from both columns, so one tween moves them as one. Both
   *  columns always get identical values: the outgoing photo is still on show
   *  either side of the split while the wipe runs, so a per-column offset
   *  would tear the picture along that line. */
  const both = (slide, key) => COLUMNS.map((side) => slide[side][key]);

  /** One slide handing over to the next, always exactly 1 long. Every tween
   *  starts at position 0, so the columns stay in lockstep and there is no
   *  position arithmetic anywhere; only the text stops short of the full
   *  length, which is what lands the headline before the wipe finishes. */
  const transition = (from, to, axis) => {
    const tl = gsap.timeline({ defaults: { duration: 1, ease: "none" } });

    // arriving layers come in offset and settle to rest; leaving layers start
    // at rest and carry on the same way. immediateRender is off on the leaving
    // ones or GSAP would apply their "from" as soon as the tween is built,
    // snapping the slide out of place long before its turn comes round.
    const arrive = (targets, offset, duration = 1) =>
      tl.fromTo(targets, { yPercent: offset }, { yPercent: 0, duration }, 0);
    const leave = (targets, offset, duration = 1) =>
      tl.fromTo(
        targets,
        { yPercent: 0 },
        { yPercent: offset, duration, immediateRender: false },
        0,
      );

    // the wipe: the mask slides in from off-frame while the content inside
    // counter-moves by the same amount, so the new slide is uncovered in place
    // rather than travelling
    for (const side of COLUMNS) {
      const edge = WIPE_FROM[side];
      tl.fromTo(to[side].slide, { [axis]: edge }, { [axis]: 0 }, 0);
      tl.fromTo(to[side].inner, { [axis]: -edge }, { [axis]: 0 }, 0);
    }

    // the photo drift, over the whole transition. It passes through 0 exactly
    // as the transition ends and picks up from 0 in the next, in the same
    // direction — which is what makes one run into the next without a seam.
    arrive(both(to, "media"), CONFIG.PARALLAX_MEDIA);
    leave(both(from, "media"), -CONFIG.PARALLAX_MEDIA);

    // the text: the copy block, and the two halves shearing past each other.
    // Both settle in TEXT_SPAN rather than the full length, so the headline is
    // whole and still for the rest of the wipe.
    const t = CONFIG.TEXT_SPAN;
    arrive(both(to, "copy"), CONFIG.PARALLAX_COPY, t);
    arrive(both(to, "leftHalf"), CONFIG.SPLIT_SHIFT, t);
    arrive(both(to, "rightHalf"), -CONFIG.SPLIT_SHIFT, t);

    leave(both(from, "copy"), -CONFIG.PARALLAX_COPY, t);
    leave(both(from, "leftHalf"), -CONFIG.SPLIT_SHIFT, t);
    leave(both(from, "rightHalf"), CONFIG.SPLIT_SHIFT, t);

    return tl;
  };

  const mm = gsap.matchMedia();

  // No match under prefers-reduced-motion, so nothing below is built and the
  // reel stays the plain list of slides that style.css lays out.
  mm.add(
    {
      wide: `(prefers-reduced-motion: no-preference) and (min-width: ${CONFIG.NARROW + 1}px)`,
      narrow: `(prefers-reduced-motion: no-preference) and (max-width: ${CONFIG.NARROW}px)`,
    },
    (ctx) => {
      // narrow screens split across instead of down, so the same wipe rotates
      // onto the x axis (style.css restacks the columns to match)
      const axis = ctx.conditions.narrow ? "xPercent" : "yPercent";

      const timeline = gsap.timeline({ paused: true });
      slides.forEach((slide, i) => {
        const next = slides[i + 1];
        if (next) timeline.add(transition(slide, next, axis));
      });

      const scroll = ScrollTrigger.create({
        trigger: root,
        start: "top top",
        end: () =>
          "+=" +
          window.innerHeight * CONFIG.SCROLL_PER_SLIDE * (slides.length - 1),
        pin,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        animation: timeline, // scroll progress drives timeline progress
        scrub: CONFIG.SCRUB, // …with this much catch-up lag
      });

      return () => {
        scroll.kill();
        timeline.kill();
      };
    },
  );

  // our own height never changes, but the host page's might once photos and
  // fonts have settled
  const onLoad = () => ScrollTrigger.refresh();
  window.addEventListener("load", onLoad, { once: true });

  root.mfaDestroy = () => {
    window.removeEventListener("load", onLoad);
    mm.revert();
  };
})();
