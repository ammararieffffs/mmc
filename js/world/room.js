/* =====================================================================
   MMC v3 — room.js
   The rehearsal room: brick, concrete, foam, ceiling services, light
   rig, roller shutter, poster wall (real MMC photos), activity flyers,
   rug and the setlist on the floor monitor. Also builds the archive
   photo field used by the ROOM pedal chapter.
   ===================================================================== */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mat, pbrSet, canvasTex, noise } from "./materials.js";

export const ROOM = { w: 7.2, d: 6.4, h: 2.85 };
const cyl = (rt, rb, h, s, m) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, s), m);

export function buildRoom(tier) {
  const g = new THREE.Group();
  const { w, d, h } = ROOM;

  // ---- floor ----
  const fs = pbrSet("concrete_floor_worn_001", [3.2, 2.8]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ ...fs, color: 0x8b8580, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);

  // ---- walls (painted worn brick) ----
  const ws = pbrSet("painted_worn_brick", [3.4, 1.4]);
  const wallMat = new THREE.MeshStandardMaterial({ ...ws, color: 0x4a4746, roughness: 1 });
  const wsS = pbrSet("painted_worn_brick", [3.0, 1.4]);
  const wallMatS = new THREE.MeshStandardMaterial({ ...wsS, color: 0x4a4746, roughness: 1 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat); back.position.set(0, h / 2, -d / 2); back.receiveShadow = true; g.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(d, h), wallMatS); left.position.set(-w / 2, h / 2, 0); left.rotation.y = Math.PI / 2; left.receiveShadow = true; g.add(left);
  const right = new THREE.Mesh(new THREE.PlaneGeometry(d, h), wallMatS); right.position.set(w / 2, h / 2, 0); right.rotation.y = -Math.PI / 2; right.receiveShadow = true; g.add(right);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat); front.position.set(0, h / 2, d / 2); front.rotation.y = Math.PI; g.add(front);
  // skirting strip of black paint
  const skirtMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.9 });
  [[0, -d / 2 + 0.002, 0, w], [-w / 2 + 0.002, 0, Math.PI / 2, d], [w / 2 - 0.002, 0, -Math.PI / 2, d]].forEach(([x, z, ry, len]) => { const s = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.35), skirtMat); s.position.set(x, 0.175, z); s.rotation.y = ry; g.add(s); });

  // ---- ceiling + services ----
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 1 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = h; g.add(ceil);
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2b, metalness: 0.6, roughness: 0.55 });
  [[-1.8, 0.11], [-1.55, 0.07], [1.2, 0.09]].forEach(([x, r]) => { const p = cyl(r, r, d, 16, pipeMat); p.rotation.x = Math.PI / 2; p.position.set(x, h - r - 0.06, 0); g.add(p); for (let z = -d / 2 + 0.6; z < d / 2; z += 1.4) { const b = new THREE.Mesh(new THREE.TorusGeometry(r + 0.01, 0.008, 6, 16), mat.steel); b.position.set(x, h - r - 0.06, z); g.add(b); } });
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, d), mat.steel); tray.position.set(0.3, h - 0.18, 0); g.add(tray);

  // fluorescent fixtures (emissive tubes; area lights are added in world.js)
  const tubeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf2f6ff, emissiveIntensity: 2.4 });
  const fixtures = [];
  [[-1.6, 0.4], [1.0, -1.2], [1.0, 1.4]].forEach(([x, z]) => {
    const f = new THREE.Group(); f.position.set(x, h - 0.32, z); g.add(f);
    const housing = new THREE.Mesh(new RoundedBoxGeometry(1.25, 0.06, 0.16, 2, 0.01), new THREE.MeshStandardMaterial({ color: 0xd8d6d0, roughness: 0.6, metalness: 0.2 })); f.add(housing);
    [-0.035, 0.035].forEach((oz) => { const t = cyl(0.014, 0.014, 1.18, 12, tubeMat); t.rotation.z = Math.PI / 2; t.position.set(0, -0.04, oz); f.add(t); });
    [-1, 1].forEach((s) => { const ch = cyl(0.002, 0.002, 0.26, 4, mat.steel); ch.position.set(s * 0.5, 0.15, 0); f.add(ch); });
    fixtures.push(f);
  });

  // lighting bar with PAR cans + haze beams
  const bar = cyl(0.025, 0.025, 3.2, 12, mat.blackMetal); bar.rotation.z = Math.PI / 2; bar.position.set(0.2, h - 0.5, 0.3); g.add(bar);
  const pars = [];
  const beamMat = (color) => new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = uv.y; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float edge = pow(abs(dot(vN, vV)), 1.6); float fade = smoothstep(0.0, 0.9, vY); gl_FragColor = vec4(uColor, edge * fade * uOpacity * 0.42); }`,
  });
  [[-1.0, 0xff1a22, [-0.4, 0, 1.0]], [-0.2, 0xffb36b, [0.5, 0.0, -1.6]], [0.7, 0xff1a22, [0.6, 0, -1.9]], [1.5, 0xfff0e0, [-0.3, 0, 1.3]]].forEach(([x, color, target]) => {
    const can = new THREE.Group(); can.position.set(x, h - 0.6, 0.3); g.add(can);
    const body = cyl(0.07, 0.085, 0.24, 20, mat.blackMetal); can.add(body);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.068, 24), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0 })); lens.position.y = -0.121; lens.rotation.x = Math.PI / 2; can.add(lens);
    const yoke = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.008, 6, 16, Math.PI), mat.blackMetal); yoke.rotation.z = Math.PI; can.add(yoke);
    const t = new THREE.Vector3(...target);
    can.lookAt(t); can.rotateX(-Math.PI / 2);
    // beam cone (length to target)
    const len = can.position.distanceTo(t);
    const coneGeo = new THREE.CylinderGeometry(0.07, 0.55, len, 32, 1, true); coneGeo.translate(0, -len / 2 - 0.12, 0);
    const beam = new THREE.Mesh(coneGeo, beamMat(color)); can.add(beam);
    pars.push({ can, lens, beam, color, target: t });
  });

  // ---- acoustic foam (instanced wedges) ----
  const wedge = new THREE.ConeGeometry(0.075, 0.09, 4, 1); wedge.rotateY(Math.PI / 4); wedge.rotateX(Math.PI / 2);
  const panels = [];
  for (let i = 0; i < 6; i++) panels.push({ x: -3.0 + i * 0.66, y: 2.25, z: -d / 2 + 0.03, ry: 0 });
  for (let i = 0; i < 5; i++) panels.push({ x: w / 2 - 0.03, y: 1.95, z: -2.4 + i * 0.66, ry: -Math.PI / 2 });
  for (let i = 0; i < 3; i++) panels.push({ x: w / 2 - 0.03, y: 1.29, z: -2.4 + i * 0.66, ry: -Math.PI / 2 });
  const perPanel = tier === "low" ? 9 : 16, side = Math.sqrt(perPanel);
  const foamMat = new THREE.MeshStandardMaterial({ color: 0x1d1c1e, roughness: 1, map: mat.foam.map });
  const inst = new THREE.InstancedMesh(wedge, foamMat, panels.length * perPanel);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  let k = 0;
  panels.forEach((pn) => {
    q.setFromEuler(new THREE.Euler(0, pn.ry, 0));
    for (let a = 0; a < side; a++) for (let b = 0; b < side; b++) {
      const off = new THREE.Vector3((a - (side - 1) / 2) * (0.6 / side), (b - (side - 1) / 2) * (0.6 / side), 0.045).applyQuaternion(q);
      p.set(pn.x, pn.y, pn.z).add(off);
      const rq = q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, (a + b) % 2 ? Math.PI / 2 : 0)));
      m4.compose(p, rq, s.set(side === 3 ? 1.33 : 1, side === 3 ? 1.33 : 1, 1)); inst.setMatrixAt(k++, m4);
    }
  });
  inst.castShadow = false; inst.receiveShadow = true; g.add(inst);
  panels.forEach((pn) => { const bk = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), foamMat); bk.position.set(pn.x, pn.y, pn.z); bk.rotation.y = pn.ry; bk.translateZ(0.002); g.add(bk); });

  // ---- roller shutter (left wall) with stencil ----
  const shs = pbrSet("painted_metal_shutter", [1, 2.2]);
  const shutter = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.3), new THREE.MeshStandardMaterial({ ...shs, color: 0x6b6a68, metalness: 0.5, roughness: 0.8 }));
  shutter.position.set(-w / 2 + 0.02, 1.15, 0.9); shutter.rotation.y = Math.PI / 2; g.add(shutter);
  const boxTop = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 2.6), mat.blackMetal); boxTop.position.set(-w / 2 + 0.11, 2.42, 0.9); g.add(boxTop);
  const stencil = canvasTex(1024, 1024, (c, W, H) => {
    c.clearRect(0, 0, W, H);
    c.fillStyle = "rgba(242,238,230,0.9)"; c.font = "400 210px 'Special Gothic Expanded One','Arial Black',sans-serif"; c.textAlign = "center";
    c.fillText("THIS IS", W / 2, 360); c.fillStyle = "rgba(227,30,36,0.92)"; c.font = "400 330px 'Special Gothic Expanded One','Arial Black',sans-serif"; c.fillText("MMC.", W / 2, 680);
    c.fillStyle = "rgba(242,238,230,0.85)"; c.font = "600 56px 'IBM Plex Mono', monospace"; c.fillText("TURN UP · STAND OUT · MAKE NOISE", W / 2, 800);
    c.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(0,0,0,${Math.random() * 0.9})`; c.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 3, 2); }
    [180, 430, 640, 860].forEach((x) => c.fillRect(x, 0, 12, H));
    for (let i = 0; i < 30; i++) { c.fillStyle = "rgba(0,0,0,0.6)"; c.fillRect(Math.random() * W, 680 + Math.random() * 60, 3, 40 + Math.random() * 120); } // drips mask
  });
  const st = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.0), new THREE.MeshStandardMaterial({ map: stencil, transparent: true, roughness: 0.85, depthWrite: false }));
  st.position.set(-w / 2 + 0.03, 1.25, 0.9); st.rotation.y = Math.PI / 2; g.add(st);

  // ---- rug under the kit ----
  const rs = pbrSet("dirty_carpet", [2, 1.6]);
  const rug = new THREE.Mesh(new RoundedBoxGeometry(2.6, 0.012, 2.1, 2, 0.004), new THREE.MeshStandardMaterial({ ...rs, color: 0x5a1416, roughness: 1 }));
  rug.position.set(0.5, 0.006, -1.95); rug.receiveShadow = true; g.add(rug);

  // ---- power strip + extension reel ----
  const strip = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.035, 0.06, 2, 0.008), mat.plasticBlack); strip.position.set(-0.9, 0.018, 0.4); strip.rotation.y = 0.3; g.add(strip);
  const sw = new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.012, 0.02, 2, 0.003), mat.led.clone()); sw.material.emissiveIntensity = 2; sw.position.set(-1.04, 0.04, 0.45); sw.rotation.y = 0.3; g.add(sw);
  const reel = new THREE.Group(); reel.position.set(2.9, 0, 2.4); g.add(reel);
  const drumR = cyl(0.14, 0.14, 0.12, 32, new THREE.MeshStandardMaterial({ color: 0xb3121a, roughness: 0.5 })); drumR.rotation.x = Math.PI / 2; drumR.position.y = 0.16; reel.add(drumR);
  const coil = cyl(0.12, 0.12, 0.125, 32, new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6, bumpMap: mat.rubber.roughnessMap, bumpScale: 1 })); coil.rotation.x = Math.PI / 2; coil.position.y = 0.16; reel.add(coil);

  g.traverse((o) => { if (o.isMesh && !o.material.transparent) o.receiveShadow = true; });
  return { group: g, fixtures, pars, shutter, stencil: st, tubeMat };
}

