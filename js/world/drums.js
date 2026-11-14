/* =====================================================================
   MMC v3 — drums.js
   A five-piece kit with hardware. Shells use lathe hoops, instanced
   lugs and tension rods; cymbals are lathe profiles with a lathe-cut
   brass texture. Parts are exposed for hit animations.
   ===================================================================== */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mat, canvasTex, noise } from "./materials.js";

const cyl = (rt, rb, h, s, m, open = false) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, s, 1, open), m);
const shadow = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };

/* A drum along local Y (top head at +y) */
function drum(r, depth, { lugs = 8, frontMat = mat.drumHead, backMat = mat.drumHead } = {}) {
  const g = new THREE.Group();
  const shell = cyl(r, r, depth, 64, mat.drumWrap, true); g.add(shell);
  const inner = cyl(r * 0.995, r * 0.995, depth, 48, new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.9, side: THREE.BackSide }), true); g.add(inner);
  const headGeo = new THREE.CircleGeometry(r * 0.985, 64);
  const top = new THREE.Mesh(headGeo, frontMat); top.rotation.x = -Math.PI / 2; top.position.y = depth / 2 + 0.004; g.add(top);
  const bot = new THREE.Mesh(headGeo, backMat); bot.rotation.x = Math.PI / 2; bot.position.y = -depth / 2 - 0.004; g.add(bot);
  // hoops (lathe profile gives a flanged look)
  const hoopProf = [[r * 1.0, -0.006], [r * 1.02, -0.006], [r * 1.025, 0.004], [r * 1.018, 0.012], [r * 1.004, 0.012]].map((p) => new THREE.Vector2(p[0], p[1]));
  const hoopGeo = new THREE.LatheGeometry(hoopProf, 72);
  const h1 = new THREE.Mesh(hoopGeo, mat.chrome); h1.position.y = depth / 2 - 0.002; g.add(h1);
  const h2 = new THREE.Mesh(hoopGeo, mat.chrome); h2.rotation.x = Math.PI; h2.position.y = -depth / 2 + 0.002; g.add(h2);
  // lugs + rods (instanced)
  const lugGeo = new RoundedBoxGeometry(0.018, Math.min(0.07, depth * 0.35), 0.016, 2, 0.006);
  const rodGeo = new THREE.CylinderGeometry(0.0022, 0.0022, depth * 0.32, 8);
  const lugsM = new THREE.InstancedMesh(lugGeo, mat.chrome, lugs * 2);
  const rodsM = new THREE.InstancedMesh(rodGeo, mat.chrome, lugs * 2);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  for (let i = 0; i < lugs; i++) {
    const a = (i / lugs) * Math.PI * 2;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a);
    [1, -1].forEach((sy, j) => {
      p.set(Math.cos(a) * (r + 0.009), sy * depth * 0.2, Math.sin(a) * (r + 0.009)); m.compose(p, q, s); lugsM.setMatrixAt(i * 2 + j, m);
      p.set(Math.cos(a) * (r + 0.016), sy * depth * 0.36, Math.sin(a) * (r + 0.016)); m.compose(p, q, s); rodsM.setMatrixAt(i * 2 + j, m);
    });
  }
  g.add(lugsM, rodsM);
  g.userData.head = top; g.userData.dynamic = true;
  return g;
}

function cymbal(r, { thick = 0.003 } = {}) {
  const prof = [[0.0, 0.035], [0.012, 0.034], [0.03, 0.03], [0.05, 0.016], [0.06, 0.012], [r * 0.6, 0.006], [r, 0.0], [r, -thick], [r * 0.6, 0.006 - thick], [0.06, 0.012 - thick], [0.05, 0.016 - thick], [0.03, 0.03 - thick], [0.012, 0.034 - thick], [0.0, 0.035 - thick]].map((pt) => new THREE.Vector2(pt[0], pt[1]));
  const geo = new THREE.LatheGeometry(prof, 96);
  // planar UVs so the lathe-cut texture reads as rings
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / (2 * r) + 0.5, pos.getZ(i) / (2 * r) + 0.5);
  const c = new THREE.Mesh(geo, mat.cymbal);
  const nut = cyl(0.009, 0.012, 0.02, 12, mat.blackMetal); nut.position.y = 0.045;
  const fl = cyl(0.016, 0.016, 0.006, 16, mat.rubber); fl.position.y = 0.038;
  const g = new THREE.Group(); g.add(c, nut, fl);
  g.userData.disc = c; g.userData.dynamic = true;
  return g;
}

