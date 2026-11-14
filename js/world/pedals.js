/* =====================================================================
   MMC v3 — pedals.js
   The MMC pedalboard: seven chapter pedals, a tuner with a live display,
   a looper with an LED ring, power supply, patch cables with plugs, an
   unplugged "STORY" pedal and a gaffer-taped empty slot for the finale.
   ===================================================================== */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mat, tex, canvasTex, noise, pedalFaceTex } from "./materials.js";
import { cable, jackPlug } from "./gear.js";

const cyl = (rt, rb, h, s, m) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, s), m);
const shadow = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };

export const PEDALS = [
  { id: "fuzz",   name: "FUZZ",   sub: "MMC-01 · WHO WE ARE",  knobs: ["EXPRESS", "CONNECT", "EVOLVE", "PERFORM"], bg: "#b3121a", fg: "#f4efe6", accent: "#111111", w: 0.075, d: 0.125 },
  { id: "chorus", name: "CHORUS", sub: "MMC-02 · FIND YOUR SOUND", knobs: ["RATE", "DEPTH", "VOICES"], bg: "#e9e2d2", fg: "#161616", accent: "#b3121a", w: 0.075, d: 0.125 },
  { id: "echo",   name: "ECHO",   sub: "MMC-03 · EXPERIENCE",  knobs: ["TIME", "REPEATS", "MIX"], bg: "#1a191b", fg: "#ece6da", accent: "#ff3a40", w: 0.075, d: 0.125 },
  { id: "looper", name: "LOOPER", sub: "MMC-04 · BEHIND THE SOUND", knobs: ["LOOP", "LEVEL"], bg: "#2a2a2c", fg: "#ece6da", accent: "#ff3a40", w: 0.12, d: 0.14, looper: true },
  { id: "tuner",  name: "TUNER",  sub: "MMC-05 · THE PEOPLE",  knobs: [], bg: "#0f0f10", fg: "#ece6da", accent: "#ff3a40", w: 0.075, d: 0.125, tuner: true },
  { id: "room",   name: "ROOM",   sub: "MMC-06 · THE ARCHIVE", knobs: ["DECAY", "TONE", "SPACE"], bg: "#8f0f14", fg: "#f4efe6", accent: "#111111", w: 0.075, d: 0.125 },
  { id: "boost",  name: "BOOST",  sub: "MMC-07 · JOIN",        knobs: ["LEVEL", "TONE"], bg: "#e31e24", fg: "#111111", accent: "#ffffff", w: 0.062, d: 0.112 },
];

function knob(color = 0x111111) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.38 });
  const skirt = cyl(0.0115, 0.0125, 0.004, 40, m); g.add(skirt);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.0088, 0.0098, 0.012, 24), m); grip.position.y = 0.008; g.add(grip);
  const top = cyl(0.0085, 0.0085, 0.001, 32, mat.nickel); top.position.y = 0.0145; g.add(top);
  const ptr = new THREE.Mesh(new THREE.BoxGeometry(0.0014, 0.0008, 0.0085), mat.plasticCream); ptr.position.set(0, 0.0152, 0.0045); g.add(ptr);
  return g;
}

function tunerScreen() {
  const c = document.createElement("canvas"); c.width = 512; c.height = 256;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const draw = (label = "MMC", cents = 0, lit = true) => {
    const g = c.getContext("2d");
    g.fillStyle = "#070303"; g.fillRect(0, 0, 512, 256);
    for (let i = -10; i <= 10; i++) {
      const x = 256 + i * 22, on = lit && Math.abs(i - Math.round(cents / 5)) <= (i === 0 ? 0 : 0);
      g.fillStyle = i === 0 ? (lit && Math.abs(cents) < 3 ? "#5dff7a" : "#2a1212") : on ? "#ff3a3a" : "#2a1212";
      g.fillRect(x - 6, 28, 12, i === 0 ? 58 : 40);
    }
    g.fillStyle = lit ? "#ff4040" : "#3a1515"; g.font = "700 76px 'IBM Plex Mono', monospace"; g.textAlign = "center";
    g.fillText(label, 256, 186);
    g.font = "600 24px 'IBM Plex Mono', monospace"; g.fillText(Math.abs(cents) < 3 ? "IN TUNE" : (cents > 0 ? "+" : "") + cents.toFixed(0) + " ¢", 256, 232);
    t.needsUpdate = true;
  };
  draw();
  return { tex: t, draw };
}

