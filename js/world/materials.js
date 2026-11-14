/* =====================================================================
   MMC v3 — materials.js
   Shared PBR materials + procedural canvas textures for every model.
   CC0 photographic textures (Poly Haven) are loaded for large surfaces;
   small gear uses procedural maps so it costs no downloads.
   ===================================================================== */
import * as THREE from "three";

const cache = new Map();
export const disposables = [];
const keep = (o) => (disposables.push(o), o);

/* ---------- canvas helpers ---------- */
export function canvasTex(w, h, draw, { srgb = true, repeat = null, aniso = 8 } = {}) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return keep(t);
}
export function noise(g, w, h, amt, mono = true) {
  const d = g.getImageData(0, 0, w, h), a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    const n = (Math.random() - 0.5) * amt;
    a[i] += n; a[i + 1] += mono ? n : (Math.random() - 0.5) * amt; a[i + 2] += mono ? n : (Math.random() - 0.5) * amt;
  }
  g.putImageData(d, 0, 0);
}
function scratches(g, w, h, n, alpha = 0.12, light = true) {
  for (let i = 0; i < n; i++) {
    g.strokeStyle = light ? `rgba(255,255,255,${Math.random() * alpha})` : `rgba(0,0,0,${Math.random() * alpha})`;
    g.lineWidth = 0.5 + Math.random() * 1.5;
    g.beginPath();
    const x = Math.random() * w, y = Math.random() * h;
    g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * w * 0.15, y + (Math.random() - 0.5) * h * 0.05);
    g.stroke();
  }
}

