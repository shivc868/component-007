import "./style.css";
import "./demo.css"; // demo page only
import "lenis/dist/lenis.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

const SMOOTH_SCROLL = true;

if (SMOOTH_SCROLL && !window.lenis) {
  const lenis = new Lenis({ autoRaf: false, anchors: true });
  window.lenis = lenis;
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

const CONFIG = {
  SCROLL_PER_SLIDE: 1, // viewport heights of scroll per transition
  SCRUB: 0.6, // scrub lag in seconds
  PARALLAX_MEDIA: 10, // photo drift; raising it needs a bigger --mfa-overscan
  PARALLAX_COPY: 4.5, // text drifts less than the photo
  SPLIT_SHIFT: 9, // shear between the two text halves
  TEXT_SPAN: 0.8, // share of a transition the text takes
};

(function mfaReel() {
  const reel = document.querySelector(".mfa-reel");
  if (!reel) return;

  const pin = reel.querySelector("[data-mfa-pin]");
  const template = reel.querySelector("[data-mfa-slides]");
  const leftStage = reel.querySelector('[data-mfa-stage="left"]');
  const rightStage = reel.querySelector('[data-mfa-stage="right"]');
  if (!pin || !template || !leftStage || !rightStage) return;

  // Each column gets its own copy of the slides, and each slide's copy block
  // gets a second layer for the two halves to shear. The twin is a visual
  // duplicate, so inert keeps it out of the a11y tree and tab order.
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
      mask: slide, // slides in from off-frame
      inner: slide.firstElementChild, // counter-moves so content holds still
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
  if (slides.length < 2) return;

  // The same part from both columns. Both must move by the same amount or the
  // image tears along the split while the wipe runs.
  function inBothColumns(slide, partName) {
    return [slide.left[partName], slide.right[partName]];
  }

  function buildChange(current, next) {
    const change = gsap.timeline({ defaults: { ease: "none" } });

    // yPercent tween from start to end over `length` of the transition,
    // centred so it reads the same scrolling either way.
    //
    // start === 0 means the element is on screen and leaving; immediateRender
    // is off there so GSAP does not snap it into place ahead of its turn.
    function move(elements, start, end, length) {
      change.fromTo(
        elements,
        { yPercent: start },
        { yPercent: end, duration: length, immediateRender: start !== 0 },
        (1 - length) / 2,
      );
    }

    // The wipe: mask in, inner back by the same amount, so the incoming slide
    // is uncovered in place. Left uncovers from below, right from above.
    move([next.left.mask], 100, 0, 1);
    move([next.left.inner], -100, 0, 1);
    move([next.right.mask], -100, 0, 1);
    move([next.right.inner], 100, 0, 1);

    // The photo drifts the whole way, passing through 0 as the change ends and
    // picking up from 0 in the next one, so transitions join without a seam.
    move(inBothColumns(next, "photo"), CONFIG.PARALLAX_MEDIA, 0, 1);
    move(inBothColumns(current, "photo"), 0, -CONFIG.PARALLAX_MEDIA, 1);

    // The text block drifts less than the photo, and finishes early so the
    // headline settles before the wipe does.
    const span = CONFIG.TEXT_SPAN;
    move(inBothColumns(next, "text"), CONFIG.PARALLAX_COPY, 0, span);
    move(inBothColumns(current, "text"), 0, -CONFIG.PARALLAX_COPY, span);

    // The two halves shear past each other and close back into one word. The
    // shear runs along the cut, not across it, so the seam never opens.
    move(inBothColumns(next, "textLeft"), CONFIG.SPLIT_SHIFT, 0, span);
    move(inBothColumns(next, "textRight"), -CONFIG.SPLIT_SHIFT, 0, span);
    move(inBothColumns(current, "textLeft"), 0, -CONFIG.SPLIT_SHIFT, span);
    move(inBothColumns(current, "textRight"), 0, CONFIG.SPLIT_SHIFT, span);

    return change;
  }

  // Under reduced motion this never matches, so nothing is built and the reel
  // stays the plain list of slides style.css lays out.
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
      animation: reelTimeline,
      scrub: CONFIG.SCRUB,
    });

    return () => {
      scroll.kill();
      reelTimeline.kill();
    };
  });

  // the host page's height can still change once photos and fonts settle
  function onLoad() {
    ScrollTrigger.refresh();
  }
  window.addEventListener("load", onLoad, { once: true });

  reel.mfaDestroy = function () {
    window.removeEventListener("load", onLoad);
    mm.revert();
  };
})();
