/* =====================================================================
   MMC v3 — world.js  (entry module)
   One persistent WebGL rehearsal room behind the whole page.

   • Camera shots are anchored to DOM elements with [data-shot]. The
     camera holds on a shot while its copy is being read and travels
     between shots as you scroll. Normal scrolling, no pinning.
   • Each shot carries a lighting/effect state and the pedal it engages.
   • Instruments, footswitches and archive prints are clickable; every
     action also has an HTML control (see main.js), so nothing needs WebGL.
   ===================================================================== */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { AfterimagePass } from "three/addons/postprocessing/AfterimagePass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

import { buildMaterials, mat, disposables } from "./materials.js";
import { guitar, guitarStand, ampHead, cab412, bassCombo, micStand, floorMonitor, synth, mixer, stool, cable, jackPlug } from "./gear.js";
import { drumKit } from "./drums.js";
import { pedalboard, storyPedal } from "./pedals.js";
import { buildRoom, posterWall, flyerWall, setlistSheet, archiveField } from "./room.js";

const MMC = (window.MMC = window.MMC || {});
const html = document.documentElement;
const canvas = document.getElementById("stage");
const listeners = {};
const emit = (ev, d) => (listeners[ev] || []).forEach((f) => f(d));

/* ------------------------------------------------------------------
   Shots: camera position, look target, and room state.
   state: work (fluorescents), show (stage lights + haze), archive (dark
   reverb space), bloom, fuzz, split (chorus), echo (feedback trails)
   ------------------------------------------------------------------ */
const BOARD = new THREE.Vector3(-0.35, 0, 1.45);
const SHOTS = {
  hero:      { pos: [1.45, 0.72, 2.9], look: [-0.7, 0.55, -0.8], fov: 46, state: { work: 0.55, show: 0.55, fuzz: 0.0 }, pedal: -1 },
  fuzz:      { pos: [-0.38, 0.42, 2.02], look: [-0.7, 0.04, 1.47], fov: 30, state: { work: 0.4, show: 0.5, fuzz: 0.55, bloom: 0.9 }, pedal: 0 },
  chorus:    { pos: [-0.05, 0.36, 1.98], look: [-0.62, 0.05, 1.5], fov: 30, state: { work: 0.5, show: 0.45, split: 1 }, pedal: 1 },
  "inst-vocals": { pos: [0.3, 1.42, 2.25], look: [-0.2, 1.3, 1.25], fov: 30, state: { work: 0.35, show: 0.7 }, pedal: 1 },
  "inst-strings": { pos: [-0.35, 0.85, 2.85], look: [-1.3, 0.5, 1.4], fov: 36, state: { work: 0.55, show: 0.5 }, pedal: 1 },
  "inst-rhythm": { pos: [1.55, 1.25, 0.15], look: [0.45, 0.7, -1.85], fov: 36, state: { work: 0.45, show: 0.8 }, pedal: 1 },
  "inst-melody": { pos: [1.15, 1.35, 0.6], look: [2.6, 0.85, -0.5], fov: 34, state: { work: 0.6, show: 0.4 }, pedal: 1 },
  "inst-creation": { pos: [1.75, 1.3, 1.85], look: [2.75, 0.62, 1.25], fov: 36, state: { work: 0.6, show: 0.35 }, pedal: 1 },
  "inst-stage": { pos: [0.6, 1.15, 3.05], look: [-0.25, 0.75, -1.4], fov: 46, state: { work: 0.2, show: 1 }, pedal: 1 },
  echo:      { pos: [0.9, 1.4, 2.45], look: [3.6, 1.38, 0.7], fov: 40, state: { work: 0.75, show: 0.3, echo: 0.8 }, pedal: 2 },
  setlist:   { pos: [0.75, 0.75, 1.35], look: [0.5, 0.25, 0.55], fov: 32, state: { work: 0.6, show: 0.4 }, pedal: 2 },
  "loop-idea":   { pos: [-0.78, 0.5, 2.25], look: [-1.05, 0.55, 1.5], fov: 30, state: { work: 1, show: 0 }, pedal: 3 },
  "loop-practice": { pos: [-0.1, 0.35, 2.15], look: [-0.4, 0.05, 1.45], fov: 32, state: { work: 0.9, show: 0.1 }, pedal: 3 },
  "loop-production": { pos: [-0.6, 0.9, -0.9], look: [-1.75, 0.8, -2.7], fov: 38, state: { work: 0.7, show: 0.3 }, pedal: 3 },
  "loop-moment": { pos: [2.2, 1.65, 2.75], look: [-0.2, 0.7, -1.2], fov: 44, state: { work: 0, show: 1.15, bloom: 1.4 }, pedal: 3 },
  tuner:     { pos: [-0.12, 1.25, 1.62], look: [-0.23, 0.0, 1.43], fov: 28, state: { work: 0.5, show: 0.35 }, pedal: 4 },
  archive:   { pos: [0.0, 1.35, 3.0], look: [0.0, 1.3, 1.6], fov: 50, state: { work: 0, show: 0.1, archive: 1 }, pedal: 5 },
  "archive-deep": { pos: [0.05, 1.32, 0.35], look: [0.15, 1.25, -1.6], fov: 52, state: { work: 0, show: 0.1, archive: 1 }, pedal: 5 },
  spotlight: { pos: [1.15, 0.42, 1.72], look: [0.6, 0.06, 1.1], fov: 30, state: { work: 0.1, show: 0.7, archive: 0 }, pedal: 5 },
  boost:     { pos: [0.18, 0.4, 2.0], look: [-0.05, 0.04, 1.48], fov: 30, state: { work: 0.45, show: 0.7, bloom: 1.2 }, pedal: 6 },
  slot:      { pos: [0.4, 0.95, 2.35], look: [0.04, 0.05, 1.5], fov: 34, state: { work: 0.5, show: 0.85, bloom: 1.2 }, pedal: 7 },
  outro:     { pos: [2.6, 2.35, 3.0], look: [-0.5, 0.2, -0.6], fov: 50, state: { work: 0.35, show: 0.9 }, pedal: 7 },
};
const DEFAULT_STATE = { work: 0.5, show: 0.5, archive: 0, bloom: 1, fuzz: 0, split: 0, echo: 0 };