function tripod(h, spread = 0.22) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const leg = cyl(0.008, 0.008, 0.36, 10, mat.steel);
    leg.position.set(Math.cos(a) * spread * 0.5, 0.11, Math.sin(a) * spread * 0.5);
    leg.lookAt(0, 0.24, 0); leg.rotateX(Math.PI / 2); g.add(leg);
    const foot = cyl(0.012, 0.014, 0.012, 12, mat.rubber); foot.position.set(Math.cos(a) * spread, 0.006, Math.sin(a) * spread); g.add(foot);
  }
  const t = cyl(0.012, 0.012, h - 0.2, 12, mat.steel); t.position.y = 0.2 + (h - 0.2) / 2; g.add(t);
  const clamp = cyl(0.018, 0.018, 0.03, 12, mat.blackMetal); clamp.position.y = 0.22; g.add(clamp);
  return g;
}

export function drumKit() {
  const kit = new THREE.Group();
  const parts = {};

  // --- kick (axis along z) ---
  const logo = canvasTex(1024, 1024, (c, w, h) => {
    c.fillStyle = "#111"; c.fillRect(0, 0, w, h); noise(c, w, h, 12);
    c.fillStyle = "#e31e24"; c.beginPath(); c.arc(w / 2, h / 2, 330, 0, 7); c.fill();
    c.fillStyle = "#f2ede4"; c.font = "400 220px 'Special Gothic Expanded One','Arial Black',sans-serif"; c.textAlign = "center"; c.fillText("MMC", w / 2, h / 2 + 70);
    c.font = "600 50px 'IBM Plex Mono', monospace"; c.fillText("MSU MUSIC CLUB", w / 2, h / 2 + 170);
    c.globalCompositeOperation = "destination-out"; c.beginPath(); c.arc(w / 2 + 200, h / 2 + 260, 46, 0, 7); c.fill(); // port hole
  });
  const frontHead = new THREE.MeshStandardMaterial({ map: logo, roughness: 0.55, transparent: true, alphaTest: 0.5 });
  const kick = drum(0.28, 0.4, { lugs: 10, frontMat: frontHead, backMat: mat.drumHeadBlack });
  kick.rotation.x = Math.PI / 2; kick.position.set(0, 0.29, 0); kit.add(kick);
  parts.kick = kick;
  // spurs
  [-1, 1].forEach((s) => { const sp = cyl(0.007, 0.007, 0.32, 8, mat.steel); sp.position.set(s * 0.26, 0.1, 0.12); sp.rotation.z = s * 0.7; kit.add(sp); });
  // kick pedal + beater (behind kick, toward drummer at -z)
  const pedal = new THREE.Group(); pedal.position.set(0, 0, -0.32); kit.add(pedal);
  const plate = new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.012, 0.26, 2, 0.004), mat.steel); plate.position.set(0, 0.012, -0.08); plate.rotation.x = 0.18; pedal.add(plate);
  const frame = cyl(0.008, 0.008, 0.2, 8, mat.blackMetal); frame.position.set(0.05, 0.1, 0.03); pedal.add(frame);
  const frame2 = frame.clone(); frame2.position.x = -0.05; pedal.add(frame2);
  const beaterArm = new THREE.Group(); beaterArm.position.set(0, 0.17, 0.04); pedal.add(beaterArm);
  const shaft = cyl(0.004, 0.004, 0.17, 8, mat.chrome); shaft.position.y = 0.085; beaterArm.add(shaft);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 12), new THREE.MeshStandardMaterial({ color: 0xece6da, roughness: 0.9 })); head.position.y = 0.17; beaterArm.add(head);
  beaterArm.rotation.x = -0.35; beaterArm.userData.dynamic = true; parts.beater = beaterArm;

  // --- rack tom on kick mount ---
  const mount = cyl(0.012, 0.012, 0.22, 10, mat.steel); mount.position.set(0.0, 0.62, 0.05); mount.rotation.z = 0.0; kit.add(mount);
  const tom = drum(0.15, 0.19, { lugs: 6 }); tom.position.set(-0.18, 0.77, -0.02); tom.rotation.set(-0.38, 0, 0.12); kit.add(tom); parts.tom = tom;
  const arm = cyl(0.009, 0.009, 0.2, 10, mat.steel); arm.position.set(-0.09, 0.72, 0.02); arm.rotation.z = 1.0; kit.add(arm);

  // --- floor tom with legs ---
  const ft = drum(0.2, 0.36, { lugs: 8 }); ft.position.set(-0.52, 0.47, -0.42); ft.rotation.set(-0.08, 0, 0.04); kit.add(ft); parts.floor = ft;
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + 0.4; const l = cyl(0.007, 0.007, 0.36, 8, mat.steel); l.position.set(-0.52 + Math.cos(a) * 0.24, 0.17, -0.42 + Math.sin(a) * 0.24); l.rotation.set(Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18); kit.add(l); }

  // --- snare on stand ---
  const snStand = tripod(0.56, 0.2); snStand.position.set(0.36, 0, -0.5); kit.add(snStand);
  const basket = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.005, 6, 3), mat.chrome); basket.rotation.x = Math.PI / 2; basket.position.set(0.36, 0.58, -0.5); kit.add(basket);
  const snare = drum(0.18, 0.14, { lugs: 10 }); snare.position.set(0.36, 0.66, -0.5); snare.rotation.set(-0.1, 0, -0.06); kit.add(snare); parts.snare = snare;
  const throw_ = new THREE.Mesh(new RoundedBoxGeometry(0.02, 0.05, 0.012, 2, 0.004), mat.chrome); throw_.position.set(0.36 + 0.19, 0.66, -0.5); kit.add(throw_);

  // --- hi-hat ---
  const hh = tripod(0.86, 0.22); hh.position.set(0.68, 0, -0.42); kit.add(hh);
  const hhPedal = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.012, 0.24, 2, 0.004), mat.steel); hhPedal.position.set(0.68, 0.03, -0.62); hhPedal.rotation.x = 0.16; kit.add(hhPedal);
  const hhBot = cymbal(0.18); hhBot.position.set(0.68, 0.84, -0.42); hhBot.rotation.x = Math.PI; kit.add(hhBot);
  const hhTop = cymbal(0.18); hhTop.position.set(0.68, 0.86, -0.42); kit.add(hhTop); parts.hat = hhTop;
  const rod = cyl(0.004, 0.004, 0.16, 8, mat.chrome); rod.position.set(0.68, 0.92, -0.42); kit.add(rod);

  // --- crash (boom) ---
  const crStand = tripod(1.15, 0.24); crStand.position.set(-0.42, 0, 0.18); kit.add(crStand);
  const boom = cyl(0.009, 0.009, 0.42, 10, mat.steel); boom.position.set(-0.32, 1.27, 0.12); boom.rotation.z = -1.1; kit.add(boom);
  const crash = cymbal(0.22); crash.position.set(-0.17, 1.36, 0.06); crash.rotation.set(0.3, 0, 0.32); kit.add(crash); parts.crash = crash;

  // --- ride ---
  const rdStand = tripod(1.0, 0.24); rdStand.position.set(-0.86, 0, -0.12); kit.add(rdStand);
  const ride = cymbal(0.26, { thick: 0.0035 }); ride.position.set(-0.84, 1.07, -0.18); ride.rotation.set(0.12, 0, -0.28); kit.add(ride); parts.ride = ride;

  // --- sticks resting on snare ---
  const stickMat = new THREE.MeshStandardMaterial({ map: mat.maple.map, roughness: 0.6 });
  [-0.02, 0.025].forEach((o, i) => { const st = cyl(0.0065, 0.0075, 0.41, 12, stickMat); st.rotation.set(Math.PI / 2, 0, 0.9 + i * 0.12); st.position.set(0.34 + o, 0.745, -0.5 + o); kit.add(st); });

  kit.userData.parts = parts;
  return shadow(kit);
}