/* ---- poster wall: real MMC photos as wheat-pasted prints ---- */
export function posterWall(photoUrls) {
  const g = new THREE.Group();
  const tl = new THREE.TextureLoader();
  const tape = new THREE.MeshStandardMaterial({ color: 0xd8d0bc, roughness: 0.85, transparent: true, opacity: 0.92 });
  const spots = [
    [1.15, 1.55, 0.62, -2], [1.85, 1.75, 0.5, 3], [2.55, 1.5, 0.66, -1.5], [3.15, 1.8, 0.42, 2.5],
    [1.45, 1.0, 0.48, 1.5], [2.15, 1.05, 0.58, -2.5], [2.85, 1.02, 0.5, 1],
  ];
  const prints = [];
  spots.forEach(([x, y, size, rot], i) => {
    const url = photoUrls[i % photoUrls.length];
    const t = tl.load(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const aspect = 508 / 800;
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(size + 0.04, size * aspect + 0.04), new THREE.MeshStandardMaterial({ color: 0xe9e3d6, roughness: 0.9 }));
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(size, size * aspect), new THREE.MeshStandardMaterial({ map: t, roughness: 0.75 }));
    photo.position.z = 0.002;
    const grp = new THREE.Group(); grp.add(paper, photo);
    grp.position.set(x, y, -ROOM.d / 2 + 0.02 + i * 0.001); grp.rotation.z = (rot * Math.PI) / 180;
    [[-1, 1], [1, 1]].forEach(([sx, sy]) => { const tp = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.025), tape); tp.position.set(sx * (size / 2), sy * (size * aspect / 2), 0.004); tp.rotation.z = sx * 0.6; grp.add(tp); });
    g.add(grp); prints.push(grp);
  });
  return { group: g, prints };
}

