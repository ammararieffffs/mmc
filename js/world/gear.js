/* =====================================================================
   MMC v3 — gear.js
   Procedural instruments and equipment. All designs are original
   (no trademarked body shapes, headstocks or logos).
   Units: metres. Every builder returns a THREE.Group facing +Z.
   ===================================================================== */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mat, canvasTex, noise } from "./materials.js";

const V2 = (x, y) => new THREE.Vector2(x, y);
const shadow = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };
const cyl = (rt, rb, h, s, m) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, s), m);

/* ---------------- cables ---------------- */
export function cable(points, radius = 0.0035, material = mat.cable, segs = 80) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => (p.isVector3 ? p : new THREE.Vector3(...p))), false, "catmullrom", 0.35);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, radius, 8), material);
  m.castShadow = true; m.receiveShadow = true;
  m.userData.curve = curve;
  return m;
}
export function jackPlug(straight = true) {
  const g = new THREE.Group();
  const body = cyl(0.0055, 0.0055, 0.032, 16, mat.blackMetal); body.rotation.z = Math.PI / 2; body.position.x = -0.016; g.add(body);
  const sleeve = cyl(0.003, 0.003, 0.012, 12, mat.nickel); sleeve.rotation.z = Math.PI / 2; sleeve.position.x = 0.006; g.add(sleeve);
  const boot = cyl(0.004, 0.0055, 0.018, 12, mat.rubber); boot.rotation.z = Math.PI / 2; boot.position.x = -0.04; g.add(boot);
  if (!straight) g.rotation.y = Math.PI / 2;
  return g;
}

