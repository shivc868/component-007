/* ---------------------------------------------------------------------------
   REEL — split-column wipe showreel.

   Mounts on .mfa-reel (see index.html). Each of the two columns gets its own
   full-width copy of every slide and only clips it, so a headline reads
   straight across the split while the halves sit at different points in the
   wipe. The current slide's copy is mirrored into a front layer above both
   columns; that is the one that holds through the overlap and hard-cuts.
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
   images  one or two per slide; two split the frame evenly
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
   Timings are in abstract beats; the scroll distance below scales them all.
--------------------------------------------------------------------------- */

const CONFIG = {
  SLIDE_VH: 1.25, // scroll distance per transition, in viewport heights
  WIPE: 1, // beats the leading column takes to travel the full frame
  // head start the leading column gets, in beats. Both columns always travel
  // at the same rate — this only offsets when the second one sets off, so 0
  // runs them in lockstep and any positive value stays that far ahead throughout.
  STAGGER: 0,
  HOLD: 0.4, // beats a slide rests before the next wipe begins
  SCRUB: 0.6, // seconds the animation lags the scrollbar — 0 to lock to it
  // Vertical parallax. Both layers drift upward through a transition; the
  // photo travels further than the headline, and that difference is the
  // effect. Percentages of each layer's own height — keep MEDIA under the
  // --mfa-overscan margin in style.css or the photo's edge comes into frame.
  PARALLAX_MEDIA: 8, // incoming photo enters this far below its resting place
  // The copy travels as one block, exactly like the photo does — kicker,
  // headline and labels stay locked together at a fixed size, so consecutive
  // sections sit on each other and only the drift rate tells them apart.
  // Keep this under PARALLAX_MEDIA or there is no parallax between the two.
  PARALLAX_COPY: 4.5, // % of the frame height the copy block travels
  // On top of that the content is cut down its middle — the same line the
  // columns split on — and the two halves shear past each other vertically,
  // closing back into one exactly as the wipe lands.
  SPLIT_SHIFT: 9, // % of the frame height each half is offset by at the start
  NARROW: 700, // px below which the split turns horizontal (matches style.css)
  // the headline's intended size lives in style.css (font-size on
  // .mfa-reel__title); these are only the guards that shrink it to fit
  TITLE_FILL: 0.96, // widest line may not exceed this share of the frame width
  TITLE_MAX_H: 0.62, // whole headline block, as a share of the frame height
  TITLE_MIN: 20, // px floor
};

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

  const SIDES = ["left", "right"];

  const el = (tag, cls, parent) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (parent) parent.appendChild(node);
    return node;
  };

  /** One rendering of the content: kicker, headline, status, cta. */
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

  /* The copy block.

     In the columns the content is rendered twice, each rendering clipped to
     one half of itself (see style.css). The two are complementary, so they
     tear apart in opposite directions during the wipe and close back into a
     single whole headline as it lands.

     The front layer needs no split — it is the resting state — so it gets a
     single unclipped layer. That is also the copy that stays interactive. */
  const buildCopy = (item, split) => {
    const copy = el("div", "mfa-reel__copy");

    if (!split) {
      fillLayer(el("div", "mfa-reel__copy-layer", copy), item);
      return { copy, layers: [] };
    }

    const layers = ["left", "right"].map((edge) => {
      const layer = el(
        "div",
        `mfa-reel__copy-layer mfa-reel__copy-layer--${edge}`,
        copy,
      );
      fillLayer(layer, item);
      return layer;
    });

    return { copy, layers };
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
    const { copy, layers } = buildCopy(item, true);
    inner.appendChild(copy);

    return { slide, inner, mediaInner, copy, layers };
  };

  // one set of slides per column, plus a front copy per slide
  const parts = CONTENT.map((item, i) => {
    const built = {};
    for (const side of SIDES) {
      built[side] = buildSlide(item, i);
      stages[side].appendChild(built[side].slide);
    }

    // front layer: a bare copy with no media behind it, and no split
    const shell = el("article", "mfa-reel__slide", front);
    shell.style.setProperty("--mfa-accent", item.accent);
    shell.appendChild(buildCopy(item, false).copy);
    built.front = shell;

    return built;
  });

  // the columns are a visual duplicate of the front layer — keep them out of
  // the a11y tree and out of the tab order
  const halves = SIDES.map((side) => root.querySelector(`[data-mfa-half="${side}"]`));
  const setDuplicate = (half, on) => {
    if (!half) return;
    if (on) half.setAttribute("aria-hidden", "true");
    else half.removeAttribute("aria-hidden");
    for (const link of half.querySelectorAll("a")) {
      if (on) link.setAttribute("tabindex", "-1");
      else link.removeAttribute("tabindex");
    }
  };
  halves.forEach((half) => setDuplicate(half, true));

  /* Headline sizing.
     One size for the whole component, not one per slide: the sections stack on
     each other during a transition, so a slide-by-slide fit would have them
     changing size as they hand over. Every slide is measured, the tightest
     answer wins, and all of them get it — so they overlap at exactly the same
     size whatever their content.

     Lines are authored and never wrap, so the size style.css asks for will
     overflow the frame the moment a buyer writes a long word; the measured
     terms only ever pull that size down. The left column is the probe: it
     always spans the whole frame, and its copy is only ever hidden with
     visibility, which leaves layout intact. */
  const REF = 100;
  const VAR = "--mfa-title-size";

  const fitTitles = () => {
    const nodes = parts.flatMap((p) => [p.left.slide, p.right.slide, p.front]);
    // drop last pass's value so the stylesheet's own size resolves through the
    // var() fallback — that is the size we are allowed to ask for
    for (const node of nodes) node.style.removeProperty(VAR);

    let size = Infinity;

    for (const part of parts) {
      // the layer, not the copy: the padding that bounds the text lives there
      const layer = part.left.copy.querySelector(".mfa-reel__copy-layer");
      const title = layer.querySelector(".mfa-reel__title");
      const lines = [...title.children];
      if (!lines.length) continue;

      const cs = getComputedStyle(layer);
      const availW =
        layer.clientWidth -
        parseFloat(cs.paddingLeft) -
        parseFloat(cs.paddingRight);
      const availH =
        layer.clientHeight -
        parseFloat(cs.paddingTop) -
        parseFloat(cs.paddingBottom);
      if (availW <= 0 || availH <= 0) continue;

      const pref = parseFloat(getComputedStyle(title).fontSize);

      title.style.fontSize = REF + "px";
      const widest = lines.reduce((w, line) => Math.max(w, line.scrollWidth), 0);
      // read the leading back rather than duplicating it from the stylesheet
      const leading = parseFloat(getComputedStyle(title).lineHeight) / REF;
      title.style.fontSize = "";
      if (!widest) continue;

      size = Math.min(
        size,
        pref,
        (availW * CONFIG.TITLE_FILL * REF) / widest,
        (availH * CONFIG.TITLE_MAX_H) / (lines.length * leading),
      );
    }

    if (!Number.isFinite(size)) return;
    const px = Math.max(CONFIG.TITLE_MIN, size).toFixed(2) + "px";
    for (const node of nodes) node.style.setProperty(VAR, px);
  };

  const N = parts.length;
  const { WIPE, STAGGER, HOLD } = CONFIG;
  const step = WIPE + STAGGER + HOLD;

  /** Which way each column uncovers, and which one leads. Wide screens split
   *  vertically (right wipes down, left follows upward); narrow ones split
   *  horizontally, so the same choreography rotates onto the x axis. */
  const axesFor = (narrow) =>
    narrow
      ? {
          left: { prop: "xPercent", from: 100, delay: 0 }, // top band, from the right
          right: { prop: "xPercent", from: -100, delay: STAGGER },
        }
      : {
          right: { prop: "yPercent", from: -100, delay: 0 }, // wipes down
          left: { prop: "yPercent", from: 100, delay: STAGGER }, // then up
        };

  const buildTimeline = (axes) => {
    const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });

    for (let k = 0; k < N - 1; k++) {
      const at = HOLD + k * step;
      const cut = at + WIPE + STAGGER; // the beat both columns have landed on
      const from = parts[k];
      const to = parts[k + 1];
      const inCols = SIDES.map((side) => to[side]);
      const outCols = SIDES.map((side) => from[side]);
      const copies = [...outCols, ...inCols].map((c) => c.copy);

      /* Both headlines hand over to their column copies for the length of the
         transition, so the mask governs the type exactly as it governs the
         photos: the outgoing one is covered where the wipe has passed, the
         incoming one uncovered. The front layer has to stand down for that —
         it sits above both columns, so leaving it up would paint the outgoing
         headline over the half already turned over to the next slide. The
         swap is invisible: both copies are at rest on the same pixels. */
      tl.set(from.front, { autoAlpha: 0 }, at);
      tl.set(copies, { autoAlpha: 1 }, at);

      for (const side of SIDES) {
        const a = axes[side];
        const col = to[side];
        // mask slides in from off-frame, content pushes back by the same
        // amount — so it is uncovered in place rather than travelling
        tl.fromTo(
          col.slide,
          { [a.prop]: a.from },
          { [a.prop]: 0, duration: WIPE },
          at + a.delay,
        );
        tl.fromTo(
          col.inner,
          { [a.prop]: -a.from },
          { [a.prop]: 0, duration: WIPE },
          at + a.delay,
        );
      }

      /* Parallax. Deliberately the same in both columns: the outgoing photo is
         still on show either side of the split while the wipe runs, so any
         per-column offset would tear the picture along that line. One drift,
         one direction — the columns only ever differ in what they uncover. */
      const span = WIPE + STAGGER;
      const drift = (targets, from0, to0, prop = "yPercent") =>
        tl.fromTo(
          targets,
          { [prop]: from0 },
          // immediateRender off on the outgoing pass, or it would stomp the
          // resting state the incoming pass left on the same element
          { [prop]: to0, duration: span, immediateRender: from0 !== 0 },
          at,
        );

      drift(
        inCols.map((c) => c.mediaInner),
        CONFIG.PARALLAX_MEDIA,
        0,
      );
      drift(
        inCols.map((c) => c.copy),
        CONFIG.PARALLAX_COPY,
        0,
      );
      // outgoing layers keep travelling the same way as they get covered
      drift(
        outCols.map((c) => c.mediaInner),
        0,
        -CONFIG.PARALLAX_MEDIA,
      );
      drift(
        outCols.map((c) => c.copy),
        0,
        -CONFIG.PARALLAX_COPY,
      );

      /* The split. The content is cut down its middle and the two halves shear
         past each other vertically, closing back to 0 at `cut` — where they
         line up into exactly the whole headline the front layer is holding, so
         it can take back over without a seam.

         Vertical movement is the point. The cut is vertical, so travelling
         along it keeps the halves touching the whole way: the line never opens
         and no glyph is torn across. Moving them across the cut instead is
         what puts a gap through the type.

         Each half runs with the column it shows through — the left half rises
         like the left column's wipe, the right half descends like the right's. */
      const { SPLIT_SHIFT } = CONFIG;
      const half = (columns, i) => columns.map((c) => c.layers[i]);

      drift(half(inCols, 0), SPLIT_SHIFT, 0);
      drift(half(inCols, 1), -SPLIT_SHIFT, 0);
      drift(half(outCols, 0), 0, -SPLIT_SHIFT);
      drift(half(outCols, 1), 0, SPLIT_SHIFT);

      // the wipe has landed: the front layer takes the new headline back over,
      // and both column copies stand down again
      tl.set(to.front, { autoAlpha: 1 }, cut);
      tl.set(copies, { autoAlpha: 0 }, cut);
    }

    // trailing rest, so the last slide is not sitting on the end of the scroll
    tl.to({}, { duration: HOLD }, (N - 1) * step);
    return tl;
  };

  fitTitles();

  const mm = gsap.matchMedia();
  const cleanups = [() => mm.revert()];

  mm.add(
    {
      still: "(prefers-reduced-motion: reduce)",
      wide: `(prefers-reduced-motion: no-preference) and (min-width: ${CONFIG.NARROW + 1}px)`,
      narrow: `(prefers-reduced-motion: no-preference) and (max-width: ${CONFIG.NARROW}px)`,
    },
    (ctx) => {
      // reduced motion: no pin, no wipe. Deliberately writes no inline styles —
      // the .mfa-reel--still rules in style.css are the whole story.
      if (ctx.conditions.still) {
        root.classList.add("mfa-reel--still");
        setDuplicate(halves[0], false); // the left column becomes the content
        return () => {
          root.classList.remove("mfa-reel--still");
          setDuplicate(halves[0], true);
        };
      }

      // starting frame: slide 0 already landed, everything else off-frame
      gsap.set(
        parts.map((p) => p.front),
        { autoAlpha: 0 },
      );
      gsap.set(parts[0].front, { autoAlpha: 1 });
      gsap.set(
        parts.flatMap((p) => SIDES.map((side) => p[side].copy)),
        { autoAlpha: 0 },
      );

      if (N < 2) return; // single slide: nothing to transition to

      const tl = buildTimeline(axesFor(ctx.conditions.narrow));

      const st = ScrollTrigger.create({
        trigger: root,
        start: "top top",
        end: () => "+=" + window.innerHeight * CONFIG.SLIDE_VH * (N - 1),
        pin,
        pinSpacing: true,
        anticipatePin: 1,
        scrub: CONFIG.SCRUB,
        invalidateOnRefresh: true,
        animation: tl,
      });

      return () => {
        st.kill();
        tl.kill();
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
      fitTitles();
    });
  };
  window.addEventListener("resize", onResize);
  cleanups.push(() => {
    window.removeEventListener("resize", onResize);
    if (queued) cancelAnimationFrame(queued);
  });

  // the first measurement ran on fallback metrics; redo it on the real face
  document.fonts?.ready.then(fitTitles);

  // late-decoding photos change nothing about our height, but the host page's
  // might — re-measure once everything has settled
  const onLoad = () => ScrollTrigger.refresh();
  window.addEventListener("load", onLoad, { once: true });
  cleanups.push(() => window.removeEventListener("load", onLoad));

  root.mfaDestroy = () => cleanups.forEach((fn) => fn());
})();