/* ---- activity flyers (ECHO chapter): screen-printed gig-style sheets ---- */
export function flyerWall(items) {
  const g = new THREE.Group();
  const flyers = [];
  items.forEach((it, i) => {
    const t = canvasTex(600, 840, (c, W, H) => {
      const dark = i % 2 === 0;
      c.fillStyle = dark ? "#121112" : "#e9e2d2"; c.fillRect(0, 0, W, H); noise(c, W, H, 26);
      c.fillStyle = "#e31e24"; c.fillRect(0, 0, W, 18); c.fillRect(0, H - 18, W, 18);
      c.fillStyle = dark ? "#efe9dc" : "#111";
      c.font = "600 30px 'IBM Plex Mono', monospace"; c.fillText(`MMC · 0${i + 1}`, 40, 80);
      c.font = "400 74px 'Special Gothic Expanded One','Arial Black',sans-serif";
      it.title.split(" ").reduce((y, word) => { c.fillText(word, 40, y); return y + 84; }, 230);
      c.fillStyle = "#e31e24"; c.font = "italic 46px 'Instrument Serif', Georgia, serif"; c.fillText(it.tag, 40, H - 120);
      c.globalAlpha = 0.18; c.fillStyle = dark ? "#fff" : "#000"; for (let k = 0; k < 40; k++) c.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 3, 30 + Math.random() * 120);
    });
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.59), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, side: THREE.DoubleSide }));
    const col = i % 3, row = Math.floor(i / 3);
    fl.position.set(ROOM.w / 2 - 0.02 - i * 0.0005, 1.05 + row * 0.66, 0.95 + col * 0.5);
    fl.rotation.y = -Math.PI / 2; fl.rotation.z = (Math.random() - 0.5) * 0.08;
    g.add(fl); flyers.push(fl);
  });
  return { group: g, flyers };
}