/* ---------------- electric guitar / bass ---------------- */
export function guitar({ bass = false, finish = mat.redLacquer, guardMat = mat.pickguard } = {}) {
  const g = new THREE.Group();
  const parts = { strings: [] };
  const s = new THREE.Shape();
  const k = bass ? 1.1 : 1;
  // Original offset body outline
  s.moveTo(0, -0.24 * k);
  s.bezierCurveTo(0.17 * k, -0.25 * k, 0.205 * k, -0.12 * k, 0.168 * k, -0.04 * k);
  s.bezierCurveTo(0.142 * k, 0.02 * k, 0.132 * k, 0.06 * k, 0.16 * k, 0.12 * k);
  s.bezierCurveTo(0.19 * k, 0.19 * k, 0.15 * k, 0.25 * k, 0.085 * k, 0.236 * k);
  s.bezierCurveTo(0.052 * k, 0.228 * k, 0.046 * k, 0.17 * k, 0.03 * k, 0.15 * k);
  s.lineTo(-0.03 * k, 0.15 * k);
  s.bezierCurveTo(-0.05 * k, 0.2 * k, -0.06 * k, (bass ? 0.33 : 0.29) * k, -0.122 * k, (bass ? 0.32 : 0.28) * k);
  s.bezierCurveTo(-0.2 * k, 0.27 * k, -0.19 * k, 0.16 * k, -0.15 * k, 0.08 * k);
  s.bezierCurveTo(-0.12 * k, 0.02 * k, -0.13 * k, -0.02 * k, -0.17 * k, -0.08 * k);
  s.bezierCurveTo(-0.212 * k, -0.17 * k, -0.15 * k, -0.255 * k, 0, -0.24 * k);
  const bodyGeo = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.009, bevelSize: 0.009, bevelSegments: 8, curveSegments: 120 });
  bodyGeo.translate(0, 0, -0.019);
  const body = new THREE.Mesh(bodyGeo, finish); g.add(body);
  parts.body = body;

  // pickguard (smooth curves)
  const pg = new THREE.Shape();
  pg.moveTo(-0.11 * k, 0.2 * k);
  pg.bezierCurveTo(-0.15 * k, 0.12 * k, -0.115 * k, 0.0, -0.14 * k, -0.1 * k);
  pg.bezierCurveTo(-0.11 * k, -0.17 * k, 0.04 * k, -0.155 * k, 0.085 * k, -0.06 * k);
  pg.bezierCurveTo(0.1 * k, -0.02 * k, 0.07 * k, 0.08 * k, 0.06 * k, 0.12 * k);
  pg.lineTo(0.025 * k, 0.155 * k); pg.lineTo(-0.035 * k, 0.155 * k);
  pg.bezierCurveTo(-0.05 * k, 0.19 * k, -0.08 * k, 0.215 * k, -0.11 * k, 0.2 * k);
  const guard = new THREE.Mesh(new THREE.ExtrudeGeometry(pg, { depth: 0.0018, bevelEnabled: true, bevelThickness: 0.0006, bevelSize: 0.0012, bevelSegments: 2, curveSegments: 80 }), guardMat);
  guard.position.z = 0.0205; g.add(guard);
  for (let i = 0; i < 8; i++) { // guard screws
    const t = i / 8, pt = pg.getPoint(t);
    const sc = cyl(0.0019, 0.0019, 0.0012, 12, mat.chrome); sc.rotation.x = Math.PI / 2;
    sc.position.set(pt.x * 0.94, pt.y * 0.94, 0.0238); g.add(sc);
  }

  const nStr = bass ? 4 : 6;
  const spacingBridge = bass ? 0.019 : 0.0104;
  const scaleTop = bass ? 0.74 : 0.6;   // neck length
  const bridgeY = -0.12 * k;

  // pickups
  const puYs = bass ? [-0.02] : [0.065, -0.045];
  puYs.forEach((y) => {
    const pu = new THREE.Mesh(new RoundedBoxGeometry(bass ? 0.095 : 0.074, bass ? 0.03 : 0.036, 0.012, 3, 0.004), mat.plasticBlack);
    pu.position.set(0, y, 0.027); g.add(pu);
    const ring = new THREE.Mesh(new RoundedBoxGeometry(bass ? 0.104 : 0.084, bass ? 0.04 : 0.046, 0.004, 2, 0.003), mat.plasticCream);
    ring.position.set(0, y, 0.0225); g.add(ring);
    for (let i = 0; i < nStr; i++) for (let j = 0; j < (bass ? 1 : 2); j++) {
      const p = cyl(0.0022, 0.0022, 0.003, 12, mat.nickel); p.rotation.x = Math.PI / 2;
      p.position.set((i - (nStr - 1) / 2) * spacingBridge, y + (bass ? 0 : -0.009 + j * 0.018), 0.0345); g.add(p);
    }
  });

  // bridge with saddles
  const br = new THREE.Mesh(new RoundedBoxGeometry(bass ? 0.09 : 0.078, 0.03, 0.008, 2, 0.003), mat.chrome); br.position.set(0, bridgeY - 0.008, 0.025); g.add(br);
  for (let i = 0; i < nStr; i++) {
    const sd = new THREE.Mesh(new RoundedBoxGeometry(0.0085, 0.016, 0.007, 2, 0.0015), mat.chrome);
    sd.position.set((i - (nStr - 1) / 2) * spacingBridge, bridgeY, 0.031); g.add(sd);
  }
  // knobs + switch + jack
  (bass ? [[0.11, -0.1], [0.13, -0.15]] : [[0.1, -0.1], [0.123, -0.148], [0.072, -0.172]]).forEach(([x, y]) => {
    const kn = new THREE.Group();
    const skirt = cyl(0.0125, 0.0135, 0.004, 40, mat.chrome); kn.add(skirt);
    const cap = cyl(0.0105, 0.0115, 0.014, 40, mat.chrome); cap.position.y = 0.008; kn.add(cap);
    const top = cyl(0.0095, 0.0095, 0.0012, 40, mat.blackLacquer); top.position.y = 0.0152; kn.add(top);
    kn.rotation.x = Math.PI / 2; kn.position.set(x * k, y * k, 0.024); g.add(kn);
  });
  if (!bass) { const tg = cyl(0.0018, 0.0022, 0.028, 12, mat.chrome); tg.position.set(-0.122, 0.17, 0.034); tg.rotation.x = 1.25; g.add(tg); const tip = new THREE.Mesh(new THREE.SphereGeometry(0.004, 12, 8), mat.plasticCream); tip.position.set(-0.122, 0.182, 0.046); g.add(tip); }
  const jack = cyl(0.009, 0.009, 0.004, 24, mat.chrome); jack.position.set(0.168 * k, -0.06 * k, 0.0); jack.rotation.z = Math.PI / 2; g.add(jack);
  parts.jack = new THREE.Vector3(0.172 * k, -0.06 * k, 0.0);

  // neck + fingerboard + frets
  const neckBase = 0.15 * k;
  const neck = new THREE.Mesh(new RoundedBoxGeometry(bass ? 0.054 : 0.047, scaleTop, 0.022, 4, 0.009), mat.maple);
  neck.position.set(0, neckBase + scaleTop / 2, 0.012); g.add(neck);
  const fb = new THREE.Mesh(new RoundedBoxGeometry(bass ? 0.054 : 0.047, scaleTop, 0.006, 2, 0.0015), mat.rosewood);
  fb.position.set(0, neckBase + scaleTop / 2, 0.026); g.add(fb);
  const nut = new THREE.Mesh(new THREE.BoxGeometry(bass ? 0.054 : 0.047, 0.004, 0.005), mat.plasticCream); nut.position.set(0, neckBase + scaleTop, 0.031); g.add(nut);
  const fretCount = bass ? 20 : 22, L = (scaleTop + (neckBase - bridgeY)) ;
  for (let f = 1; f <= fretCount; f++) {
    const y = neckBase + scaleTop - L * (1 - Math.pow(2, -f / 12));
    if (y < neckBase + 0.01) break;
    const fr = cyl(0.0011, 0.0011, bass ? 0.054 : 0.047, 8, mat.nickel); fr.rotation.z = Math.PI / 2; fr.position.set(0, y, 0.0295); g.add(fr);
    if ([3, 5, 7, 9, 15, 17].includes(f)) { const d = cyl(0.0027, 0.0027, 0.0008, 16, mat.pearl); d.rotation.x = Math.PI / 2; d.position.set(0, y + 0.014, 0.0293); g.add(d); }
    if (f === 12) [-1, 1].forEach((sx) => { const d = cyl(0.0027, 0.0027, 0.0008, 16, mat.pearl); d.rotation.x = Math.PI / 2; d.position.set(sx * 0.011, y + 0.012, 0.0293); g.add(d); });
  }
  // headstock (original angular)
  const hs = new THREE.Shape();
  hs.moveTo(-0.024, 0); hs.lineTo(-0.044, 0.11); hs.lineTo(-0.022, 0.2); hs.lineTo(0.036, 0.168); hs.lineTo(0.03, 0.085); hs.lineTo(0.024, 0); hs.lineTo(-0.024, 0);
  const head = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: 0.013, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 3 }), mat.blackLacquer);
  head.scale.set(bass ? 1.15 : 1, bass ? 1.2 : 1, 1);
  const headY = neckBase + scaleTop;
  head.position.set(0, headY, 0.008); g.add(head);
  const decal = canvasTex(256, 64, (c, w, h) => { c.fillStyle = "#f1ece2"; c.font = "400 34px 'Special Gothic Expanded One', 'Arial Black', sans-serif"; c.fillText("MMC", 18, 44); c.fillStyle = "#e31e24"; c.fillRect(150, 22, 80, 10); });
  const dm = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.0175), new THREE.MeshStandardMaterial({ map: decal, transparent: true, roughness: 0.4 }));
  dm.position.set(-0.002, headY + 0.13 * (bass ? 1.2 : 1), 0.0235); dm.rotation.z = Math.PI / 2 - 0.12; g.add(dm);
  const posts = [];
  for (let i = 0; i < nStr; i++) {
    const side = bass ? (i < 2 ? -1 : 1) : (i < 3 ? -1 : 1);
    const row = bass ? i % 2 : i % 3;
    const yy = headY + 0.045 + row * (bass ? 0.07 : 0.046);
    const xx = side * (0.021 + row * 0.003);
    const post = cyl(0.004, 0.005, 0.016, 16, mat.chrome); post.rotation.x = Math.PI / 2; post.position.set(xx, yy, 0.03); g.add(post);
    const bush = cyl(0.0065, 0.0065, 0.002, 16, mat.chrome); bush.rotation.x = Math.PI / 2; bush.position.set(xx, yy, 0.0225); g.add(bush);
    const keyb = new THREE.Mesh(new RoundedBoxGeometry(bass ? 0.028 : 0.018, bass ? 0.02 : 0.012, 0.005, 2, 0.0022), mat.chrome);
    keyb.position.set(xx + side * (bass ? 0.03 : 0.024), yy, 0.0); g.add(keyb);
    const gear = cyl(0.0075, 0.0075, 0.012, 16, mat.chrome); gear.rotation.z = Math.PI / 2; gear.position.set(xx + side * 0.011, yy, 0.002); g.add(gear);
    posts.push(new THREE.Vector3(xx, yy, 0.033));
  }
  // strings (gauges), each a separate mesh so it can vibrate
  for (let i = 0; i < nStr; i++) {
    const x0 = (i - (nStr - 1) / 2) * spacingBridge;
    const xn = (i - (nStr - 1) / 2) * (bass ? 0.012 : 0.0074);
    const r = bass ? 0.0011 - i * 0.00012 : 0.00058 - i * 0.00006;
    const pts = [new THREE.Vector3(x0, bridgeY, 0.0345), new THREE.Vector3(xn, headY, 0.0335), posts[nStr - 1 - i] || posts[i]];
    const st = cable(pts, Math.max(0.00028, r), mat.nickel, 24);
    st.userData.base = st.position.clone();
    st.castShadow = false; st.userData.dynamic = true;
    g.add(st); parts.strings.push(st);
  }
  // strap buttons
  [[0, -0.25 * k], [-0.12 * k, (bass ? 0.33 : 0.29) * k]].forEach(([x, y]) => { const b = cyl(0.004, 0.005, 0.01, 12, mat.chrome); b.position.set(x, y, 0); g.add(b); });

  g.userData.parts = parts;
  g.userData.length = headY + 0.2;
  return shadow(g);
}