/* ---------- photographic CC0 textures ---------- */
const loader = new THREE.TextureLoader();
export function pbrSet(name, repeat = [1, 1], base = "assets/textures/") {
  const key = name + repeat.join("x");
  if (cache.has(key)) return cache.get(key);
  const ld = (m, srgb) => {
    const t = loader.load(`${base}${name}_${m}.webp`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return keep(t);
  };
  const set = { map: ld("diff", true), normalMap: ld("nor_gl"), roughnessMap: ld("rough") };
  cache.set(key, set);
  return set;
}

/* ---------- procedural maps used by gear ---------- */
export const tex = {};
export function buildProceduralTextures() {
  tex.flake = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#6a6a6a"; g.fillRect(0, 0, w, h); noise(g, w, h, 46);
    scratches(g, w, h, 120, 0.3);
  }, { srgb: false, repeat: [2, 2] });

  tex.brushed = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#808080"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1600; i++) {
      const v = Math.random() > 0.5 ? 255 : 0;
      g.strokeStyle = `rgba(${v},${v},${v},0.05)`;
      g.beginPath(); const y = Math.random() * h; g.moveTo(0, y); g.lineTo(w, y + (Math.random() - 0.5) * 2); g.stroke();
    }
  }, { srgb: false });

  tex.maple = canvasTex(512, 2048, (g, w, h) => {
    g.fillStyle = "#c79a5c"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      g.strokeStyle = `rgba(${90 + Math.random() * 40},${55 + Math.random() * 25},20,${0.06 + Math.random() * 0.16})`;
      g.lineWidth = 1 + Math.random() * 3; g.beginPath();
      let x = Math.random() * w; g.moveTo(x, 0);
      for (let y = 0; y < h; y += 40) { x += (Math.random() - 0.5) * 6; g.lineTo(x, y); }
      g.stroke();
    }
    noise(g, w, h, 16);
  });

  tex.rosewood = canvasTex(256, 2048, (g, w, h) => {
    g.fillStyle = "#2a1a12"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 170; i++) {
      g.strokeStyle = `rgba(8,4,2,${0.2 + Math.random() * 0.35})`; g.lineWidth = 1 + Math.random() * 2; g.beginPath();
      let x = Math.random() * w; g.moveTo(x, 0);
      for (let y = 0; y < h; y += 30) { x += (Math.random() - 0.5) * 4; g.lineTo(x, y); }
      g.stroke();
    }
    noise(g, w, h, 12);
  });

  tex.tolex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#151515"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 14000; i++) {
      g.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.35)";
      g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 0.6 + Math.random() * 1.8, 0, 7); g.fill();
    }
    scratches(g, w, h, 40, 0.15);
  }, { repeat: [3, 3] });
  tex.tolexBump = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#808080"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = `rgba(${Math.random() > 0.5 ? 255 : 0},0,0,0.25)`;
      g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 2.5, 0, 7); g.fill();
    }
  }, { srgb: false, repeat: [3, 3] });

  tex.grille = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#1b1a18"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 4) { g.fillStyle = y % 8 ? "#2c2a26" : "#3a3731"; g.fillRect(0, y, w, 2); }
    for (let x = 0; x < w; x += 4) { g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(x, 0, 1, h); }
    noise(g, w, h, 14);
  }, { repeat: [4, 4] });

  tex.perforated = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#fff"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#000";
    for (let y = 8; y < h; y += 16) for (let x = (y / 16) % 2 ? 16 : 8; x < w; x += 16) { g.beginPath(); g.arc(x, y, 5.2, 0, 7); g.fill(); }
  }, { srgb: false, repeat: [6, 3] });

  tex.wovenMesh = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, w, h); g.strokeStyle = "#fff"; g.lineWidth = 3;
    for (let i = -w; i < w * 2; i += 13) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke();
      g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke();
    }
  }, { srgb: false, repeat: [7, 3] });

  tex.foam = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = "#232224"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.45})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, Math.random() * 1.8, 0, 7); g.fill(); }
  }, { repeat: [2, 2] });

  tex.drumWrap = canvasTex(1024, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, 0);
    grd.addColorStop(0, "#5c0609"); grd.addColorStop(0.5, "#8d0b10"); grd.addColorStop(1, "#5c0609");
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(255,${120 + Math.random() * 100},${100 + Math.random() * 60},${Math.random() * 0.22})`; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
  });

  tex.drumHead = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#e9e4d8"; g.fillRect(0, 0, w, h); noise(g, w, h, 18);
    const grd = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
    grd.addColorStop(0, "rgba(120,110,95,0.35)"); grd.addColorStop(0.35, "rgba(0,0,0,0)");
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    scratches(g, w, h, 80, 0.18, false);
  });

  tex.cymbal = canvasTex(1024, 1024, (g, w, h) => {
    const cx = w / 2, cy = h / 2;
    g.fillStyle = "#a07a3a"; g.fillRect(0, 0, w, h);
    for (let r = 4; r < w / 2; r += 2.2) {
      g.strokeStyle = `rgba(${r % 6.6 < 2.2 ? 255 : 40},${r % 6.6 < 2.2 ? 220 : 25},${r % 6.6 < 2.2 ? 150 : 5},${0.12 + Math.random() * 0.1})`;
      g.lineWidth = 1.2; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
    }
    for (let i = 0; i < 360; i += 1.5) {
      g.strokeStyle = "rgba(0,0,0,0.04)"; g.beginPath(); g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(i * Math.PI / 180) * w, cy + Math.sin(i * Math.PI / 180) * w); g.stroke();
    }
  });

  tex.rubber = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#808080"; g.fillRect(0, 0, w, h); noise(g, w, h, 60); }, { srgb: false, repeat: [8, 1] });
}

/* ---------- material library ---------- */
export const mat = {};
export function buildMaterials() {
  buildProceduralTextures();
  const P = (o) => keep(new THREE.MeshPhysicalMaterial(o));
  const S = (o) => keep(new THREE.MeshStandardMaterial(o));

  mat.chrome = S({ color: 0xd8d8d8, metalness: 1, roughness: 0.2, roughnessMap: tex.brushed });
  mat.nickel = S({ color: 0xbdb9b0, metalness: 1, roughness: 0.26 });
  mat.steel = S({ color: 0x8a8a8c, metalness: 1, roughness: 0.45, roughnessMap: tex.brushed });
  mat.blackMetal = S({ color: 0x111112, metalness: 0.7, roughness: 0.42, roughnessMap: tex.flake });
  mat.brass = S({ color: 0xc9a25a, metalness: 1, roughness: 0.32 });
  mat.cymbal = S({ map: tex.cymbal, metalness: 1, roughness: 0.3, color: 0xffe2a8 });

  mat.redLacquer = P({ color: 0x7a070b, roughness: 0.3, roughnessMap: tex.flake, clearcoat: 1, clearcoatRoughness: 0.06, sheen: 0.25, sheenColor: new THREE.Color(0xff3434) });
  mat.boneLacquer = P({ color: 0xe8e1d1, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08 });
  mat.blackLacquer = P({ color: 0x0b0b0c, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });
  mat.pickguard = P({ color: 0x070707, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1 });
  mat.pearl = P({ color: 0xf2eee2, roughness: 0.25, clearcoat: 0.6, iridescence: 0.35 });

  mat.maple = P({ map: tex.maple, roughness: 0.5, clearcoat: 0.45, clearcoatRoughness: 0.3 });
  mat.rosewood = S({ map: tex.rosewood, roughness: 0.75 });

  mat.plasticBlack = S({ color: 0x141414, roughness: 0.52 });
  mat.plasticCream = S({ color: 0xe9e3d3, roughness: 0.45 });
  mat.rubber = S({ color: 0x0c0c0c, roughness: 0.8, roughnessMap: tex.rubber });
  mat.cable = S({ color: 0x0a0a0a, roughness: 0.55 });
  mat.cableRed = S({ color: 0x6d0a0d, roughness: 0.5 });

  mat.tolex = S({ map: tex.tolex, bumpMap: tex.tolexBump, bumpScale: 0.6, roughness: 0.72 });
  mat.grille = S({ map: tex.grille, roughness: 0.95 });
  mat.foam = S({ map: tex.foam, roughness: 1, bumpMap: tex.foam, bumpScale: 1.5 });
  mat.drumWrap = P({ map: tex.drumWrap, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05, metalness: 0.15 });
  mat.drumHead = S({ map: tex.drumHead, roughness: 0.6 });
  mat.drumHeadBlack = S({ color: 0x161616, roughness: 0.4 });

  mat.led = S({ color: 0xff2a2a, emissive: 0xff1414, emissiveIntensity: 0 });
  mat.ledGreen = S({ color: 0x66ff88, emissive: 0x33ff66, emissiveIntensity: 2.2 });
  mat.screen = S({ color: 0x0a0a0a, emissive: 0xff2a2a, emissiveIntensity: 0.6, roughness: 0.3 });
  return mat;
}

/* Silkscreened pedal face: label + knob legends + wear. */
export function pedalFaceTex({ name, sub, knobs, bg, fg, accent }) {
  return canvasTex(512, 880, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); noise(g, w, h, 20);
    g.fillStyle = fg; g.font = "600 26px 'IBM Plex Mono', monospace"; g.textAlign = "center";
    const xs = knobs.length === 4 ? [70, 190, 322, 442] : knobs.length === 2 ? [150, 362] : [90, 256, 422];
    knobs.forEach((k, i) => g.fillText(k, xs[i], 260));
    g.font = `400 ${name.length > 6 ? 92 : 118}px 'Special Gothic Expanded One', 'Arial Black', Impact, sans-serif`;
    g.fillText(name, w / 2, 520);
    g.font = "600 28px 'IBM Plex Mono', monospace"; g.fillStyle = accent; g.fillText(sub, w / 2, 575);
    g.strokeStyle = fg; g.globalAlpha = 0.5; g.lineWidth = 3; g.strokeRect(36, 610, w - 72, 4); g.globalAlpha = 1;
    g.font = "600 22px 'IBM Plex Mono', monospace"; g.fillStyle = fg; g.fillText("MSU MUSIC CLUB", w / 2, 840);
    scratches(g, w, h, 90, 0.16);
    scratches(g, w, h, 40, 0.2, false);
  });
}