/* ------------------------------------------------------------------ */
function webgl2() { try { return !!document.createElement("canvas").getContext("webgl2"); } catch (e) { return false; } }
function pickTier() {
  const q = new URLSearchParams(location.search).get("q");
  if (q === "low" || q === "mid" || q === "high") return q;
  const coarse = matchMedia("(pointer: coarse)").matches, small = matchMedia("(max-width: 820px)").matches;
  if (coarse || small) return "low";
  if (navigator.deviceMemory && navigator.deviceMemory <= 4) return "mid";
  return "high";
}

if (canvas && webgl2()) {
  start().catch((err) => { console.warn("[MMC] 3D world disabled:", err); html.classList.remove("webgl"); html.classList.add("no-webgl"); });
} else {
  html.classList.add("no-webgl");
}

async function start() {
  const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");
  let tier = pickTier();
  const loaderEl = document.getElementById("loader");
  const setLoad = (p, msg) => { if (!loaderEl) return; loaderEl.style.setProperty("--p", p); const t = loaderEl.querySelector("[data-msg]"); if (t && msg) t.textContent = msg; };
  setLoad(0.05, "Plugging in");

  // Fonts used inside canvas textures must be ready before we draw labels.
  try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]); } catch (e) {}

  /* ---------- renderer ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", alpha: false });
  renderer.info.autoReset = false;
  const dprCap = { high: 1.75, mid: 1.25, low: 1.25 }[tier];
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = tier !== "low";
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  RectAreaLightUniformsLib.init();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070707);
  scene.fog = new THREE.FogExp2(0x070707, 0.06);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.3;

  const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.03, 40);

  buildMaterials();
  setLoad(0.15, "Building the room");

  /* ---------- the room ---------- */
  const room = buildRoom(tier);
  scene.add(room.group);

  const photos = [
    { src: "assets/images/gallery/take-04-800.webp", w: 800, h: 508, cat: "stage" },
    { src: "assets/images/gallery/take-10-800.webp", w: 800, h: 449, cat: "stage" },
    { src: "assets/images/gallery/take-01-800.webp", w: 800, h: 508, cat: "stage" },
    { src: "assets/images/gallery/take-08-800.webp", w: 800, h: 508, cat: "community" },
    { src: "assets/images/gallery/take-03-800.webp", w: 800, h: 508, cat: "stage" },
    { src: "assets/images/gallery/take-06-800.webp", w: 800, h: 508, cat: "stage" },
    { src: "assets/images/gallery/take-02-800.webp", w: 800, h: 508, cat: "community" },
    { src: "assets/images/gallery/take-05-800.webp", w: 800, h: 508, cat: "stage" },
    { src: "assets/images/gallery/take-11-800.webp", w: 800, h: 449, cat: "stage" },
    { src: "assets/images/gallery/take-07-800.webp", w: 800, h: 508, cat: "stage" },
    { src: "assets/images/gallery/take-09-800.webp", w: 800, h: 508, cat: "stage" },
  ];
  const posters = posterWall(photos.slice(0, 7).map((p) => p.src));
  scene.add(posters.group);
  const flyers = flyerWall([
    { title: "LIVE PERFORMANCES", tag: "The stage is yours." },
    { title: "OPEN MIC", tag: "One mic. Endless possibilities." },
    { title: "WORKSHOPS", tag: "Learn it. Play it. Own it." },
    { title: "JAM SESSIONS", tag: "Find the groove." },
    { title: "RECORDING", tag: "From an idea to a sound." },
    { title: "COMMUNITY", tag: "Good music. Better connections." },
  ]);
  scene.add(flyers.group);
  const archive = archiveField(photos);
  scene.add(archive.group);

  /* ---------- gear placement ---------- */
  const place = (o, x, y, z, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; scene.add(o); o.updateMatrixWorld(true); return o; };

  const board = place(pedalboard(), BOARD.x, 0, BOARD.z, 0);
  const pedals = board.userData.pedals;

  const elec = guitar({ finish: mat.redLacquer });
  const elecStand = place(guitarStand(), -1.05, 0, 1.55, 0.45);
  elec.position.set(-1.05, 0.33, 1.53); elec.rotation.set(-0.17, 0.45, 0); scene.add(elec); elec.updateMatrixWorld(true);

  const bass = guitar({ bass: true, finish: mat.blackLacquer, guardMat: mat.boneLacquer });
  place(guitarStand(), -2.45, 0, -0.35, 0.6);
  bass.position.set(-2.45, 0.36, -0.37); bass.rotation.set(-0.17, 0.6, 0); scene.add(bass); bass.updateMatrixWorld(true);

  const cab = place(cab412(), -1.75, 0, -2.75, 0);
  const head = place(ampHead(), -1.75, 0.045 + 0.76 + 0.002, -2.78, 0);
  const combo = place(bassCombo(), -2.95, 0, -1.3, 0.75);
  const kit = place(drumKit(), 0.55, 0.012, -1.85, 0);
  place(stool(0.55), 0.55, 0.012, -2.62, 0);
  const keys = place(synth(), 2.6, 0, -0.55, -Math.PI / 2 + 0.3);
  const desk = place(mixer(), 2.78, 0, 1.25, -Math.PI / 2);
  place(stool(0.62), 2.35, 0, 2.25, 0.4);
  const deskLight = new THREE.PointLight(0xfff0dc, 0.55, 1.8, 1.5); deskLight.position.set(2.45, 1.35, 1.0); scene.add(deskLight);
  const mic = place(micStand(1.42, 0.62), -0.25, 0, 0.92, 0.12);
  const monitor = place(floorMonitor(), 0.25, 0, 0.32, -0.08);
  const story = place(storyPedal(), 0.62, 0, 1.12, -0.5);

  // setlist taped to the monitor's slanted face
  const sheet = setlistSheet(["THE STAGE IS QUIET.", "FOR NOW.", "", "— watch this space —"]);
  sheet.position.set(0, 0.24, 0.07); sheet.rotation.x = -monitor.userData.faceAngle; sheet.rotation.z = 0.05;
  sheet.translateZ(0.012); monitor.add(sheet);

  /* ---------- cables across the floor ---------- */
  const W = (o, v) => v.clone().applyMatrix4(o.matrixWorld);
  const pIn = W(pedals[6], pedals[6].userData.jackIn);
  const pOut = W(pedals[0], pedals[0].userData.jackOut);
  const gJack = W(elec, elec.userData.parts.jack);
  scene.add(cable([gJack, gJack.clone().add(new THREE.Vector3(0.1, -0.15, 0.05)), new THREE.Vector3(-0.8, 0.012, 1.95), new THREE.Vector3(0.1, 0.012, 1.98), new THREE.Vector3(0.38, 0.012, 1.8), pIn.clone().add(new THREE.Vector3(0.08, -0.03, 0.02)), pIn], 0.0038));
  const ampIn = W(head, head.userData.input);
  const ampCable = cable([pOut, pOut.clone().add(new THREE.Vector3(-0.08, -0.03, 0)), new THREE.Vector3(-1.0, 0.012, 1.15), new THREE.Vector3(-1.45, 0.012, 0.2), new THREE.Vector3(-1.3, 0.012, -0.9), new THREE.Vector3(-1.95, 0.012, -2.2), new THREE.Vector3(-2.2, 0.3, -2.45), new THREE.Vector3(-2.15, 0.85, -2.6), ampIn.clone().add(new THREE.Vector3(-0.05, 0.02, 0.06)), ampIn], 0.0042, mat.cableRed, 220);
  scene.add(ampCable);
  const micBase = new THREE.Vector3(-0.25, 0.012, 0.92);
  scene.add(cable([micBase.clone().add(new THREE.Vector3(0, 1.0, 0)), micBase.clone().add(new THREE.Vector3(0.02, 0.4, 0.01)), micBase.clone().add(new THREE.Vector3(0.12, 0.0, 0.05)), new THREE.Vector3(0.8, 0.012, 0.95), new THREE.Vector3(1.7, 0.012, 1.2), new THREE.Vector3(2.4, 0.012, 1.05), new THREE.Vector3(2.55, 0.6, 1.05)], 0.0045, mat.cable, 160));
  scene.add(cable([new THREE.Vector3(-0.9, 0.012, 0.4), new THREE.Vector3(-0.6, 0.012, 0.9), new THREE.Vector3(-0.2, 0.012, 1.15), new THREE.Vector3(BOARD.x + 0.12, 0.08, BOARD.z - 0.21)], 0.003));
  for (let i = 0; i < 3; i++) scene.add(cable([new THREE.Vector3(-0.9 - i * 0.05, 0.012, 0.38), new THREE.Vector3(-1.6 + i * 0.3, 0.012, -0.6 - i * 0.4), new THREE.Vector3([-1.75, 0.5, -2.9][i], 0.012, [-2.4, -1.6, -1.2][i])], 0.003));

  setLoad(0.45, "Wiring the board");

  /* ---------- lights ---------- */
  scene.add(new THREE.AmbientLight(0xffffff, 0.04));
  const rects = room.fixtures.map((f) => { const r = new THREE.RectAreaLight(0xe9f0ff, 0, 1.2, 0.14); r.position.copy(f.position).add(new THREE.Vector3(0, -0.06, 0)); r.lookAt(f.position.x, 0, f.position.z); scene.add(r); return r; });

  const key = new THREE.SpotLight(0xffe2c2, 0, 9, 0.42, 0.7, 1.4);
  key.position.set(1.0, 2.55, 2.7); key.target.position.set(-0.4, 0.2, 1.2); scene.add(key, key.target);
  const drumSpot = new THREE.SpotLight(0xffae62, 0, 8, 0.5, 0.75, 1.4);
  drumSpot.position.copy(room.pars[1].can.position); drumSpot.target.position.set(0.55, 0.6, -1.85); scene.add(drumSpot, drumSpot.target);
  const redRim = new THREE.SpotLight(0xff1a22, 0, 10, 0.7, 0.85, 1.3);
  redRim.position.set(-2.6, 2.55, -2.4); redRim.target.position.set(-0.3, 0.3, 1.0); scene.add(redRim, redRim.target);
  const redWash = new THREE.SpotLight(0xff1a22, 0, 8, 0.55, 0.9, 1.4);
  redWash.position.copy(room.pars[0].can.position); redWash.target.position.set(-0.4, 0, 1.0); scene.add(redWash, redWash.target);
  const ampGlow = new THREE.PointLight(0xff2a2a, 0, 2.2, 1.6); ampGlow.position.set(-1.75, 0.3, -2.2); scene.add(ampGlow);
  const archiveLight = new THREE.PointLight(0xfff1e0, 0, 6, 1.4); scene.add(archiveLight);

  if (renderer.shadowMap.enabled) {
    key.castShadow = true; key.shadow.mapSize.set(tier === "high" ? 2048 : 1024, tier === "high" ? 2048 : 1024); key.shadow.bias = -0.00015; key.shadow.normalBias = 0.01;
    if (tier === "high") { drumSpot.castShadow = true; drumSpot.shadow.mapSize.set(1024, 1024); drumSpot.shadow.bias = -0.0002; }
  }

  /* ---------- interactive roots: merge inside each, then tag for picking ---------- */
  setLoad(0.6, "Tightening the bolts");
  const kp0 = kit.userData.parts;
  const interactive = [
    [elec, "guitar", "Strum the guitar"], [bass, "bass", "Pluck the bass"],
    [kp0.kick, "kick", "Hit the kick"], [kp0.snare, "snare", "Hit the snare"], [kp0.tom, "tom", "Hit the tom"], [kp0.floor, "floor", "Hit the floor tom"],
    [kp0.hat, "hat", "Tap the hi-hat"], [kp0.crash, "crash", "Crash"], [kp0.ride, "ride", "Ride"],
    [keys, "keys", "Play a chord"], [mic, "mic", "Check the mic"], [desk, "desk", "Push the faders"],
    ...pedals.map((p, k) => [p, "pedal-" + k, "Step on " + p.userData.spec.name]),
  ];
  const targets = [];
  const allGeos = [];
  let mergedCount = 0;
  interactive.forEach(([root, name, label]) => {
    const r = mergeStatic(root, [], true); allGeos.push(...r.geos); mergedCount += r.count;
    root.traverse((m) => { if (m.isMesh) { m.userData.hit = { name, label }; targets.push(m); } });
  });
  archive.items.forEach((it) => it.traverse((m) => { if (m.isMesh) { m.userData.hit = { name: "photo-" + it.userData.index, label: "Open this photo" }; targets.push(m); } }));
  /* ---------- merge everything else that never moves ---------- */
  const merged = mergeStatic(scene, [archive.group, ...interactive.map((x) => x[0])]);
  merged.count += mergedCount;
  disposables.push(...merged.geos, ...allGeos);

  /* ---------- post-processing ---------- */
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: tier === "high" ? 4 : 0 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.5, 1.35);
  composer.addPass(bloom);
  const after = new AfterimagePass(0.0); after.enabled = false;
  if (tier !== "low") composer.addPass(after);
  const finalPass = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: 0.06 }, uVignette: { value: 0.9 }, uSplit: { value: 0 }, uFuzz: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float uTime, uGrain, uVignette, uSplit, uFuzz; uniform vec2 uRes; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uTime) * 43758.5453); }
      void main(){
        vec2 c = vUv - 0.5;
        vec2 o = c * (uSplit * 6.0 / uRes.x) + vec2(uSplit * 2.0 / uRes.x, 0.0);
        vec3 col = vec3(texture2D(tDiffuse, vUv + o).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - o).b);
        // FUZZ: photocopy halftone + hard clip
        float l = dot(col, vec3(0.299, 0.587, 0.114));
        vec2 cell = mod(gl_FragCoord.xy, 5.0) - 2.5;
        float dotm = step(length(cell), 2.6 * sqrt(clamp(l * 1.6, 0.0, 1.0)));
        vec3 fz = mix(col * 0.35, min(col * 1.8, vec3(1.0)), dotm);
        col = mix(col, fz, uFuzz * 0.55);
        col += (hash(vUv * uRes) - 0.5) * uGrain;
        col *= 1.0 - uVignette * dot(c, c) * 1.25;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  composer.addPass(finalPass);
  composer.addPass(new OutputPass());

  /* ---------- camera rig driven by DOM anchors ---------- */
  let anchors = [];
  function readAnchors() {
    const vh = innerHeight;
    anchors = Array.from(document.querySelectorAll("[data-shot]")).map((el) => {
      const r = el.getBoundingClientRect();
      const name = el.getAttribute("data-shot");
      return { name, y: r.top + scrollY - vh * 0.5 + Math.min(r.height, vh) * 0.25, shot: SHOTS[name] };
    }).filter((a) => a.shot).sort((a, b) => a.y - b.y);
  }
  readAnchors();
  const ro = new ResizeObserver(() => readAnchors()); ro.observe(document.body);
  window.addEventListener("load", readAnchors);
  MMC.refreshShots = readAnchors;

  const cur = { pos: new THREE.Vector3(...SHOTS.hero.pos), look: new THREE.Vector3(...SHOTS.hero.look), fov: SHOTS.hero.fov, state: { ...DEFAULT_STATE, ...SHOTS.hero.state } };
  const tgt = { pos: cur.pos.clone(), look: cur.look.clone(), fov: cur.fov, state: { ...cur.state } };
  let activePedal = -1, currentShot = "hero";
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  const forced = new URLSearchParams(location.search).get("shot");
  const snap = forced || new URLSearchParams(location.search).has("snap");
  function resolveTarget() {
    if (forced && SHOTS[forced]) { const f = framing(SHOTS[forced]); tgt.pos.copy(f.pos); tgt.look.copy(f.look); tgt.fov = f.fov; Object.assign(tgt.state, DEFAULT_STATE, SHOTS[forced].state); if (SHOTS[forced].pedal !== activePedal) setPedal(SHOTS[forced].pedal); return; }
    if (!anchors.length) return;
    const s = scrollY;
    let i = 0;
    while (i < anchors.length - 1 && anchors[i + 1].y <= s) i++;
    const A = anchors[i], B = anchors[Math.min(i + 1, anchors.length - 1)];
    let t = 0;
    if (B !== A && s > A.y) t = sstep(0.18, 0.82, (s - A.y) / (B.y - A.y));
    if (s < anchors[0].y) t = 0;
    const sa = A.shot, sb = B.shot;
    const pa = framing(sa), pb = framing(sb);
    tgt.pos.lerpVectors(pa.pos, pb.pos, t);
    tgt.look.lerpVectors(pa.look, pb.look, t);
    tgt.fov = THREE.MathUtils.lerp(pa.fov, pb.fov, t);
    for (const k in DEFAULT_STATE) {
      const va = sa.state[k] ?? DEFAULT_STATE[k], vb = sb.state[k] ?? DEFAULT_STATE[k];
      tgt.state[k] = THREE.MathUtils.lerp(va, vb, t);
    }
    const near = t < 0.5 ? A : B;
    if (near.shot.pedal !== activePedal) setPedal(near.shot.pedal);
    if (near.name !== currentShot) { currentShot = near.name; emit("shot", currentShot); }
  }
  // Portrait screens: pull back along the view ray and widen the lens.
  function framing(shot) {
    const aspect = innerWidth / innerHeight;
    const pos = tmpA.set(...shot.pos).clone(), look = tmpB.set(...shot.look).clone();
    let fov = shot.fov;
    if (aspect < 1) {
      const dir = pos.clone().sub(look);
      pos.copy(look).add(dir.multiplyScalar(1 + (1 - aspect) * 0.55));
      fov = Math.min(68, fov * (1 + (1 - aspect) * 0.6));
    }
    return { pos, look, fov };
  }

  /* ---------- pedals: LEDs, footswitch press, tuner, looper ---------- */
  function setPedal(i) {
    activePedal = i;
    pedals.forEach((p, k) => {
      const on = k === i || (i === 7 && k === 6);
      gsapTo(p.userData.led.material, { emissiveIntensity: on ? 6 : 0.0 }, 0.25);
      if (on && p.userData.switches[0]) pressSwitch(p.userData.switches[0]);
    });
    emit("pedal", i);
  }
  function pressSwitch(cap) {
    if (reduceMQ.matches || !window.gsap) return;
    gsap.fromTo(cap.position, { y: 0.0095 }, { y: 0.0065, duration: 0.07, yoyo: true, repeat: 1, ease: "power2.in" });
  }
  function gsapTo(obj, vars, d) { if (window.gsap && !reduceMQ.matches) gsap.to(obj, { ...vars, duration: d, overwrite: true }); else Object.assign(obj, vars); }
  const tunerPedal = pedals[4];
  MMC.world = MMC.world || {};

  /* ---------- interactions: raycast instruments, switches, prints ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const hint = document.getElementById("hint");
  let hover = null;
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const vis = targets.filter((m) => m.visible && isVisible(m));
    const hit = ray.intersectObjects(vis, false)[0];
    return hit && hit.distance < 6 ? hit.object.userData.hit : null;
  }
  function isVisible(m) { let o = m; while (o) { if (!o.visible) return false; o = o.parent; } return true; }
  // Pointer events land on the page; we pick only where no interactive HTML is under the cursor.
  const passThrough = (e) => !e.target.closest("a, button, input, label, select, textarea, summary, dialog, .panel, .dock, .topbar, .menu, .toast, .foot, .intro, .ticker");
  window.addEventListener("pointermove", (e) => {
    ptr.tx = (e.clientX / innerWidth) * 2 - 1; ptr.ty = (e.clientY / innerHeight) * 2 - 1;
    if (e.pointerType !== "mouse" || !passThrough(e)) { setHover(null); return; }
    setHover(pick(e), e);
  }, { passive: true });
  window.addEventListener("click", (e) => { if (!passThrough(e)) return; const h = pick(e); if (h) { trigger(h.name); } });
  function setHover(h, e) {
    hover = h;
    document.body.style.cursor = h ? "pointer" : "";
    if (!hint) return;
    if (h) { hint.textContent = h.label; hint.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 14}px)`; hint.hidden = false; }
    else hint.hidden = true;
  }

  /* hit reactions */
  const vib = [];
  function strum(inst, count) { inst.userData.parts.strings.forEach((s, i) => vib.push({ s, t0: performance.now() + i * 18, amp: 0.0016 + Math.random() * 0.0008 })); }
  function bounce(obj, amt = 0.04) { if (!window.gsap || reduceMQ.matches) return; gsap.fromTo(obj.scale, { x: 1 + amt * 0.3, y: 1 - amt, z: 1 + amt * 0.3 }, { x: 1, y: 1, z: 1, duration: 0.5, ease: "elastic.out(1.2,0.35)" }); }
  function wobble(obj) { if (!window.gsap || reduceMQ.matches) return; const base = obj.userData.baseRot || (obj.userData.baseRot = obj.rotation.clone()); gsap.fromTo(obj.rotation, { x: base.x + 0.12 }, { x: base.x, duration: 1.4, ease: "elastic.out(1,0.18)" }); }
  const keyMats = keys.userData.parts;
  function pressKeys(notes) {
    const m4 = new THREE.Matrix4(), pos = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    notes.forEach((n) => { const k = keyMats.keyMap[n]; if (!k) return; const im = k.black ? keyMats.blacks : keyMats.whites; im.getMatrixAt(k.i, m4); m4.decompose(pos, q, sc); const y0 = pos.y; pos.y = y0 - 0.006; m4.compose(pos, q, sc); im.setMatrixAt(k.i, m4); im.instanceMatrix.needsUpdate = true; setTimeout(() => { pos.y = y0; m4.compose(pos, q, sc); im.setMatrixAt(k.i, m4); im.instanceMatrix.needsUpdate = true; }, 380); });
  }
  function trigger(name) {
    const S = MMC.signal;
    if (name.startsWith("pedal-")) { const i = +name.slice(6); emit("footswitch", i); pressSwitch(pedals[i].userData.switches[0]); return; }
    if (name.startsWith("photo-")) { emit("photo", +name.slice(6)); return; }
    const kp = kit.userData.parts;
    switch (name) {
      case "guitar": strum(elec); break;
      case "bass": strum(bass); break;
      case "kick": bounce(kp.kick, 0.03); if (window.gsap) gsap.fromTo(kp.beater.rotation, { x: 0.25 }, { x: -0.35, duration: 0.3, ease: "power2.out" }); break;
      case "snare": bounce(kp.snare); break;
      case "tom": bounce(kp.tom); break;
      case "floor": bounce(kp.floor); break;
      case "hat": case "crash": case "ride": wobble(kp[name]); break;
      case "keys": pressKeys([12, 16, 19, 24]); break;
      case "mic": bounce(mic.userData.boom, 0.01); break;
      case "desk": break;
    }
    if (S && S.bump) S.bump(0.9);
    emit("instrument", name);
  }
  MMC.world.trigger = trigger;

  /* ---------- tuner + archive APIs for main.js ---------- */
  MMC.world.setTuner = (label, cents = 0) => tunerPedal.userData.screen && tunerPedal.userData.screen.draw(label, cents, true);
  let archiveFilter = "all";
  MMC.world.filterArchive = (cat) => { archiveFilter = cat; };
  MMC.world.on = (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); };
  MMC.world.tier = () => tier;

  /* ---------- resize ---------- */
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    finalPass.uniforms.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
    readAnchors();
  }
  resize();
  let rT; window.addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(resize, 120); });

  /* ---------- frame ---------- */
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  const clock = new THREE.Clock();
  let frames = 0, acc = 0, degraded = false;
  const st = cur.state;

  function applyState(dt) {
    const k = dt >= 1 ? 1 : 1 - Math.exp(-dt * 3.2);
    for (const key2 in st) st[key2] += (tgt.state[key2] - st[key2]) * k;
    const S = MMC.signal, beat = S && S.motion ? S.kick : 0, lvl = S && S.motion ? S.level : 0;
    const dim = 1 - st.archive;
    rects.forEach((r, i) => { r.intensity = st.work * 9 * dim * (1 - 0.06 * Math.random() * (st.work < 0.3 ? 1 : 0)); });
    room.tubeMat.emissiveIntensity = 0.15 + st.work * 2.4 * dim;
    key.intensity = (5 + st.show * 22) * dim;
    drumSpot.intensity = st.show * 9 * dim * (1 + beat * 0.25);
    redRim.intensity = (2 + st.show * 26) * dim * (1 + beat * 0.3);
    redWash.intensity = st.show * 16 * dim;
    ampGlow.intensity = (0.4 + st.show * 1.2) * dim;
    room.pars.forEach((p, i) => { p.lens.material.emissiveIntensity = st.show * 6 * dim; p.beam.material.uniforms.uOpacity.value = Math.max(0, st.show - 0.15) * 2.6 * dim * (i === 3 ? 0.5 : 1); });
    scene.environmentIntensity = (0.12 + st.work * 0.28) * dim + 0.03;
    scene.fog.density = 0.05 + st.archive * 0.16;
    archiveLight.intensity = st.archive * 3.5;
    archiveLight.position.copy(camera.position).add(new THREE.Vector3(0, 0.6, -0.4));
    bloom.strength = 0.35 + st.bloom * 0.35 + lvl * 0.15 + st.show * 0.15;
    finalPass.uniforms.uFuzz.value = st.fuzz * (0.6 + beat * 0.6);
    finalPass.uniforms.uSplit.value = st.split * (1.2 + Math.sin(performance.now() / 600) * 0.6);
    finalPass.uniforms.uGrain.value = 0.035 + st.fuzz * 0.05;
    after.enabled = st.echo > 0.05 && tier !== "low";
    after.uniforms.damp.value = Math.min(0.86, st.echo * 0.86);
    renderer.toneMappingExposure = 0.95 + st.show * 0.1;
    // archive field visibility + filter
    archive.group.visible = st.archive > 0.01;
    if (archive.group.visible) archive.items.forEach((it, i) => {
      const match = archiveFilter === "all" || it.userData.cat === archiveFilter;
      const a = st.archive * (match ? 1 : 0.12);
      it.userData.mats.forEach((m) => { m.opacity = a; });
      it.position.y = it.userData.home.y + Math.sin(performance.now() / 1400 + i) * 0.02;
      const isHover = hover && hover.name === "photo-" + i;
      const s = isHover ? 1.08 : 1; it.scale.x += (s - it.scale.x) * 0.15; it.scale.y = it.scale.x;
    });
    // pedal LED breathe on the beat
    if (activePedal >= 0 && pedals[activePedal]) pedals[activePedal].userData.led.material.emissiveIntensity = 4.5 + beat * 3;
    // looper ring
    const ring = pedals[3].userData.ring;
    if (ring) { const pos = Math.floor(performance.now() / 125) % 16; ring.forEach((l, k2) => { l.material.emissiveIntensity = activePedal === 3 ? (k2 === pos ? 6 : k2 < pos ? 1.5 : 0.1) : 0.05; }); }
    // amp pilot
    head.userData.parts.pilot.material.emissiveIntensity = 2 + st.show * 3;
  }

  function frame() {
    const dt = Math.min(0.05, clock.getDelta());
    const now = performance.now();
    resolveTarget();
    const reduce = reduceMQ.matches;
    const k = reduce || snap ? 1 : 1 - Math.exp(-dt * 3.0);
    cur.pos.lerp(tgt.pos, k); cur.look.lerp(tgt.look, k); cur.fov += (tgt.fov - cur.fov) * k;
    ptr.x += (ptr.tx - ptr.x) * 0.05; ptr.y += (ptr.ty - ptr.y) * 0.05;
    camera.position.copy(cur.pos);
    if (!reduce) { camera.position.x += ptr.x * 0.05; camera.position.y -= ptr.y * 0.03; }
    camera.lookAt(cur.look);
    if (Math.abs(camera.fov - cur.fov) > 0.01) { camera.fov = cur.fov; camera.updateProjectionMatrix(); }
    applyState(reduce || snap ? 1 : dt);
    // string vibration
    for (let i = vib.length - 1; i >= 0; i--) {
      const v = vib[i], t = (now - v.t0) / 1000;
      if (t < 0) continue;
      if (t > 1.6) { v.s.position.set(0, 0, 0); vib.splice(i, 1); continue; }
      v.s.position.x = Math.sin(t * 90) * v.amp * Math.exp(-t * 3.2);
    }
    finalPass.uniforms.uTime.value = now / 1000 % 100;
    renderer.info.reset();
    composer.render(dt);
    // adaptive quality: if frames are slow on a capable tier, step down once
    frames++; acc += dt;
    if (!degraded && acc > 3) {
      const avg = acc / frames;
      if (avg > 1 / 28 && tier !== "low") { degraded = true; renderer.setPixelRatio(Math.min(devicePixelRatio, 1)); after.enabled = false; key.shadow.mapSize.set(1024, 1024); resize(); console.info("[MMC] Lowered render quality for smoother motion."); }
      frames = 0; acc = 0;
    }
  }

  setLoad(0.9, "Soundcheck");
  html.classList.add("webgl");
  // Wait one frame of textures before revealing; loader stays non-blocking.
  THREE.DefaultLoadingManager.onLoad = () => setLoad(1, "Ready");
  setTimeout(() => setLoad(1, "Ready"), 6000);

  let running = true;
  function loop() { if (!running) return; frame(); }
  if (reduceMQ.matches) {
    // static: render on scroll/resize only
    const once = () => { frame(); };
    window.addEventListener("scroll", () => requestAnimationFrame(once), { passive: true });
    window.addEventListener("resize", () => requestAnimationFrame(once));
    THREE.DefaultLoadingManager.onLoad = () => { setLoad(1, "Ready"); once(); };
    once(); setTimeout(once, 800); setTimeout(once, 2500);
  } else {
    renderer.setAnimationLoop(loop);
  }
  document.addEventListener("visibilitychange", () => { if (reduceMQ.matches) return; renderer.setAnimationLoop(document.hidden ? null : loop); });

  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); running = false; renderer.setAnimationLoop(null); html.classList.remove("webgl"); html.classList.add("no-webgl"); });
  window.addEventListener("pagehide", () => {
    running = false; renderer.setAnimationLoop(null);
    disposables.forEach((d) => d && d.dispose && d.dispose());
    scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    composer.dispose && composer.dispose(); rt.dispose(); pmrem.dispose(); renderer.dispose();
  });

  MMC.world.ready = true;
  MMC.world.stats = () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures, tier, merged: merged.count });
  emit("ready");
  if (MMC.onWorldReady) MMC.onWorldReady();
}