/* Guitar stand (A-frame) — guitar rests body-down */
export function guitarStand() {
  const g = new THREE.Group();
  const legGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.42, 12);
  [[-0.14, 0.12], [0.14, 0.12], [0, -0.17]].forEach(([x, z]) => {
    const l = new THREE.Mesh(legGeo, mat.blackMetal);
    l.position.set(x * 0.5, 0.2, z * 0.5); l.lookAt(0, 0.45, -0.02); l.rotateX(Math.PI / 2); g.add(l);
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), mat.rubber); f.position.set(x, 0.006, z); g.add(f);
  });
  const cradle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.009, 10, 24, Math.PI), mat.rubber);
  cradle.rotation.set(0, 0, Math.PI); cradle.position.set(0, 0.12, 0.08); g.add(cradle);
  const neckRest = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 8, 16, Math.PI), mat.rubber);
  neckRest.rotation.z = Math.PI; neckRest.position.set(0, 0.62, -0.04); g.add(neckRest);
  const mast = cyl(0.009, 0.009, 0.5, 12, mat.blackMetal); mast.position.set(0, 0.38, -0.05); mast.rotation.x = -0.12; g.add(mast);
  return shadow(g);
}

/* ---------------- amp head + 4x12 cabinet ---------------- */
function ampFace(label, sub) {
  return canvasTex(1024, 220, (c, w, h) => {
    const grd = c.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, "#d7cfbd"); grd.addColorStop(1, "#b9b09c");
    c.fillStyle = grd; c.fillRect(0, 0, w, h); noise(c, w, h, 16);
    c.fillStyle = "#151515"; c.font = "600 22px 'IBM Plex Mono', monospace";
    ["INPUT", "GAIN", "BASS", "MID", "TREBLE", "PRESENCE", "MASTER", "", "STANDBY", "POWER"].forEach((t, i) => c.fillText(t, 40 + i * 98, 200));
    c.fillStyle = "#e31e24"; c.fillRect(0, 0, w, 10);
  });
}
export function ampHead() {
  const g = new THREE.Group();
  const W = 0.74, H = 0.27, D = 0.26;
  const box = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 4, 0.018), mat.tolex); box.position.y = H / 2; g.add(box);
  // control panel recess
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.06, 0.1), new THREE.MeshStandardMaterial({ map: ampFace(), roughness: 0.4, metalness: 0.3 }));
  panel.position.set(0, 0.075, D / 2 + 0.001); g.add(panel);
  const knobs = [];
  for (let i = 1; i < 10; i++) {
    if (i === 7) continue;
    const x = -W / 2 + 0.03 + (40 + i * 98 + 30) / 1024 * (W - 0.06);
    if (i >= 8) { // toggles
      const sw = cyl(0.003, 0.003, 0.022, 8, mat.chrome); sw.rotation.x = Math.PI / 2 - 0.35; sw.position.set(x, 0.09, D / 2 + 0.012); g.add(sw);
      continue;
    }
    const kn = new THREE.Group();
    const b = cyl(0.016, 0.017, 0.016, 32, mat.plasticBlack); kn.add(b);
    const cap = cyl(0.009, 0.009, 0.002, 24, mat.brass); cap.position.y = 0.009; kn.add(cap);
    const ptr = new THREE.Mesh(new THREE.BoxGeometry(0.0018, 0.0018, 0.014), mat.plasticCream); ptr.position.set(0, 0.009, 0.007); kn.add(ptr);
    kn.rotation.x = Math.PI / 2; kn.position.set(x, 0.095, D / 2 + 0.008); kn.rotation.y = -1 + Math.random() * 2;
    g.add(kn); knobs.push(kn);
  }
  const inJ = cyl(0.008, 0.008, 0.004, 20, mat.chrome); inJ.rotation.x = Math.PI / 2; inJ.position.set(-W / 2 + 0.06, 0.095, D / 2 + 0.003); g.add(inJ);
  const pilot = new THREE.Mesh(new THREE.SphereGeometry(0.008, 16, 10), mat.led.clone()); pilot.material.emissiveIntensity = 3; pilot.position.set(W / 2 - 0.035, 0.095, D / 2 + 0.006); g.add(pilot);
  // top grille + logo plate
  const grille = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.07, 0.11), mat.grille); grille.position.set(0, 0.2, D / 2 + 0.002); g.add(grille);
  const plate = canvasTex(512, 128, (c, w, h) => { c.fillStyle = "#0e0e0e"; c.fillRect(0, 0, w, h); c.fillStyle = "#f2ede4"; c.font = "400 74px 'Special Gothic Expanded One','Arial Black',sans-serif"; c.textAlign = "center"; c.fillText("MMC", w / 2, 92); c.fillStyle = "#e31e24"; c.fillRect(70, 100, 372, 6); });
  const lp = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.0425), new THREE.MeshStandardMaterial({ map: plate, metalness: 0.6, roughness: 0.3 })); lp.position.set(0, 0.2, D / 2 + 0.004); g.add(lp);
  // piping + handle + corners
  const pipe = new THREE.Mesh(new THREE.TorusGeometry(0.001, 0.0018, 4, 4), mat.plasticCream); pipe.visible = false; g.add(pipe);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.009, 10, 24, Math.PI), mat.rubber); handle.position.set(0, H, 0); g.add(handle);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { const c = new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.04, 0.04, 2, 0.008), mat.nickel); c.position.set(sx * (W / 2 - 0.012), H - 0.012, sz * (D / 2 - 0.012)); g.add(c); });
  g.userData.parts = { knobs, pilot };
  g.userData.input = new THREE.Vector3(-W / 2 + 0.06, 0.095, D / 2 + 0.01);
  return shadow(g);
}

