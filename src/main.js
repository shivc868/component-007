import "./style.css";
import "./demo.css"; // showcase page styles only — do NOT copy into your project
import "lenis/dist/lenis.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

const SMOOTH_SCROLL = true;

if (SMOOTH_SCROLL && !window.lenis) {
  const lenis = new Lenis({ autoRaf: false, anchors: true });
  window.lenis = lenis; // expose so other scripts (or a second copy) reuse it
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

const CONFIG = {
  SCROLL_PER_SLIDE: 1, // viewport heights of scroll each transition takes
  SCRUB: 0.6, // seconds the animation lags the scrollbar — 0 to lock to it
  PARALLAX_MEDIA: 10, // how far the photo drifts. Keep under --mfa-overscan
  PARALLAX_COPY: 4.5, // and the text drifts less, which is what reads as depth
  SPLIT_SHIFT: 9, // how far the two halves of the text slide past each other
  TEXT_SPAN: 0.8, // share of a change the text takes; 1 finishes with the wipe
};

(function mfaReel() {
  const reel = document.querySelector(".mfa-reel");
  if (!reel) return;

  const pin = reel.querySelector("[data-mfa-pin]");
  const template = reel.querySelector("[data-mfa-slides]");
  const leftStage = reel.querySelector('[data-mfa-stage="left"]');
  const rightStage = reel.querySelector('[data-mfa-stage="right"]');
  if (!pin || !template || !leftStage || !rightStage) return;

  // Both columns need the slides, because each clips them differently, and
  // each slide needs its text twice, because the halves slide past each other.
  // That is four copies of every headline, so they are cloned rather than
  // written out. The twin is a pixel duplicate — inert keeps screen readers
  // and the tab key from meeting the same text twice.
  for (const copy of template.content.querySelectorAll(".mfa-reel__copy")) {
    const twin = copy.firstElementChild.cloneNode(true);
    twin.inert = true;
    copy.append(twin);
  }
  leftStage.append(template.content.cloneNode(true));
  rightStage.append(template.content.cloneNode(true));

  function partsOf(stage, index) {
    const slide = stage.children[index];
    const text = slide.querySelector(".mfa-reel__copy");

    return {
      mask: slide, // slides in from off-frame and uncovers the slide
      inner: slide.firstElementChild, // slides back, so the content holds still
      photo: slide.querySelector(".mfa-reel__media-inner"),
      text: text,
      textLeft: text.firstElementChild,
      textRight: text.lastElementChild,
    };
  }

  const slides = [];
  for (let i = 0; i < leftStage.children.length; i++) {
    slides.push({
      left: partsOf(leftStage, i),
      right: partsOf(rightStage, i),
    });
  }
  if (slides.length < 2) return; // one slide: nothing to change into

  // The same part from both columns. They always move by the same amount: the
  // outgoing photo is still on show either side of the split while the wipe
  // runs, so moving one column differently would tear it along that line.
  function inBothColumns(slide, partName) {
    return [slide.left[partName], slide.right[partName]];
  }

  function buildChange(current, next) {
    const change = gsap.timeline({ defaults: { ease: "none" } });

    // Moves elements up or down, from one offset to another, where `length` is
    // how much of the change it takes up (1 being all of it).
    //
    // Centred, so a change looks the same scrolled up or down — scrolling back
    // plays it in reverse, and anything weighted towards one end would read
    // differently in each direction.
    //
    // Elements starting at rest (start is 0) are the ones leaving. GSAP would
    // normally jump an element to its starting value the moment this line
    // runs, which for those would yank the slide out of place long before its
    // turn, so immediateRender switches that off.
    function move(elements, start, end, length) {
      change.fromTo(
        elements,
        { yPercent: start },
        { yPercent: end, duration: length, immediateRender: start !== 0 },
        (1 - length) / 2,
      );
    }

    // The wipe. The mask slides in from off-frame while the content inside
    // slides back by the same amount, so the new slide is uncovered where it
    // already is instead of travelling into place. The left column is
    // uncovered from below, the right one from above.
    move([next.left.mask], 100, 0, 1);
    move([next.left.inner], -100, 0, 1);
    move([next.right.mask], -100, 0, 1);
    move([next.right.inner], 100, 0, 1);

    // The photo, drifting the whole way. It passes through 0 exactly as the
    // change ends and picks up from 0 in the next, in the same direction —
    // which is what runs one change into the next without a seam.
    move(inBothColumns(next, "photo"), CONFIG.PARALLAX_MEDIA, 0, 1);
    move(inBothColumns(current, "photo"), 0, -CONFIG.PARALLAX_MEDIA, 1);

    // The text block, drifting less than the photo — that difference is what
    // reads as depth. It takes less than the whole change, so the headline
    // settles before the wipe does and then holds still.
    const span = CONFIG.TEXT_SPAN;
    move(inBothColumns(next, "text"), CONFIG.PARALLAX_COPY, 0, span);
    move(inBothColumns(current, "text"), 0, -CONFIG.PARALLAX_COPY, span);

    // The two halves of the text, sliding past each other and closing back
    // into one word. The text is cut down the middle, and moving along that
    // cut rather than across it is what keeps it from opening.
    move(inBothColumns(next, "textLeft"), CONFIG.SPLIT_SHIFT, 0, span);
    move(inBothColumns(next, "textRight"), -CONFIG.SPLIT_SHIFT, 0, span);
    move(inBothColumns(current, "textLeft"), 0, -CONFIG.SPLIT_SHIFT, span);
    move(inBothColumns(current, "textRight"), 0, CONFIG.SPLIT_SHIFT, span);

    return change;
  }

  // No match when the visitor has asked for reduced motion, so nothing is
  // built and the reel stays the plain list of slides that style.css lays out.
  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const reelTimeline = gsap.timeline({ paused: true });
    for (let i = 0; i < slides.length - 1; i++) {
      reelTimeline.add(buildChange(slides[i], slides[i + 1]));
    }

    const scroll = ScrollTrigger.create({
      trigger: reel,
      start: "top top",
      end: () =>
        "+=" +
        window.innerHeight * CONFIG.SCROLL_PER_SLIDE * (slides.length - 1),
      pin: pin,
      pinSpacing: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      animation: reelTimeline, // how far you have scrolled = how far it has played
      scrub: CONFIG.SCRUB, // …with this much catch-up lag
    });

    return () => {
      scroll.kill();
      reelTimeline.kill();
    };
  });

  // our own height never changes, but the host page's might once photos and
  // fonts have settled
  function onLoad() {
    ScrollTrigger.refresh();
  }
  window.addEventListener("load", onLoad, { once: true });

  reel.mfaDestroy = function () {
    window.removeEventListener("load", onLoad);
    mm.revert();
  };
})();