export function pedal(spec) {
  const g = new THREE.Group();
  const face = pedalFaceTex(spec);
  const H = spec.looper ? 0.045 : 0.038;
  const coat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: face, roughness: 0.5, roughnessMap: tex.flake, clearcoat: 0.25, clearcoatRoughness: 0.45 });
  const side = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(spec.bg), roughness: 0.55, roughnessMap: tex.flake });
  const box = new THREE.Mesh(new RoundedBoxGeometry(spec.w, H, spec.d, 5, 0.006), [side, side, coat, side, side, side]);
  box.position.y = H / 2 + 0.004; g.add(box);
  // rubber feet
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { const f = cyl(0.005, 0.005, 0.004, 10, mat.rubber); f.position.set(sx * (spec.w / 2 - 0.009), 0.002, sz * (spec.d / 2 - 0.009)); g.add(f); });
  const topY = H + 0.004;
  const knobs = [];
  const n = spec.knobs.length;
  const kx = n === 4 ? [-0.027, -0.009, 0.009, 0.027] : n === 2 ? [-0.016, 0.016] : [-0.022, 0, 0.022];
  if (spec.tuner) {
    const scr = tunerScreen();
    const bezel = new THREE.Mesh(new RoundedBoxGeometry(0.058, 0.004, 0.036, 2, 0.002), mat.plasticBlack); bezel.position.set(0, topY + 0.001, -0.026); g.add(bezel);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.052, 0.03), new THREE.MeshStandardMaterial({ map: scr.tex, emissive: 0xffffff, emissiveMap: scr.tex, emissiveIntensity: 1.2, roughness: 0.2 }));
    s.rotation.x = -Math.PI / 2; s.position.set(0, topY + 0.0034, -0.026); s.userData.dynamic = true; g.add(s);
    g.userData.screen = scr;
  } else {
    kx.slice(0, n).forEach((x, i) => {
      const k = knob(spec.bg === "#e31e24" || spec.bg === "#b3121a" || spec.bg === "#8f0f14" ? 0x111111 : 0x0e0e0e);
      k.position.set(x * (spec.w / 0.075), topY, -spec.d * 0.32 + (n === 3 && i === 1 ? -0.004 : 0));
      k.rotation.y = 0.8 - i * 0.5; k.userData.dynamic = true; g.add(k); knobs.push(k);
    });
  }
  // looper: LED ring + second switch
  if (spec.looper) {
    const ring = new THREE.Group(); ring.position.set(0, topY + 0.001, -0.022); ring.userData.dynamic = true; g.add(ring);
    const ledM = [];
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const l = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.0015, 0.0025), mat.led.clone()); l.position.set(Math.cos(a) * 0.016, 0, Math.sin(a) * 0.016); l.rotation.y = -a; ring.add(l); ledM.push(l); }
    g.userData.ring = ledM;
  }
  // footswitch(es)
  const switches = [];
  (spec.looper ? [-0.03, 0.03] : [0]).forEach((x) => {
    const sw = new THREE.Group(); sw.position.set(x, topY, spec.d * 0.24); sw.userData.dynamic = true; g.add(sw);
    const nut = cyl(0.0088, 0.0088, 0.004, 6, mat.chrome); nut.position.y = 0.002; sw.add(nut);
    const wash = cyl(0.0095, 0.0095, 0.001, 24, mat.nickel); sw.add(wash);
    const cap = cyl(0.0056, 0.0062, 0.011, 32, mat.chrome); cap.position.y = 0.0095; sw.add(cap);
    switches.push(cap);
  });
  // LED
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.003, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat.led.clone());
  led.position.set(spec.looper ? 0.0 : 0, topY, spec.looper ? 0.012 : -0.005); led.userData.dynamic = true; g.add(led);
  const bez = new THREE.Mesh(new THREE.TorusGeometry(0.0034, 0.0008, 8, 16), mat.chrome); bez.rotation.x = Math.PI / 2; bez.position.copy(led.position); g.add(bez);
  // jacks (in on the right as seen from the player, out on the left) + DC on top-back
  [-1, 1].forEach((sx) => { const j = cyl(0.0058, 0.0058, 0.006, 24, mat.chrome); j.rotation.z = Math.PI / 2; j.position.set(sx * (spec.w / 2 + 0.002), H * 0.6, -spec.d * 0.22); g.add(j); });
  const dc = cyl(0.004, 0.004, 0.006, 16, mat.plasticBlack); dc.rotation.x = Math.PI / 2; dc.position.set(0, H * 0.6, -spec.d / 2 - 0.002); g.add(dc);

  g.userData = { ...g.userData, spec, led, knobs, switches, topY,
    jackIn: new THREE.Vector3(spec.w / 2 + 0.004, H * 0.6, -spec.d * 0.22),
    jackOut: new THREE.Vector3(-spec.w / 2 - 0.004, H * 0.6, -spec.d * 0.22) };
  return shadow(g);
}