export function cab412() {
  const g = new THREE.Group();
  const W = 0.76, H = 0.76, D = 0.36;
  const box = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 4, 0.02), mat.tolex); box.position.y = H / 2; g.add(box);
  const frame = new THREE.Mesh(new RoundedBoxGeometry(W - 0.05, H - 0.09, 0.012, 2, 0.006), mat.plasticBlack); frame.position.set(0, H / 2 - 0.015, D / 2 + 0.002); g.add(frame);
  const grille = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.08, H - 0.12), mat.grille); grille.position.set(0, H / 2 - 0.015, D / 2 + 0.009); g.add(grille);
  // speaker shapes subtly visible through cloth (bump)
  const sp = canvasTex(512, 512, (c, w, h) => { c.fillStyle = "#000"; c.fillRect(0, 0, w, h); [[128, 128], [384, 128], [128, 384], [384, 384]].forEach(([x, y]) => { const r = c.createRadialGradient(x, y, 10, x, y, 118); r.addColorStop(0, "#666"); r.addColorStop(0.75, "#222"); r.addColorStop(0.9, "#555"); r.addColorStop(1, "#000"); c.fillStyle = r; c.beginPath(); c.arc(x, y, 118, 0, 7); c.fill(); }); }, { srgb: false });
  grille.material = mat.grille.clone(); grille.material.bumpMap = sp; grille.material.bumpScale = 3;
  const plate = canvasTex(512, 128, (c, w, h) => { c.fillStyle = "#0e0e0e"; c.fillRect(0, 0, w, h); c.fillStyle = "#f2ede4"; c.font = "400 64px 'Special Gothic Expanded One','Arial Black',sans-serif"; c.textAlign = "center"; c.fillText("MMC 412", w / 2, 86); });
  const lp = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.04), new THREE.MeshStandardMaterial({ map: plate, metalness: 0.6, roughness: 0.3 })); lp.position.set(-W / 2 + 0.13, H - 0.075, D / 2 + 0.012); g.add(lp);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => [-1, 1].forEach((sz) => { const c = new THREE.Mesh(new RoundedBoxGeometry(0.045, 0.045, 0.045, 2, 0.01), mat.nickel); c.position.set(sx * (W / 2 - 0.014), sy > 0 ? H - 0.014 : 0.014, sz * (D / 2 - 0.014)); g.add(c); }));
  [-1, 1].forEach((sx) => { const h = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.13, 0.03, 2, 0.01), mat.blackMetal); h.position.set(sx * (W / 2 + 0.005), H * 0.62, 0); g.add(h); });
  // casters
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { const w = cyl(0.025, 0.025, 0.02, 16, mat.rubber); w.rotation.x = Math.PI / 2; w.position.set(sx * (W / 2 - 0.06), -0.02, sz * (D / 2 - 0.06)); g.add(w); });
  g.position.y = 0.045;
  return shadow(g);
}

