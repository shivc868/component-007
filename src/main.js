/* ---------------------------------------------------------------------------
   REEL — split-column wipe showreel. Mounts on .mfa-reel (see index.html).

   Structure, top to bottom:

     .mfa-reel__pin              pinned frame; nothing inside it scrolls
       .mfa-reel__column--left   50%-wide window, clips everything inside it
         .mfa-reel__stage        full-frame wide, so content ignores the column
           .mfa-reel__slide      xN — the mask that slides in over the last one
             .mfa-reel__inner    counter-moves, so content is uncovered in place
               __media           the photo, drawn oversized for the drift
               __veil            scrim, so the type stays readable
               __copy            the text, cut down the middle into two halves
       .mfa-reel__column--right  all of the above again
       .mfa-reel__front          current slide's text, whole and unclipped
       .mfa-reel__chrome         site nav and footer, never clipped

   Each column holds its own full-width copy of every slide and only clips it,
   so a headline reads straight across the split. The front layer is the
   resting state and the only text that is interactive or read by a screen
   reader; during a transition it stands down and the column copies take over,
   so the wipe governs the type exactly as it governs the photos.

   Scroll progress drives the timeline's progress, one to one. The timeline is
   a plain alternation of rest and transition, built in buildTimeline() below.
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
   - The global GSAP tweaks (ticker driving, lagSmoothing) are applied ONLY
     when this component creates and owns the Lenis instance.
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
   Content — the only part most buyers need to touch.

   accent  per-slide colour; drives the headline and every label on it
   kicker  short lines above the headline, one per array entry
   title   headline lines, one per array entry — they are NOT auto-wrapped,
           so the break is exactly where you put it
   status  small line under the headline
   cta     optional link; omit both cta and href for a slide with no link
   images  one or two per slide; two split the frame between them
--------------------------------------------------------------------------- */

const CONTENT = [
  {
    accent: "#7fe9fb",
    kicker: ["Content & Marketing", "Web & Digital", "Brand & Identity"],
    title: ["OpenAI for", "Business"],
    status: "Coming soon",
    images: [
      {
        src: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80",
        alt: "Team gathered around a table mid-discussion",
      },
    ],
  },
  {
    accent: "#d9b8ff",
    kicker: ["Feature Documentary"],
    title: ["Crowdfunding", "Creative", "Docuseries"],
    status: "Coming soon",
    cta: "View full project",
    href: "#",
    images: [
      {
        src: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
        alt: "Notes and diagrams covering a studio whiteboard",
      },
      {
        src: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
        alt: "Laptop and paperwork spread across a work table",
      },
    ],
  },
  {
    accent: "#c8ff4d",
    kicker: ["Campaign", "Film & Photography"],
    title: ["Northbound", "Supply Co."],
    status: "Live now",
    cta: "View full project",
    href: "#",
    images: [
      {
        src: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80",
        alt: "Designer working at a laptop in a low-lit studio",
      },
      {
        src: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
        alt: "Workbench covered in tools and sketches",
      },
    ],
  },
  {
    accent: "#ff7a5a",
    kicker: ["Identity System"],
    title: ["Signal", "Studios"],
    status: "2026",
    cta: "View full project",
    href: "#",
    images: [
      {
        src: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80",
        alt: "Empty studio floor lit by tall windows",
      },
    ],
  },
];

/* ---------------------------------------------------------------------------
   Config — every magic number, one knob each.

   Timings are in transitions: one transition is 1, so REST: 0.4 means a slide
   sits still for four tenths of the time it takes to change.
--------------------------------------------------------------------------- */

const CONFIG = {
  SCROLL_PER_SLIDE: 1.25, // viewport heights of scroll each transition takes
  REST: 0.4, // how long a slide sits still between transitions
  SCRUB: 0.6, // seconds the animation lags the scrollbar — 0 to lock to it

  // Parallax, in % of the frame. The photo travels furthest and the text
  // follows slower; that difference is what reads as depth. Keep the photo
  // under --mfa-overscan in style.css or its own edge comes into frame.
  PARALLAX_MEDIA: 10,
  PARALLAX_COPY: 4.5,

  // The text is cut down its middle — the same line the columns split on — and
  // the two halves shear past each other by this much before closing up.
  SPLIT_SHIFT: 9,

  NARROW: 700, // px below which the split turns horizontal (matches style.css)

  // Headline fit. The size itself lives in style.css; these only cap it.
  TITLE_FILL: 0.96, // longest line may not exceed this share of the width
  TITLE_MAX_H: 0.62, // tallest headline block, as a share of the height
  TITLE_MIN: 20, // px floor
};