/* Merge every static, single-material, non-instanced mesh by material. */
function mergeStatic(root, skipRoots, local = false) {
  const buckets = new Map(), remove = [];
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const rel = new THREE.Matrix4();
  const skip = new Set(skipRoots);
  (function walk(o, isRoot) {
    if (!isRoot && (skip.has(o) || o.userData.dynamic || o.isLight)) return;
    if (o.isMesh && !o.isInstancedMesh && !Array.isArray(o.material) && !o.userData.hit && o.geometry.attributes.uv && o.geometry.attributes.normal) {
      let g = o.geometry.clone();
      for (const a of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(a)) g.deleteAttribute(a);
      if (g.index) g = g.toNonIndexed();
      g.applyMatrix4(local ? rel.multiplyMatrices(inv, o.matrixWorld) : o.matrixWorld);
      const key = o.material.uuid + (o.castShadow ? "s" : "");
      if (!buckets.has(key)) buckets.set(key, { mat: o.material, geos: [], cast: o.castShadow });
      buckets.get(key).geos.push(g);
      remove.push(o);
    }
    o.children.slice().forEach((c) => walk(c, false));
  })(root, true);
  const out = { geos: [], count: remove.length };
  remove.forEach((o) => o.parent && o.parent.remove(o));
  buckets.forEach(({ mat: m, geos, cast }) => {
    const g = mergeGeometries(geos, false);
    geos.forEach((x) => x.dispose());
    if (!g) return;
    const mesh = new THREE.Mesh(g, m); mesh.castShadow = cast; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false;
    root.add(mesh); out.geos.push(g);
  });
  return out;
}