/* Bass combo amp with visible speaker (open grille) */
export function bassCombo() {
  const g = new THREE.Group();
  const W = 0.5, H = 0.62, D = 0.38;
  const box = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 4, 0.02), mat.tolex); box.position.y = H / 2; g.add(box);
  const baffle = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.05, H - 0.17), mat.plasticBlack); baffle.position.set(0, 0.24, D / 2 + 0.001); g.add(baffle);
  const prof = [[0, -0.07], [0.03, -0.075], [0.04, -0.07], [0.15, -0.015], [0.16, -0.01], [0.17, 0.005], [0.18, 0.0], [0.185, 0.0]].map((p) => V2(p[0], p[1]));
  const cone = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.85 }));
  cone.rotation.x = Math.PI / 2; cone.position.set(0, 0.24, D / 2 - 0.0); g.add(cone);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.035, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5, metalness: 0.4 }));
  cap.rotation.x = Math.PI / 2; cap.position.set(0, 0.24, D / 2 - 0.07); g.add(cap);
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.05, H - 0.17), new THREE.MeshStandardMaterial({ color: 0x1c1c1c, metalness: 0.8, roughness: 0.4, alphaMap: mat.grille.map, transparent: true, alphaTest: 0.5 }));
  gr.material = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.35, alphaMap: canvasTex(256, 256, (c, w, h) => { c.fillStyle = "#000"; c.fillRect(0, 0, w, h); c.strokeStyle = "#fff"; c.lineWidth = 3; for (let i = 0; i < w; i += 10) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); } }, { srgb: false, repeat: [4, 5] }), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
  gr.position.set(0, 0.24, D / 2 + 0.006); g.add(gr);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.05, 0.08), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.7, roughness: 0.35 })); panel.position.set(0, H - 0.06, D / 2 + 0.001); g.add(panel);
  for (let i = 0; i < 6; i++) { const kn = cyl(0.011, 0.012, 0.012, 24, mat.plasticBlack); kn.rotation.x = Math.PI / 2; kn.position.set(-W / 2 + 0.07 + i * 0.065, H - 0.06, D / 2 + 0.008); g.add(kn); const dot = cyl(0.006, 0.006, 0.001, 16, mat.nickel); dot.rotation.x = Math.PI / 2; dot.position.set(kn.position.x, kn.position.y, D / 2 + 0.015); g.add(dot); }
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => { const c = new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.04, 0.04, 2, 0.008), mat.nickel); c.position.set(sx * (W / 2 - 0.012), sy > 0 ? H - 0.012 : 0.012, D / 2 - 0.012); g.add(c); });
  g.userData.parts = { cone };
  return shadow(g);
}