const COLUMNS = ["left", "right"];

(function mfaReel() {
  const root = document.querySelector(".mfa-reel");
  if (!root) return;

  const pin = root.querySelector("[data-mfa-pin]");
  const front = root.querySelector("[data-mfa-front]");
  const stages = {
    left: root.querySelector('[data-mfa-stage="left"]'),
    right: root.querySelector('[data-mfa-stage="right"]'),
  };
  if (!pin || !front || !stages.left || !stages.right) return;
  if (CONTENT.length === 0) return;

  /* ---- building the DOM ------------------------------------------------- */

  const el = (tag, cls, parent) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (parent) parent.appendChild(node);
    return node;
  };

  /** One rendering of a slide's text: kicker, headline, status, cta. */
  const fillLayer = (layer, item) => {
    if (item.kicker?.length) {
      const kicker = el("p", "mfa-reel__kicker", layer);
      for (const line of item.kicker) {
        el("span", "mfa-reel__kicker-line", kicker).textContent = line;
      }
    }

    const title = el("h2", "mfa-reel__title", layer);
    for (const line of item.title) {
      el("span", "mfa-reel__line", title).textContent = line;
    }

    if (item.status) {
      el("p", "mfa-reel__status", layer).textContent = item.status;
    }

    if (item.cta) {
      const cta = el("a", "mfa-reel__cta", layer);
      cta.href = item.href || "#";
      cta.textContent = item.cta;
    }
  };

  /** In the columns the text is rendered twice, each copy clipped to one half
   *  of itself (see style.css) so the two can shear apart and close back into
   *  one. The front layer is the resting state and needs no split. */
  const buildCopy = (item, split) => {
    const copy = el("div", "mfa-reel__copy");

    if (!split) {
      fillLayer(el("div", "mfa-reel__copy-layer", copy), item);
      return { copy };
    }

    const cut = (edge) => {
      const layer = el(
        "div",
        `mfa-reel__copy-layer mfa-reel__copy-layer--${edge}`,
        copy,
      );
      fillLayer(layer, item);
      return layer;
    };

    return { copy, leftHalf: cut("left"), rightHalf: cut("right") };
  };

  const buildSlide = (item, i) => {
    const slide = el("article", "mfa-reel__slide");
    slide.style.setProperty("--mfa-accent", item.accent);

    const inner = el("div", "mfa-reel__inner", slide);
    const media = el("div", "mfa-reel__media", inner);
    const mediaInner = el("div", "mfa-reel__media-inner", media);

    for (const image of item.images) {
      const img = el("img", "mfa-reel__img", mediaInner);
      img.src = image.src;
      img.alt = ""; // decorative here; the front layer carries the real text
      img.decoding = "async";
      // the first frame is above the fold in both columns, the rest are not
      if (i === 0) img.fetchPriority = "high";
      else img.loading = "lazy";
    }

    el("div", "mfa-reel__veil", inner);
    const { copy, leftHalf, rightHalf } = buildCopy(item, true);
    inner.appendChild(copy);

    return { slide, inner, mediaInner, copy, leftHalf, rightHalf };
  };

  // one set of slides per column, plus one whole copy in the front layer
  const slides = CONTENT.map((item, i) => {
    const built = {};

    for (const side of COLUMNS) {
      built[side] = buildSlide(item, i);
      stages[side].appendChild(built[side].slide);
    }

    const shell = el("article", "mfa-reel__slide", front);
    shell.style.setProperty("--mfa-accent", item.accent);
    shell.appendChild(buildCopy(item, false).copy);
    built.front = shell;

    return built;
  });

  /** The same element from both columns, so a tween can move them as one. */
  const both = (slide, key) => COLUMNS.map((side) => slide[side][key]);

  /* ---- accessibility ---------------------------------------------------- */

  // the columns are a visual duplicate of the front layer — keep them out of
  // the a11y tree and out of the tab order
  const columnEls = COLUMNS.map((side) =>
    root.querySelector(`[data-mfa-column="${side}"]`),
  );

  const setDuplicate = (column, on) => {
    if (!column) return;
    if (on) column.setAttribute("aria-hidden", "true");
    else column.removeAttribute("aria-hidden");
    for (const link of column.querySelectorAll("a")) {
      if (on) link.setAttribute("tabindex", "-1");
      else link.removeAttribute("tabindex");
    }
  };

  columnEls.forEach((column) => setDuplicate(column, true));

  /* ---- headline sizing --------------------------------------------------

     One size for the whole reel, written once on the root and inherited by
     every copy. Consecutive sections sit exactly on each other during a
     transition, so a per-slide fit would have them changing size as they hand
     over.

     Lines are authored and never wrap, so the size style.css asks for would
     overflow the frame the moment a headline gets long. Measure every line at
     a reference size, then pull that size down just far enough for the longest
     line and the tallest block to fit.
  ------------------------------------------------------------------------ */

  const REF = 100; // measure at this size, then scale the answer
  const SIZE_VAR = "--mfa-title-size";

  const fitTitle = () => {
    // the left column is the probe: it always spans the whole frame, and its
    // copy is only ever hidden with visibility, which leaves layout intact
    const layer = stages.left.querySelector(".mfa-reel__copy-layer");
    const titles = [
      ...stages.left.querySelectorAll(
        ".mfa-reel__copy-layer--left .mfa-reel__title",
      ),
    ];
    if (!layer || !titles.length) return;

    // drop last pass's value so the stylesheet's own size resolves through the
    // var() fallback — that is the size we are allowed to ask for
    root.style.removeProperty(SIZE_VAR);
    const wanted = parseFloat(getComputedStyle(titles[0]).fontSize);

    const pad = getComputedStyle(layer);
    const availW =
      layer.clientWidth -
      parseFloat(pad.paddingLeft) -
      parseFloat(pad.paddingRight);
    const availH =
      layer.clientHeight -
      parseFloat(pad.paddingTop) -
      parseFloat(pad.paddingBottom);
    if (availW <= 0 || availH <= 0) return;

    let widest = 0;
    let mostLines = 0;
    for (const title of titles) {
      title.style.fontSize = REF + "px";
      for (const line of title.children) {
        widest = Math.max(widest, line.scrollWidth);
      }
      mostLines = Math.max(mostLines, title.children.length);
    }
    // read the leading back rather than duplicating it from the stylesheet
    const leading = parseFloat(getComputedStyle(titles[0]).lineHeight) / REF;
    for (const title of titles) title.style.fontSize = "";
    if (!widest) return;

    const size = Math.min(
      wanted,
      (availW * CONFIG.TITLE_FILL * REF) / widest, // longest line fits across
      (availH * CONFIG.TITLE_MAX_H) / (mostLines * leading), // tallest fits down
    );

    root.style.setProperty(
      SIZE_VAR,
      Math.max(CONFIG.TITLE_MIN, size).toFixed(2) + "px",
    );
  };

  /* ---- the animation ----------------------------------------------------- */

  /** Which way each column is uncovered. Wide screens split down the middle —
   *  the right column wipes down, the left wipes up. Narrow ones split across
   *  instead, so the same move rotates onto the x axis. */
  const axesFor = (narrow) =>
    narrow
      ? {
          left: { prop: "xPercent", edge: 100 }, // top band, in from the right
          right: { prop: "xPercent", edge: -100 }, // bottom band, from the left
        }
      : {
          left: { prop: "yPercent", edge: 100 }, // in from below
          right: { prop: "yPercent", edge: -100 }, // in from above
        };

  /** One slide handing over to the next. Always exactly 1 long, and every
   *  tween runs the full length from position 0 — the two columns move in
   *  lockstep, so there is no position arithmetic anywhere in here. */
  const transition = (from, to, axes) => {
    const tl = gsap.timeline({ defaults: { duration: 1, ease: "none" } });

    // an arriving layer starts offset and settles to rest
    const arrive = (targets, offset) =>
      tl.fromTo(targets, { yPercent: offset }, { yPercent: 0 }, 0);

    // a leaving layer starts at rest and carries on the same way. GSAP would
    // otherwise apply this "from" as soon as the tween is built, snapping the
    // slide out of place long before its turn comes round.
    const leave = (targets, offset) =>
      tl.fromTo(
        targets,
        { yPercent: 0 },
        { yPercent: offset, immediateRender: false },
        0,
      );

    // 1. the wipe — the mask slides in from off-frame while the content inside
    //    counter-moves by the same amount, so the new slide is uncovered in
    //    place rather than travelling
    for (const side of COLUMNS) {
      const { prop, edge } = axes[side];
      tl.fromTo(to[side].slide, { [prop]: edge }, { [prop]: 0 }, 0);
      tl.fromTo(to[side].inner, { [prop]: -edge }, { [prop]: 0 }, 0);
    }

    // 2. parallax — both columns get identical values on purpose. The outgoing
    //    photo is still on show either side of the split while the wipe runs,
    //    so a per-column offset would tear the picture along that line.
    arrive(both(to, "mediaInner"), CONFIG.PARALLAX_MEDIA);
    arrive(both(to, "copy"), CONFIG.PARALLAX_COPY);
    leave(both(from, "mediaInner"), -CONFIG.PARALLAX_MEDIA);
    leave(both(from, "copy"), -CONFIG.PARALLAX_COPY);

    // 3. the split — the two halves of the text shear past each other. Moving
    //    along the cut rather than across it is what keeps the line closed, so
    //    no glyph is ever torn open. Each half runs with the column it shows
    //    through: the left half rises like the left column, the right descends.
    arrive(both(to, "leftHalf"), CONFIG.SPLIT_SHIFT);
    arrive(both(to, "rightHalf"), -CONFIG.SPLIT_SHIFT);
    leave(both(from, "leftHalf"), -CONFIG.SPLIT_SHIFT);
    leave(both(from, "rightHalf"), CONFIG.SPLIT_SHIFT);

    // 4. the handover — the front layer sits above both columns, so it stands
    //    down for the length of the wipe and lets the column copies take over.
    //    Leaving it up would paint the outgoing headline over the half already
    //    turned over to the next slide. Both swaps are invisible, because the
    //    copies are on the very same pixels at rest.
    const copies = [...both(from, "copy"), ...both(to, "copy")];
    tl.set(from.front, { autoAlpha: 0 }, 0)
      .set(copies, { autoAlpha: 1 }, 0)
      .set(to.front, { autoAlpha: 1 }, 1)
      .set(copies, { autoAlpha: 0 }, 1);

    return tl;
  };

  /** The whole reel: rest, transition, rest, transition… and a rest at the end
   *  so the last slide is not parked on the very bottom of the scroll. */
  const buildTimeline = (axes) => {
    const master = gsap.timeline({ paused: true });

    slides.forEach((slide, i) => {
      const next = slides[i + 1];
      if (next) master.add(transition(slide, next, axes), "+=" + CONFIG.REST);
    });

    return master.to({}, { duration: CONFIG.REST });
  };

  /* ---- start ------------------------------------------------------------ */

  fitTitle();

  const mm = gsap.matchMedia();
  const cleanups = [() => mm.revert()];

  mm.add(
    {
      still: "(prefers-reduced-motion: reduce)",
      wide: `(prefers-reduced-motion: no-preference) and (min-width: ${CONFIG.NARROW + 1}px)`,
      narrow: `(prefers-reduced-motion: no-preference) and (max-width: ${CONFIG.NARROW}px)`,
    },
    (ctx) => {
      // reduced motion: no pin, no wipe, just a list of full-height slides.
      // Deliberately writes no inline styles — the .mfa-reel--still rules in
      // style.css are the whole story.
      if (ctx.conditions.still) {
        root.classList.add("mfa-reel--still");
        setDuplicate(columnEls[0], false); // the left column becomes the content
        return () => {
          root.classList.remove("mfa-reel--still");
          setDuplicate(columnEls[0], true);
        };
      }

      // opening frame: slide 0 already landed, every other slide off-frame
      gsap.set(
        slides.map((s) => s.front),
        { autoAlpha: 0 },
      );
      gsap.set(slides[0].front, { autoAlpha: 1 });
      gsap.set(
        slides.flatMap((s) => both(s, "copy")),
        { autoAlpha: 0 },
      );

      if (slides.length < 2) return; // one slide: nothing to transition to

      const timeline = buildTimeline(axesFor(ctx.conditions.narrow));

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
        // scroll progress drives timeline progress; scrub is the catch-up lag
        animation: timeline,
        scrub: CONFIG.SCRUB,
      });

      return () => {
        scroll.kill();
        timeline.kill();
      };
    },
  );

  // headline sizing is measured, so it has to be redone whenever the frame
  // changes shape; coalesced to one pass per frame because resize fires hot
  let queued = 0;
  const onResize = () => {
    if (queued) return;
    queued = requestAnimationFrame(() => {
      queued = 0;
      fitTitle();
    });
  };
  window.addEventListener("resize", onResize);
  cleanups.push(() => {
    window.removeEventListener("resize", onResize);
    if (queued) cancelAnimationFrame(queued);
  });

  // the first measurement ran on fallback metrics; redo it on the real face
  document.fonts?.ready.then(fitTitle);

  // late-decoding photos change nothing about our height, but the host page's
  // might — re-measure once everything has settled
  const onLoad = () => ScrollTrigger.refresh();
  window.addEventListener("load", onLoad, { once: true });
  cleanups.push(() => window.removeEventListener("load", onLoad));

  root.mfaDestroy = () => cleanups.forEach((fn) => fn());
})();