/* ---- setlist taped to the monitor (events) ---- */
export function setlistSheet(lines) {
  const t = canvasTex(600, 820, (c, W, H) => {
    c.fillStyle = "#f2eee6"; c.fillRect(0, 0, W, H); noise(c, W, H, 14);
    c.fillStyle = "#111"; c.font = "700 50px 'Familjen Grotesk', sans-serif"; c.fillText("SETLIST", 40, 90);
    c.fillStyle = "#e31e24"; c.fillRect(40, 108, 240, 6);
    c.fillStyle = "#151515"; c.font = "500 40px 'Familjen Grotesk', sans-serif";
    lines.forEach((l, i) => c.fillText(l, 40, 200 + i * 64));
    c.strokeStyle = "#e31e24"; c.lineWidth = 5; c.beginPath(); c.moveTo(36, 186 + lines.length * 64); c.lineTo(W - 60, 196 + lines.length * 64); c.stroke();
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.29), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
}

/* ---- archive photo field (ROOM pedal): prints floating in the dark ---- */
export function archiveField(photos) {
  const g = new THREE.Group(); g.visible = false;
  const tl = new THREE.TextureLoader();
  const items = [];
  photos.forEach((ph, i) => {
    const t = tl.load(ph.src); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const aspect = ph.h / ph.w, W = 0.62;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(W + 0.035, W * aspect + 0.035, 0.004), new THREE.MeshStandardMaterial({ color: 0xece6da, roughness: 0.85, transparent: true }));
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(W, W * aspect), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7, transparent: true, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.18 }));
    pic.position.z = 0.0025;
    const grp = new THREE.Group(); grp.add(frame, pic);
    // a corridor of prints along -z the camera flies through
    const side = i % 2 ? 1 : -1;
    grp.position.set(side * (0.55 + (i % 3) * 0.22), 1.15 + ((i * 37) % 5) * 0.12, 2.2 - i * 0.42);
    grp.rotation.y = -side * 0.45; grp.rotation.z = ((i * 13) % 7 - 3) * 0.02;
    grp.userData = { index: i, cat: ph.cat, home: grp.position.clone(), rot: grp.rotation.clone(), mats: [frame.material, pic.material] };
    pic.userData.photo = i;
    g.add(grp); items.push(grp);
  });
  return { group: g, items };
}