export function pedalboard() {
  const board = new THREE.Group();
  const W = 0.92, D = 0.36;
  // aluminium board with slanted top + loop fabric
  const loop = canvasTex(512, 256, (c, w, h) => { c.fillStyle = "#151516"; c.fillRect(0, 0, w, h); noise(c, w, h, 28); for (let i = 0; i < 2500; i++) { c.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 1); } }, { repeat: [3, 1.2] });
  const top = new THREE.Mesh(new RoundedBoxGeometry(W, 0.012, D, 2, 0.004), new THREE.MeshStandardMaterial({ map: loop, roughness: 1 }));
  top.position.y = 0.05; top.rotation.x = 0.07; board.add(top);
  const frameShape = new THREE.Shape(); frameShape.moveTo(-D / 2, 0); frameShape.lineTo(D / 2, 0); frameShape.lineTo(D / 2, 0.035); frameShape.lineTo(-D / 2, 0.065); frameShape.lineTo(-D / 2, 0);
  [-1, 1].forEach((sx) => { const geo = new THREE.ExtrudeGeometry(frameShape, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2 }); const s = new THREE.Mesh(geo, mat.steel); s.rotation.y = Math.PI / 2; s.position.set(sx * W / 2 - (sx > 0 ? 0.012 : 0), 0, 0); board.add(s); });
  const lip = new THREE.Mesh(new RoundedBoxGeometry(W, 0.03, 0.014, 2, 0.004), mat.steel); lip.position.set(0, 0.018, D / 2); board.add(lip);
  // power brick under the back edge
  const psu = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.04, 0.09, 3, 0.006), mat.blackMetal); psu.position.set(0.12, 0.085, -D / 2 - 0.03); board.add(psu);
  const psuLabel = canvasTex(256, 64, (c, w, h) => { c.fillStyle = "#1a1a1a"; c.fillRect(0, 0, w, h); c.fillStyle = "#e31e24"; c.font = "600 22px 'IBM Plex Mono', monospace"; c.fillText("MMC · 9V × 8 · ISOLATED", 12, 40); });
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.03), new THREE.MeshStandardMaterial({ map: psuLabel, roughness: 0.5 })); pl.position.set(0.12, 0.085, -D / 2 + 0.0155); board.add(pl);
  const psuLed = new THREE.Mesh(new THREE.SphereGeometry(0.003, 8, 6), mat.ledGreen); psuLed.position.set(0.24, 0.1, -D / 2 + 0.015); board.add(psuLed);

  // pedals: two staggered rows following the slope
  const layout = [
    [-0.37, 0.07], [-0.26, 0.07], [-0.15, 0.07], [-0.02, 0.06], // fuzz chorus echo looper
    [0.115, 0.07], [0.215, 0.07], [0.305, 0.075],               // tuner room boost
  ];
  const pedals = PEDALS.map((spec, i) => {
    const p = pedal(spec);
    const [x, z] = layout[i];
    p.position.set(x, 0.058 - z * 0.07 * 0.0, z);
    p.rotation.x = 0.07;
    p.position.y = 0.057 + (D / 2 - z) * Math.tan(0.07) * 0.0;
    p.rotation.y = (Math.random() - 0.5) * 0.05;
    board.add(p);
    return p;
  });

  // patch cables between neighbours (signal flows right → left as seen by the player)
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  for (let i = 0; i < pedals.length - 1; i++) {
    const a = pedals[i], b = pedals[i + 1];
    a.updateMatrixWorld(); b.updateMatrixWorld();
    tmpA.copy(a.userData.jackIn).applyMatrix4(a.matrix);
    tmpB.copy(b.userData.jackOut).applyMatrix4(b.matrix);
    const mid = tmpA.clone().lerp(tmpB, 0.5); mid.z -= 0.085; mid.y += 0.02;
    const c = cable([tmpA.clone().add(new THREE.Vector3(0.03, 0, 0)), tmpA.clone().add(new THREE.Vector3(0.045, 0.005, -0.03)), mid, tmpB.clone().add(new THREE.Vector3(-0.045, 0.005, -0.03)), tmpB.clone().add(new THREE.Vector3(-0.03, 0, 0))], 0.0028, i % 3 === 1 ? mat.cableRed : mat.cable, 40);
    board.add(c);
    const pa = jackPlug(); pa.position.copy(tmpA).add(new THREE.Vector3(0.022, 0, 0)); board.add(pa);
    const pb = jackPlug(); pb.rotation.y = Math.PI; pb.position.copy(tmpB).add(new THREE.Vector3(-0.022, 0, 0)); board.add(pb);
  }
  // DC daisy cables (thin, along the back)
  pedals.forEach((p, i) => { const s = new THREE.Vector3(0, 0.035, -p.userData.spec.d / 2 - 0.003).applyMatrix4(p.matrix); const e = new THREE.Vector3(0.0 + (i - 3) * 0.03 + 0.12, 0.09, -D / 2 - 0.03); board.add(cable([s, s.clone().add(new THREE.Vector3(0, 0.01, -0.03)), e.clone().add(new THREE.Vector3(0, 0, 0.03)), e], 0.0016, mat.cable, 20)); });

  // empty taped slot (finale) right of BOOST
  const tape = canvasTex(512, 64, (c, w, h) => { c.fillStyle = "#a9a190"; c.fillRect(0, 0, w, h); noise(c, w, h, 18); c.fillStyle = "rgba(0,0,0,.15)"; c.fillRect(0, 0, w, 3); c.fillRect(0, h - 3, w, 3); });
  const tapeMat = new THREE.MeshStandardMaterial({ map: tape, roughness: 0.85 });
  const slot = new THREE.Group(); slot.position.set(0.395, 0.0575, 0.07); slot.rotation.x = 0.07; board.add(slot);
  [[0, -0.06, 0.09, 0.012], [0, 0.06, 0.09, 0.012], [-0.04, 0, 0.012, 0.13], [0.04, 0, 0.012, 0.13]].forEach(([x, z, w, d]) => { const t = new THREE.Mesh(new THREE.BoxGeometry(w, 0.0008, d), tapeMat); t.position.set(x, 0, z); t.rotation.y = (Math.random() - 0.5) * 0.06; slot.add(t); });
  const note = canvasTex(512, 160, (c, w, h) => { c.fillStyle = "#b5ad9a"; c.fillRect(0, 0, w, h); noise(c, w, h, 16); c.fillStyle = "#111"; c.font = "700 54px 'Familjen Grotesk', 'Marker Felt', sans-serif"; c.fillText("YOUR SOUND", 30, 70); c.fillStyle = "#b3121a"; c.font = "600 34px 'IBM Plex Mono', monospace"; c.fillText("→ SLOT 08", 30, 125); });
  const nm = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.024), new THREE.MeshStandardMaterial({ map: note, roughness: 0.85 })); nm.rotation.x = -Math.PI / 2; nm.rotation.z = 0.06; nm.position.set(0, 0.001, 0.01); slot.add(nm);

  board.userData = { pedals, slot, inputJack: pedals[0].userData.jackIn, width: W };
  return shadow(board);
}

