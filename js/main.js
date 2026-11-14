/* =====================================================================
   MMC v3 — main.js
   Interface behaviour. Everything here works without WebGL; when the
   3D room is running, the same controls also drive it.
   ===================================================================== */
(function () {
  "use strict";
  var MMC = (window.MMC = window.MMC || {});
  var S = MMC.signal;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var phone = matchMedia("(max-width: 759px)");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)");

  /* Photos — same order as the 3D archive field in js/world/world.js */
  var PHOTOS = [
    { take: 4, cat: "stage", alt: "A guitarist with a checkered strap faces a crowd holding up their phone lights." },
    { take: 10, cat: "stage", alt: "A bassist in a black T-shirt plays a dark red bass guitar on stage.", h: 449 },
    { take: 1, cat: "stage", alt: "A vocalist in a white baju and songket sarong sings on stage in front of an “Acap & Friends” banner." },
    { take: 8, cat: "community", alt: "A group of members raise their drinks and grin at the camera." },
    { take: 3, cat: "stage", alt: "A vocalist in a pale blue hijab sings under a single spotlight on a dark stage." },
    { take: 6, cat: "stage", alt: "Black and white: a guitarist and a vocalist in hijab, silhouetted on stage." },
    { take: 2, cat: "community", alt: "Club members in black baju Melayu gather close together beside the stage." },
    { take: 5, cat: "stage", alt: "A performer throws an arm in the air on stage while the line-up celebrates in front of a large screen." },
    { take: 11, cat: "stage", alt: "Two vocalists in hijab sing a duet into standing microphones at an indoor event.", h: 449 },
    { take: 7, cat: "stage", alt: "Performers seen from behind on a dim stage washed in blue light, one with a fist raised." },
    { take: 9, cat: "stage", alt: "A band on keys, drums, guitar and vocals plays a daytime set under an Entrepreneurship Week Bazaar Day banner." },
  ];
  var CAT_DESC = {
    all: "Every photo in the archive.",
    stage: "On stage. The lights, the music, and the moments in front of an audience.",
    backstage: "Backstage. Preparation, anticipation, and everything away from the spotlight.",
    sessions: "The sessions. Rehearsals, practice, experimentation, and collaboration.",
    community: "The community. The friendships, connections, and everyday moments that make MMC what it is.",
  };
  var PEDAL_TO_SECTION = ["who", "sound", "experience", "process", "people", "archive", "join"];
  var NAMES = { guitar: "guitar", bass: "bass", kick: "kick drum", snare: "snare", hat: "hi-hat", crash: "crash", ride: "ride", tom: "tom", floor: "floor tom", keys: "keys", mic: "mic", desk: "desk", stage: "stage" };

  /* ---------------- sound controls ---------------- */
  var btnSound = $("#btn-sound"), btnLoop = $("#btn-loop"), toast = $("#toast"), toastT;
  function syncSound() {
    if (!S) return;
    btnSound.setAttribute("aria-pressed", String(S.soundOn));
    $(".chip__label", btnSound).textContent = S.soundOn ? "Sound on" : "Sound off";
    btnLoop.hidden = !S.soundOn;
    btnLoop.setAttribute("aria-pressed", String(S.live));
    $(".chip__label", btnLoop).textContent = S.live ? "Stop loop" : "Play loop";
  }
  if (S) {
    btnSound.addEventListener("click", function () { S.enableSound(!S.soundOn); hideToast(); });
    btnLoop.addEventListener("click", function () { S.toggle(); });
    S.onState(syncSound); syncSound();
  } else { btnSound.hidden = true; }
  function showToast(name) {
    clearTimeout(toastT);
    toast.innerHTML = "";
    var p = document.createElement("p"); p.textContent = "Sound is off. Turn it on to hear the " + (NAMES[name] || "room") + ".";
    var b = document.createElement("button"); b.className = "btn btn--small btn--red"; b.type = "button"; b.textContent = "Turn sound on";
    b.addEventListener("click", function () { S.enableSound(true); hideToast(); S.voice(name); });
    toast.append(p, b); toast.hidden = false;
    toastT = setTimeout(hideToast, 8000);
  }
  function hideToast() { toast.hidden = true; }

  /* play an instrument: visual in the room (if running) + voice */
  function play(name) {
    var played = S && S.voice ? S.voice(name) : false;
    if (S && !played && !S.soundOn) showToast(name);
  }
  $$(".play").forEach(function (b) {
    b.addEventListener("click", function () {
      var n = b.getAttribute("data-play");
      b.classList.remove("is-hit"); void b.offsetWidth; b.classList.add("is-hit");
      if (MMC.world && MMC.world.trigger) MMC.world.trigger(n); else play(n);
    });
  });

  /* ---------------- menu ---------------- */
  var btnMenu = $("#btn-menu"), menu = $("#menu");
  function setMenu(open) { btnMenu.setAttribute("aria-expanded", String(open)); menu.hidden = !open; }
  btnMenu.addEventListener("click", function () { setMenu(menu.hidden); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) { setMenu(false); btnMenu.focus(); } });
  document.addEventListener("click", function (e) { if (!menu.hidden && !e.target.closest("#menu, #btn-menu")) setMenu(false); });

  /* ---------------- anchor navigation (+ Lenis), history, focus ---------------- */
  function offset() { return phone.matches ? 60 : 76; }
  function goTo(id, push) {
    var el = document.getElementById(id); if (!el) return;
    var top = id === "intro" ? 0 : el.getBoundingClientRect().top + scrollY - offset();
    var instant = reduce.matches;
    if (MMC.lenis) MMC.lenis.scrollTo(top, { immediate: instant, duration: 1.6 });
    else window.scrollTo({ top: top, behavior: instant ? "auto" : "smooth" });
    if (push) history.pushState(null, "", "#" + id);
    var f = el.matches("[tabindex]") ? el : el.querySelector("h1[tabindex], h2[tabindex]");
    if (f) f.focus({ preventScroll: true });
  }
  MMC.goTo = goTo;
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]'); if (!a) return;
    var id = a.getAttribute("href").slice(1);
    if (!id || !document.getElementById(id)) return;
    e.preventDefault(); setMenu(false); goTo(id, true);
  });
  window.addEventListener("popstate", function () { goTo(location.hash.slice(1) || "intro", false); });
  window.addEventListener("load", function () { if (location.hash.length > 1) setTimeout(function () { goTo(location.hash.slice(1), false); }, 200); });

  /* ---------------- dock: active chapter + progress ---------------- */
  var dockLinks = $$(".dock a"), chapters = $$("[data-chapter]");
  function updateDock() {
    var mid = innerHeight * 0.5, active = 0;
    chapters.forEach(function (c, i) {
      var r = c.getBoundingClientRect();
      if (r.top <= mid) active = i;
      var p = Math.min(1, Math.max(0, (mid - r.top) / Math.max(1, r.height)));
      dockLinks[i] && dockLinks[i].style.setProperty("--prog", p.toFixed(3));
    });
    dockLinks.forEach(function (l, i) { l.setAttribute("aria-current", String(i === active)); });
  }
  var ticking = false;
  window.addEventListener("scroll", function () { if (ticking) return; ticking = true; requestAnimationFrame(function () { updateDock(); ticking = false; }); }, { passive: true });
  window.addEventListener("resize", updateDock); updateDock();

  /* ---------------- committee → tuner ---------------- */
  var depts = $$(".dept");
  function tune(d) {
    depts.forEach(function (x) { x.classList.toggle("is-tuned", x === d); });
    if (MMC.world && MMC.world.setTuner) MMC.world.setTuner(d.getAttribute("data-tune"), 0);
  }
  depts.forEach(function (d) {
    d.addEventListener("pointerenter", function () { tune(d); });
    d.addEventListener("focusin", function () { tune(d); });
    d.tabIndex = 0;
  });
  if ("IntersectionObserver" in window) {
    var dio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) tune(e.target); }); }, { rootMargin: "-45% 0px -45% 0px" });
    depts.forEach(function (d) { dio.observe(d); });
  }

  /* ---------------- archive: filters + contact sheet + lightbox ---------------- */
  var sheet = $("#sheet"), cur = 0, list = PHOTOS.slice(), opener = null;
  PHOTOS.forEach(function (ph, i) {
    var li = document.createElement("li"); li.dataset.cat = ph.cat;
    var b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-label", "Open photo: " + ph.alt);
    var src = "assets/images/gallery/take-" + String(ph.take).padStart(2, "0") + "-800.webp";
    b.innerHTML = '<img loading="lazy" decoding="async" width="800" height="' + (ph.h || 508) + '" alt="" src="' + src + '">';
    b.addEventListener("click", function () { opener = b; openLB(i); });
    li.appendChild(b); sheet.appendChild(li);
  });
  ["all", "stage", "backstage", "sessions", "community"].forEach(function (c) {
    var n = c === "all" ? PHOTOS.length : PHOTOS.filter(function (p) { return p.cat === c; }).length;
    var el = $('[data-count="' + c + '"]'); if (el) el.textContent = n;
  });
  function filter(cat) {
    $$(".filter").forEach(function (f) { f.setAttribute("aria-pressed", String(f.dataset.cat === cat)); });
    var shown = 0;
    $$("li", sheet).forEach(function (li) { var on = cat === "all" || li.dataset.cat === cat; li.hidden = !on; if (on) shown++; });
    $("#sheet-count").textContent = shown + (shown === 1 ? " photo" : " photos");
    $("#sheet-empty").hidden = shown > 0;
    $("#filter-desc").textContent = CAT_DESC[cat];
    list = PHOTOS.filter(function (p) { return cat === "all" || p.cat === cat; });
    if (MMC.world && MMC.world.filterArchive) MMC.world.filterArchive(cat);
  }
  $$(".filter").forEach(function (f) { f.addEventListener("click", function () { filter(f.dataset.cat); }); });
  filter("all");

  var dlg = $("#lightbox"), lbImg = $("#lb-img"), lbCap = $("#lb-cap"), lbNo = $("#lb-no");
  function showLB(i) {
    var arr = list.length ? list : PHOTOS;
    cur = (i + arr.length) % arr.length;
    var ph = arr[cur];
    lbImg.src = "assets/images/gallery/take-" + String(ph.take).padStart(2, "0") + "-1600.webp";
    lbImg.alt = ph.alt; lbCap.textContent = ph.alt;
    lbNo.textContent = "Photo " + String(cur + 1).padStart(2, "0") + " / " + arr.length;
  }
  function openLB(globalIndex) {
    var ph = PHOTOS[globalIndex]; var idx = list.indexOf(ph); if (idx < 0) { list = PHOTOS.slice(); idx = globalIndex; }
    showLB(idx);
    if (typeof dlg.showModal === "function") { dlg.showModal(); $("#lb-next").focus(); }
  }
  MMC.openPhoto = openLB;
  $("#open-archive").addEventListener("click", function (e) { opener = e.currentTarget; openLB(PHOTOS.indexOf(list[0] || PHOTOS[0])); });
  $("#lb-prev").addEventListener("click", function () { showLB(cur - 1); });
  $("#lb-next").addEventListener("click", function () { showLB(cur + 1); });
  $("#lb-close").addEventListener("click", function () { dlg.close(); });
  dlg.addEventListener("close", function () { if (opener) opener.focus(); });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener("keydown", function (e) { if (e.key === "ArrowRight") showLB(cur + 1); if (e.key === "ArrowLeft") showLB(cur - 1); });
  var sx = null;
  lbImg.addEventListener("pointerdown", function (e) { sx = e.clientX; });
  lbImg.addEventListener("pointerup", function (e) { if (sx === null) return; var dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) showLB(cur + (dx < 0 ? 1 : -1)); });

  /* ---------------- 3D world hooks ---------------- */
  var loader = $("#loader");
  function wire() {
    var W = MMC.world;
    W.on("instrument", function (name) { play(name); });
    W.on("footswitch", function (i) { if (PEDAL_TO_SECTION[i]) goTo(PEDAL_TO_SECTION[i], true); });
    W.on("photo", function (i) { opener = null; openLB(i); });
    setTimeout(function () { loader.classList.add("is-done"); }, 1400);
  }
  if (MMC.world && MMC.world.ready) wire();
  else MMC.onWorldReady = wire;
  // If WebGL never starts, hide the loader after a while.
  setTimeout(function () { if (!(MMC.world && MMC.world.ready)) loader.classList.add("is-done"); }, 15000);

  /* ---------------- developer note ---------------- */
  var todos = $$("[data-todo]");
  if (todos.length) console.info("[MMC] " + todos.length + " item(s) still marked data-todo (search the HTML for TODO(MMC)):", todos.map(function (t) { return t.getAttribute("data-todo"); }));
})();
