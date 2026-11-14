/* =====================================================================
   MMC v3 — animations.js (GSAP + ScrollTrigger + SplitText + Lenis)
   The camera in the 3D room carries most of the motion, so the DOM moves
   with restraint: an intro, panel reveals, split headings, and the
   philosophy knobs turning as you read. All timings sit on a 120 BPM grid.
   ===================================================================== */
(function () {
  "use strict";
  var html = document.documentElement, MMC = (window.MMC = window.MMC || {}), B = 0.5;
  if (!window.gsap || !window.ScrollTrigger) { html.classList.add("no-anim"); return; }
  try { init(); } catch (err) { console.error("[MMC] animation init failed", err); html.classList.add("no-anim"); }

  function init() {
    gsap.registerPlugin(ScrollTrigger);
    if (window.SplitText) gsap.registerPlugin(SplitText);
    var mm = gsap.matchMedia();
    mm.add({ motion: "(prefers-reduced-motion: no-preference)", desktop: "(min-width: 1024px) and (pointer: fine)" }, function (ctx) {
      var c = ctx.conditions;
      if (!c.motion) { html.classList.add("anim-ready"); return; }
      var lenis = null;
      if (c.desktop && window.Lenis) {
        lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
        lenis._raf = function (t) { lenis.raf(t * 1000); };
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add(lenis._raf); gsap.ticker.lagSmoothing(0);
        MMC.lenis = lenis;
      }
      intro(); panels(); heads(); knobs();
      html.classList.add("anim-ready");
      return function () { if (lenis) { gsap.ticker.remove(lenis._raf); lenis.destroy(); MMC.lenis = null; } };
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); if (MMC.refreshShots) MMC.refreshShots(); });
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  }

  var introPlayed = false;
  function intro() {
    var items = gsap.utils.toArray(".intro > *");
    if (introPlayed) { gsap.set(items, { autoAlpha: 1, y: 0 }); return; }
    introPlayed = true;
    gsap.fromTo(items, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: B * 2, stagger: B / 4, ease: "expo.out", delay: 0.3, clearProps: "transform" });
    gsap.from(".topbar, .dock", { autoAlpha: 0, y: function (i) { return i ? 30 : -20; }, duration: B * 2, ease: "expo.out", delay: 0.9 });
  }

  function panels() {
    gsap.utils.toArray(".panel").forEach(function (p) {
      gsap.from(p, { autoAlpha: 0, y: 60, duration: B * 2, ease: "expo.out", scrollTrigger: { trigger: p, start: "top 88%", once: true } });
    });
  }

  function heads() {
    if (!window.SplitText) return;
    gsap.utils.toArray(".panel h2").forEach(function (h) {
      SplitText.create(h, { type: "words", autoSplit: true, onSplit: function (self) {
        return gsap.from(self.words, { autoAlpha: 0, yPercent: 60, duration: B * 1.4, stagger: B / 8, ease: "expo.out", scrollTrigger: { trigger: h, start: "top 85%", once: true } });
      } });
    });
  }

  function knobs() {
    gsap.utils.toArray(".knobs li").forEach(function (li, i) {
      var k = li.querySelector(".knob");
      gsap.fromTo(k, { "--r": "-140deg" }, { "--r": (40 + i * 25) + "deg", ease: "none", scrollTrigger: { trigger: li, start: "top 85%", end: "top 45%", scrub: true } });
    });
  }
})();