/* ---------------- microphone + boom stand ---------------- */
export function microphone() {
  const g = new THREE.Group();
  const prof = [[0.0, -0.17], [0.011, -0.17], [0.0145, -0.166], [0.016, -0.15], [0.017, -0.06], [0.0205, -0.02], [0.0235, 0.0], [0.0245, 0.012], [0.0, 0.012]].map((p) => V2(p[0], p[1]));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 64), new THREE.MeshPhysicalMaterial({ color: 0x1b1b1d, roughness: 0.45, metalness: 0.5, clearcoat: 0.4 })));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.0028, 16, 64), mat.chrome); ring.rotation.x = Math.PI / 2; ring.position.y = 0.014; g.add(ring);
  const xlr = cyl(0.009, 0.009, 0.006, 24, mat.nickel); xlr.position.y = -0.172; g.add(xlr);
  const grilleMat = new THREE.MeshStandardMaterial({ color: 0x9a9a9a, metalness: 1, roughness: 0.5, alphaMap: mat.chrome.roughnessMap ? null : null, transparent: true, alphaTest: 0.45, side: THREE.DoubleSide });
  grilleMat.alphaMap = canvasTex(512, 512, (c, w, h) => { c.fillStyle = "#000"; c.fillRect(0, 0, w, h); c.strokeStyle = "#fff"; c.lineWidth = 3; for (let i = -w; i < w * 2; i += 13) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h, h); c.stroke(); c.beginPath(); c.moveTo(i, h); c.lineTo(i + h, 0); c.stroke(); } }, { srgb: false, repeat: [7, 3] });
  const grille = new THREE.Mesh(new THREE.SphereGeometry(0.032, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.62), grilleMat); grille.position.y = 0.04; g.add(grille);
  const foam = new THREE.Mesh(new THREE.SphereGeometry(0.0285, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.6), new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 1 })); foam.position.y = 0.04; g.add(foam);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0324, 0.0324, 0.008, 64, 1, true), mat.chrome); band.position.y = 0.021; g.add(band);
  return shadow(g);
}
export function micStand(height = 1.45, boomLen = 0.7) {
  const g = new THREE.Group();
  // tripod base
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.3;
    const leg = cyl(0.007, 0.006, 0.36, 10, mat.blackMetal);
    leg.position.set(Math.cos(a) * 0.14, 0.07, Math.sin(a) * 0.14);
    leg.lookAt(0, 0.16, 0); leg.rotateX(Math.PI / 2); g.add(leg);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 6), mat.rubber); foot.position.set(Math.cos(a) * 0.28, 0.005, Math.sin(a) * 0.28); g.add(foot);
  }
  const hub = cyl(0.02, 0.022, 0.05, 16, mat.blackMetal); hub.position.y = 0.16; g.add(hub);
  const lower = cyl(0.0115, 0.0115, height * 0.55, 16, mat.blackMetal); lower.position.y = 0.16 + height * 0.275; g.add(lower);
  const clutch = cyl(0.016, 0.016, 0.035, 16, mat.plasticBlack); clutch.position.y = 0.16 + height * 0.55; g.add(clutch);
  const upper = cyl(0.008, 0.008, height * 0.4, 16, mat.steel); upper.position.y = 0.16 + height * 0.55 + height * 0.2; g.add(upper);
  const topY = 0.16 + height * 0.95;
  const joint = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 12), mat.blackMetal); joint.position.y = topY; g.add(joint);
  const boom = new THREE.Group(); boom.position.y = topY; boom.rotation.x = 0.22; g.add(boom);
  const arm = cyl(0.0075, 0.0075, boomLen, 12, mat.blackMetal); arm.rotation.x = Math.PI / 2; arm.position.z = boomLen * 0.35; boom.add(arm);
  const cw = cyl(0.022, 0.022, 0.07, 16, mat.blackMetal); cw.rotation.x = Math.PI / 2; cw.position.z = -boomLen * 0.15 - 0.035; boom.add(cw);
  const clip = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.05, 0.025, 2, 0.006), mat.plasticBlack); clip.position.z = boomLen * 0.85; boom.add(clip);
  const mic = microphone(); mic.rotation.x = Math.PI / 2 - 0.1; mic.position.set(0, -0.005, boomLen * 0.85 + 0.06); boom.add(mic);
  g.userData.mic = mic; g.userData.boom = boom;
  return shadow(g);
}

/* ---------------- floor monitor wedge ---------------- */
export function floorMonitor() {
  const g = new THREE.Group();
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.44, 0); sh.lineTo(0.44, 0.12); sh.lineTo(0.12, 0.34); sh.lineTo(0, 0.34); sh.lineTo(0, 0);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.56, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3 }); geo.translate(-0.22, 0, -0.28);
  const body = new THREE.Mesh(geo, mat.tolex); body.rotation.y = -Math.PI / 2; g.add(body);
  // angled grille
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.37), new THREE.MeshStandardMaterial({ color: 0x1d1d1e, metalness: 0.85, roughness: 0.4, alphaMap: canvasTex(512, 512, (c, w, h) => { c.fillStyle = "#fff"; c.fillRect(0, 0, w, h); c.fillStyle = "#000"; for (let y = 8; y < h; y += 14) for (let x = (y / 14) % 2 ? 14 : 7; x < w; x += 14) { c.beginPath(); c.arc(x, y, 4.6, 0, 7); c.fill(); } }, { srgb: false, repeat: [4, 3] }), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }));
  const ang = Math.atan2(0.22, 0.32);
  gr.position.set(0, 0.235, 0.06); gr.rotation.x = -ang; g.add(gr);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.36), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1 })); inner.position.set(0, 0.23, 0.055); inner.rotation.x = -ang; g.add(inner);
  g.userData.faceAngle = ang;
  return shadow(g);
}