/* Unplugged pedal in its open box — the member spotlight "coming soon" */
export function storyPedal() {
  const g = new THREE.Group();
  const boxMat = new THREE.MeshStandardMaterial({ color: 0x1a1918, roughness: 0.9 });
  const base = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.05, 0.16, 2, 0.003), boxMat); base.position.y = 0.025; g.add(base);
  const lidTex = canvasTex(512, 720, (c, w, h) => { c.fillStyle = "#1a1918"; c.fillRect(0, 0, w, h); noise(c, w, h, 16); c.fillStyle = "#e31e24"; c.fillRect(40, 60, w - 80, 10); c.fillStyle = "#f1ece2"; c.font = "400 86px 'Special Gothic Expanded One','Arial Black',sans-serif"; c.textAlign = "center"; c.fillText("STORY", w / 2, 360); c.font = "600 30px 'IBM Plex Mono', monospace"; c.fillText("MMC-08 · COMING SOON", w / 2, 420); });
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.112, 0.004, 0.162), [boxMat, boxMat, new THREE.MeshStandardMaterial({ map: lidTex, roughness: 0.8 }), boxMat, boxMat, boxMat]);
  lid.position.set(0, 0.1, -0.1); lid.rotation.x = -1.25; g.add(lid);
  const p = pedal({ name: "STORY", sub: "MMC-08 · YOUR NAME HERE", knobs: ["WHO", "WHY"], bg: "#efe9dc", fg: "#121212", accent: "#b3121a", w: 0.07, d: 0.115 });
  p.position.set(0.0, 0.032, 0.0); p.rotation.y = 0.12; g.add(p);
  const foam = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.004, 0.15), mat.foam); foam.position.y = 0.03; g.add(foam);
  return shadow(g);
}
