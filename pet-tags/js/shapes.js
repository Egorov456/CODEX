import * as THREE from 'three';

// Каждая форма: контур, отверстие под колечко и область под надпись (в единицах сцены, 1 ед. ≈ 1 см).

function circle() {
  const s = new THREE.Shape();
  s.absarc(0, 0, 1.5, 0, Math.PI * 2, false);
  return { shape: s, hole: { x: 0, y: 1.08, r: 0.16 }, text: { cx: 0, cy: -0.15, w: 2.3, h: 1.6 } };
}

function bone() {
  const r = 0.7, h = 0.6, s = 0.62, L = 1.35;
  const d = Math.sqrt(r * r - (h - s) * (h - s));
  const e = Math.sqrt(r * r - h * h);
  const a = Math.atan2(h, e);
  const b = Math.atan2(h - s, d);
  const p = new THREE.Shape();
  p.moveTo(-L + d, -s);
  p.lineTo(L - d, -s);
  p.absarc(L, -h, r, Math.PI - b, Math.PI * 2 + a, false);
  p.absarc(L, h, r, -a, Math.PI + b, false);
  p.lineTo(-L + d, s);
  p.absarc(-L, h, r, -b, Math.PI + a, false);
  p.absarc(-L, -h, r, Math.PI - a, Math.PI * 2 + b, false);
  return { shape: p, hole: { x: 0, y: 0.36, r: 0.13 }, text: { cx: 0, cy: -0.14, w: 2.4, h: 0.82 } };
}

function heart() {
  const p = new THREE.Shape();
  p.moveTo(0, 0.95);
  p.bezierCurveTo(0.35, 1.65, 1.75, 1.6, 1.7, 0.45);
  p.bezierCurveTo(1.65, -0.45, 0.55, -1.0, 0, -1.6);
  p.bezierCurveTo(-0.55, -1.0, -1.65, -0.45, -1.7, 0.45);
  p.bezierCurveTo(-1.75, 1.6, -0.35, 1.65, 0, 0.95);
  return { shape: p, hole: { x: 0, y: 0.62, r: 0.14 }, text: { cx: 0, cy: -0.05, w: 2.2, h: 1.1 } };
}

function polar(fn, n = 240) {
  const p = new THREE.Shape();
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    const r = fn(t);
    const x = Math.cos(t + Math.PI / 2) * r, y = Math.sin(t + Math.PI / 2) * r;
    i === 0 ? p.moveTo(x, y) : p.lineTo(x, y);
  }
  return p;
}

function flower() {
  const shape = polar((t) => 1.45 * (0.8 + 0.2 * Math.cos(5 * t)));
  return { shape, hole: { x: 0, y: 1.08, r: 0.15 }, text: { cx: 0, cy: -0.12, w: 2.0, h: 1.4 } };
}

function star() {
  const p = new THREE.Shape();
  const R = 1.65, ri = 0.92;
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? ri : R;
    const t = Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(t) * r, y = Math.sin(t) * r;
    i === 0 ? p.moveTo(x, y) : p.lineTo(x, y);
  }
  p.closePath();
  return { shape: p, hole: { x: 0, y: 1.0, r: 0.13 }, text: { cx: 0, cy: -0.05, w: 1.55, h: 0.95 } };
}

function fish() {
  const p = new THREE.Shape();
  p.moveTo(1.75, 0);
  p.bezierCurveTo(1.35, 1.25, -0.55, 1.2, -0.95, 0.25);
  p.lineTo(-1.7, 0.95);
  p.quadraticCurveTo(-1.42, 0, -1.7, -0.95);
  p.lineTo(-0.95, -0.25);
  p.bezierCurveTo(-0.55, -1.2, 1.35, -1.25, 1.75, 0);
  return { shape: p, hole: { x: 0.25, y: 0.58, r: 0.13 }, text: { cx: 0.25, cy: -0.12, w: 2.0, h: 0.75 } };
}

function tag() {
  const w = 1.15, h = 1.6, r = 0.45;
  const p = new THREE.Shape();
  p.moveTo(-w + r, -h);
  p.lineTo(w - r, -h);
  p.quadraticCurveTo(w, -h, w, -h + r);
  p.lineTo(w, h - r);
  p.quadraticCurveTo(w, h, w - r, h);
  p.lineTo(-w + r, h);
  p.quadraticCurveTo(-w, h, -w, h - r);
  p.lineTo(-w, -h + r);
  p.quadraticCurveTo(-w, -h, -w + r, -h);
  return { shape: p, hole: { x: 0, y: 1.18, r: 0.16 }, text: { cx: 0, cy: -0.15, w: 1.95, h: 2.2 } };
}

const BUILDERS = { circle, bone, heart, flower, star, fish, tag };

export function buildShape(id) {
  const def = (BUILDERS[id] || circle)();
  const hole = new THREE.Path();
  hole.absarc(def.hole.x, def.hole.y, def.hole.r, 0, Math.PI * 2, true);
  def.shape.holes = [hole];
  return def;
}

// Точки по контуру, сдвинутые внутрь — для страз.
export function insetPoints(shape, count, inset, avoid) {
  const pts = shape.getSpacedPoints(400);
  const cw = THREE.ShapeUtils.isClockWise(pts);
  const out = [];
  let tries = 0;
  for (let i = 0; out.length < count && tries < count * 3; i++, tries++) {
    const u = ((i + 0.5) / count) % 1;
    const p = shape.getPointAt(u);
    const t = shape.getTangentAt(u);
    const n = cw ? new THREE.Vector2(t.y, -t.x) : new THREE.Vector2(-t.y, t.x);
    const q = p.clone().addScaledVector(n, inset);
    if (avoid && q.distanceTo(avoid.c) < avoid.r) continue;
    out.push(q);
  }
  return out;
}

// Маленькие плоские формы для бусин и значков
export function smallHeart(size) {
  const k = size / 1.7;
  const p = new THREE.Shape();
  p.moveTo(0, 0.95 * k);
  p.bezierCurveTo(0.35 * k, 1.65 * k, 1.75 * k, 1.6 * k, 1.7 * k, 0.45 * k);
  p.bezierCurveTo(1.65 * k, -0.45 * k, 0.55 * k, -1.0 * k, 0, -1.6 * k);
  p.bezierCurveTo(-0.55 * k, -1.0 * k, -1.65 * k, -0.45 * k, -1.7 * k, 0.45 * k);
  p.bezierCurveTo(-1.75 * k, 1.6 * k, -0.35 * k, 1.65 * k, 0, 0.95 * k);
  return p;
}

export function smallStar(size) {
  const p = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? size * 0.5 : size;
    const t = Math.PI / 2 + (i * Math.PI) / 5;
    i === 0 ? p.moveTo(Math.cos(t) * r, Math.sin(t) * r) : p.lineTo(Math.cos(t) * r, Math.sin(t) * r);
  }
  p.closePath();
  return p;
}