/* ---------------- keyboard / synth on X-stand ---------------- */
export function synth() {
  const g = new THREE.Group();
  const kbd = new THREE.Group(); kbd.position.y = 0.78; g.add(kbd);
  const W = 1.0, D = 0.32;
  const body = new THREE.Mesh(new RoundedBoxGeometry(W, 0.075, D, 4, 0.012), mat.blackLacquer); kbd.add(body);
  const cheek = (x) => { const c = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.09, D + 0.01, 3, 0.01), mat.redLacquer); c.position.set(x, 0.006, 0); kbd.add(c); };
  cheek(-W / 2 + 0.01); cheek(W / 2 - 0.01);
  // keys: 37 keys (C to C)
  const whiteGeo = new RoundedBoxGeometry(0.0225, 0.022, 0.14, 2, 0.002);
  const blackGeo = new RoundedBoxGeometry(0.013, 0.02, 0.09, 2, 0.002);
  const whites = new THREE.InstancedMesh(whiteGeo, mat.plasticCream, 22);
  const blacks = new THREE.InstancedMesh(blackGeo, mat.plasticBlack, 15);
  const m4 = new THREE.Matrix4(); let wi = 0, bi = 0;
  const startX = -0.24;
  const keyMap = [];
  for (let n = 0; n < 37; n++) {
    const pc = n % 12, isBlack = [1, 3, 6, 8, 10].includes(pc);
    const oct = Math.floor(n / 12);
    const whiteIdx = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6][pc] + oct * 7;
    if (!isBlack) { m4.makeTranslation(startX + whiteIdx * 0.0235, 0.035, 0.07); whites.setMatrixAt(wi, m4); keyMap.push({ n, black: false, i: wi++ }); }
    else { m4.makeTranslation(startX + whiteIdx * 0.0235 + 0.0117, 0.05, 0.045); blacks.setMatrixAt(bi, m4); keyMap.push({ n, black: true, i: bi++ }); }
  }
  whites.count = wi; blacks.count = bi;
  whites.castShadow = blacks.castShadow = true; kbd.add(whites, blacks);
  // controls: knobs row, screen, wheels
  for (let i = 0; i < 8; i++) { const kn = cyl(0.009, 0.01, 0.014, 24, mat.plasticBlack); kn.position.set(-0.22 + i * 0.05, 0.045, -0.1); kbd.add(kn); const cap = cyl(0.004, 0.004, 0.001, 12, mat.brass); cap.position.set(kn.position.x, 0.0525, -0.1); kbd.add(cap); }
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.045), new THREE.MeshStandardMaterial({ map: canvasTex(256, 96, (c, w, h) => { c.fillStyle = "#120304"; c.fillRect(0, 0, w, h); c.fillStyle = "#ff3a3a"; c.font = "600 26px 'IBM Plex Mono', monospace"; c.fillText("MMC·PAD 01", 14, 40); c.font = "600 18px 'IBM Plex Mono', monospace"; c.fillText("BPM 120  ♪", 14, 72); }), emissive: 0xffffff, emissiveMap: null, roughness: 0.3 }));
  scr.material.emissiveMap = scr.material.map; scr.material.emissiveIntensity = 0.9;
  scr.rotation.x = -Math.PI / 2; scr.position.set(0.25, 0.0385, -0.09); kbd.add(scr);
  [-0.42, -0.38].forEach((x) => { const wh = cyl(0.016, 0.016, 0.012, 24, mat.rubber); wh.rotation.z = Math.PI / 2; wh.position.set(x, 0.04, 0.03); kbd.add(wh); });
  for (let i = 0; i < 8; i++) { const pad = new THREE.Mesh(new RoundedBoxGeometry(0.028, 0.008, 0.028, 2, 0.004), i === 2 ? mat.led.clone() : mat.plasticBlack); pad.position.set(0.32 + (i % 4) * 0.034, 0.042, -0.02 + Math.floor(i / 4) * 0.034); kbd.add(pad); }
  // X-stand
  [-0.3, 0.3].forEach((x) => {
    [1, -1].forEach((s) => { const leg = cyl(0.012, 0.012, 0.95, 12, mat.blackMetal); leg.position.set(x, 0.4, 0); leg.rotation.z = s * 0.62; g.add(leg); const f = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.02, 0.36, 2, 0.008), mat.rubber); f.position.set(x + s * 0.27, 0.01, 0); g.add(f); });
    const arm = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.02, 0.38, 2, 0.008), mat.rubber); arm.position.set(x, 0.735, 0); g.add(arm);
  });
  const bolt = cyl(0.014, 0.014, 0.66, 12, mat.chrome); bolt.rotation.z = Math.PI / 2; bolt.position.y = 0.4; g.add(bolt);
  g.userData.parts = { whites, blacks, keyMap, kbd };
  return shadow(g);
}

/* ---------------- small mixer on a road case ---------------- */
export function mixer() {
  const g = new THREE.Group();
  // road case table
  const caseBox = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.62, 0.5, 3, 0.01), mat.tolex); caseBox.position.y = 0.31; g.add(caseBox);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => [0.0, 0.62].forEach((y) => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 10), mat.chrome); b.position.set(sx * 0.35, y || 0.01, sz * 0.25); g.add(b); }));
  const edgeGeo = new THREE.BoxGeometry(0.7, 0.014, 0.014);
  [-0.25, 0.25].forEach((z) => [0.007, 0.62].forEach((y) => { const e = new THREE.Mesh(edgeGeo, mat.steel); e.position.set(0, y, z); g.add(e); }));
  const sten = canvasTex(512, 256, (c, w, h) => { c.fillStyle = "rgba(240,236,228,.9)"; c.font = "400 90px 'Special Gothic Expanded One','Arial Black',sans-serif"; c.fillText("MMC", 30, 120); c.font = "600 34px 'IBM Plex Mono', monospace"; c.fillText("FOH · FRAGILE", 30, 180); c.globalCompositeOperation = "destination-out"; for (let i = 0; i < 1600; i++) { c.fillStyle = `rgba(0,0,0,${Math.random()})`; c.fillRect(Math.random() * w, Math.random() * h, 3, 3); } c.fillRect(125, 0, 10, h); });
  const st = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.2), new THREE.MeshStandardMaterial({ map: sten, transparent: true, roughness: 0.9 })); st.position.set(-0.08, 0.32, 0.251); g.add(st);
  // mixer desk: a slightly raked slab with channel strips on its face
  const desk = new THREE.Group(); desk.position.set(0, 0.625, 0.02); desk.rotation.x = 0.12; g.add(desk);
  const slab = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.05, 0.42, 3, 0.012), mat.blackMetal); slab.position.y = 0.025; desk.add(slab);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.47, 0.39), new THREE.MeshStandardMaterial({ map: canvasTex(512, 420, (c, w, h) => { c.fillStyle = "#1c1c1e"; c.fillRect(0, 0, w, h); noise(c, w, h, 10); c.strokeStyle = "rgba(255,255,255,.12)"; for (let i = 1; i < 10; i++) { c.beginPath(); c.moveTo(i * w / 10.5 + 8, 10); c.lineTo(i * w / 10.5 + 8, h - 10); c.stroke(); } c.fillStyle = "#e31e24"; c.fillRect(0, 0, w, 5); c.fillStyle = "#cfc8bb"; c.font = "600 13px 'IBM Plex Mono', monospace"; for (let i = 0; i < 10; i++) c.fillText(String(i + 1).padStart(2, "0"), 14 + i * w / 10.5, h - 14); }), roughness: 0.55, metalness: 0.4 }));
  face.rotation.x = -Math.PI / 2; face.position.y = 0.0505; desk.add(face);
  const surf = new THREE.Group(); surf.position.y = 0.051; desk.add(surf);
  const faderGeo = new RoundedBoxGeometry(0.014, 0.012, 0.022, 2, 0.003);
  const faders = new THREE.InstancedMesh(faderGeo, new THREE.MeshStandardMaterial({ color: 0x8c8780, roughness: 0.6 }), 10);
  const knobGeo = new THREE.CylinderGeometry(0.0062, 0.007, 0.012, 16);
  const knobs = new THREE.InstancedMesh(knobGeo, mat.plasticBlack, 40);
  const capGeo = new THREE.CylinderGeometry(0.0035, 0.0035, 0.002, 12);
  const caps = new THREE.InstancedMesh(capGeo, new THREE.MeshStandardMaterial({ color: 0xe31e24, roughness: 0.5 }), 40);
  const ledGeo = new THREE.BoxGeometry(0.007, 0.0025, 0.004);
  const leds = new THREE.InstancedMesh(ledGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), 80);
  const m = new THREE.Matrix4(), col = new THREE.Color();
  for (let i = 0; i < 10; i++) {
    const x = -0.205 + i * 0.0455;
    m.makeTranslation(x, 0.006, 0.12 - ((i * 37) % 9) * 0.008); faders.setMatrixAt(i, m);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.0012, 0.1), new THREE.MeshStandardMaterial({ color: 0x050505 })); slot.position.set(x, 0.0006, 0.115); surf.add(slot);
    for (let k = 0; k < 4; k++) { m.makeTranslation(x, 0.006, -0.17 + k * 0.045); knobs.setMatrixAt(i * 4 + k, m); m.makeTranslation(x, 0.0125, -0.17 + k * 0.045); caps.setMatrixAt(i * 4 + k, m); }
    for (let k = 0; k < 8; k++) { m.makeTranslation(x + 0.015, 0.0012, 0.09 - k * 0.008); leds.setMatrixAt(i * 8 + k, m); leds.setColorAt(i * 8 + k, col.set(k > 5 ? 0xff2020 : k > 3 ? 0xffaa00 : 0x30ff60)); }
  }
  surf.add(faders, knobs, caps, leds);
  g.userData.parts = { leds, faders };
  return shadow(g);
}

/* ---------------- drum throne / stool ---------------- */
export function stool(h = 0.55) {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.16, 0.08, 40), new THREE.MeshStandardMaterial({ color: 0x0f0f10, roughness: 0.6, bumpMap: mat.tolex.bumpMap, bumpScale: 0.3 }));
  seat.position.y = h; g.add(seat);
  const post = cyl(0.016, 0.016, h - 0.1, 12, mat.chrome); post.position.y = (h - 0.1) / 2 + 0.05; g.add(post);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const l = cyl(0.009, 0.009, 0.4, 10, mat.blackMetal); l.position.set(Math.cos(a) * 0.12, 0.1, Math.sin(a) * 0.12); l.lookAt(0, 0.28, 0); l.rotateX(Math.PI / 2); g.add(l); const f = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 6), mat.rubber); f.position.set(Math.cos(a) * 0.25, 0.006, Math.sin(a) * 0.25); g.add(f); }
  return shadow(g);
}
