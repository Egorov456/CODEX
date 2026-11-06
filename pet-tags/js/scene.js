import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CONFIG } from './config.js';
import { buildShape, smallHeart, smallStar } from './shapes.js';
import { buildExtraBead, buildTopper, isCharm, patternMaps } from './charms.js';

const byId = (list, id) => list.find((x) => x.id === id) || list[0];
const DEPTH = 0.18, BEVEL = 0.06;
const FRONT_Z = DEPTH / 2 + BEVEL;
const BEAD_COLLAR = 1.45;

// ---------- Утилиты ----------
const easeOutBack = (t) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function dispose(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      for (const k of ['map', 'alphaMap', 'bumpMap']) m[k]?.dispose();
      m.dispose();
    }
  });
}

// яркость в sRGB (0..1) — для выбора контрастного цвета надписи
function luminance(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16) || 0;
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

function metal(color, rough = 0.22) {
  return new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness: rough });
}

// ---------- Иконки для гравировки ----------
function drawIcon(ctx, id, cx, cy, s) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  if (id === 'paw') {
    ctx.ellipse(0, s * 0.22, s * 0.3, s * 0.25, 0, 0, Math.PI * 2);
    for (const [x, y] of [[-0.37, -0.12], [-0.13, -0.36], [0.13, -0.36], [0.37, -0.12]]) {
      ctx.moveTo(x * s + s * 0.12, y * s);
      ctx.ellipse(x * s, y * s, s * 0.12, s * 0.155, 0, 0, Math.PI * 2);
    }
  } else if (id === 'heart') {
    const k = s / 3.4;
    ctx.moveTo(0, -0.95 * k);
    ctx.bezierCurveTo(0.35 * k, -1.65 * k, 1.75 * k, -1.6 * k, 1.7 * k, -0.45 * k);
    ctx.bezierCurveTo(1.65 * k, 0.45 * k, 0.55 * k, 1.0 * k, 0, 1.6 * k);
    ctx.bezierCurveTo(-0.55 * k, 1.0 * k, -1.65 * k, 0.45 * k, -1.7 * k, -0.45 * k);
    ctx.bezierCurveTo(-1.75 * k, -1.6 * k, -0.35 * k, -1.65 * k, 0, -0.95 * k);
  } else if (id === 'bone') {
    ctx.rect(-s * 0.32, -s * 0.11, s * 0.64, s * 0.22);
    for (const [x, y] of [[-0.36, -0.12], [-0.36, 0.12], [0.36, -0.12], [0.36, 0.12]]) {
      ctx.moveTo(x * s + s * 0.15, y * s);
      ctx.arc(x * s, y * s, s * 0.15, 0, Math.PI * 2);
    }
  } else if (id === 'star') {
    for (let i = 0; i < 10; i++) {
      const r = (i % 2 ? 0.22 : 0.5) * s;
      const t = -Math.PI / 2 + (i * Math.PI) / 5;
      i ? ctx.lineTo(Math.cos(t) * r, Math.sin(t) * r) : ctx.moveTo(Math.cos(t) * r, Math.sin(t) * r);
    }
    ctx.closePath();
  } else if (id === 'crown') {
    ctx.moveTo(-0.45 * s, 0.3 * s);
    ctx.lineTo(-0.5 * s, -0.25 * s);
    ctx.lineTo(-0.22 * s, 0.0);
    ctx.lineTo(0, -0.4 * s);
    ctx.lineTo(0.22 * s, 0.0);
    ctx.lineTo(0.5 * s, -0.25 * s);
    ctx.lineTo(0.45 * s, 0.3 * s);
    ctx.closePath();
  }
  ctx.fill('nonzero');
  ctx.restore();
}

function fitFont(ctx, text, fontDef, maxW, maxH) {
  let size = Math.floor(maxH);
  const css = (s) => fontDef.css.replace('{s}', s);
  ctx.font = css(size);
  const w = ctx.measureText(text).width;
  if (w > maxW) size = Math.floor((size * maxW) / w);
  return css(Math.max(size, 8));
}

// Текстура надписи (прозрачный фон), с эффектом гравировки для металла
function textTexture(lines, icon, area, style) {
  const W = 1024, H = Math.round((W * area.h) / area.w);
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d');
  const font = byId(CONFIG.fonts, style.font);
  const rows = [];
  if (icon && icon !== 'none') rows.push({ icon, weight: 0.8 });
  if (lines[0]) rows.push({ text: lines[0], weight: 1.25, wf: 0.9 });
  if (lines[1]) rows.push({ text: lines[1], weight: 0.6, wf: 0.75 });
  const total = rows.reduce((s, r) => s + r.weight, 0) || 1;
  let y = H * 0.04;
  const usable = H * 0.92;

  const paint = (fn) => {
    if (style.engrave) {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.save();
      ctx.translate(0, 3);
      fn();
      ctx.restore();
    }
    ctx.fillStyle = style.color;
    fn();
  };

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const r of rows) {
    const h = (usable * r.weight) / total;
    const cy = y + h / 2;
    if (r.icon) paint(() => drawIcon(ctx, r.icon, W / 2, cy, h * 0.95));
    else {
      ctx.font = fitFont(ctx, r.text, font, W * r.wf, h * 0.95);
      paint(() => ctx.fillText(r.text, W / 2, cy + h * 0.04));
    }
    y += h;
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// ---------- Сцена ----------
export class TagScene {
  // opts.interactive=false — витрина без управления (крутится сама, не мешает прокрутке страницы)
  // opts.offscreen={width,height} — невидимая сцена для рендера превью (без цикла анимации)
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.opts = opts;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: !!opts.offscreen });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(3, 5, 6);
    this.scene.add(key, new THREE.AmbientLight(0xffffff, 0.25));

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    this.camera.position.set(0, 1.2, 12);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    if (opts.interactive === false) this.controls.enabled = false;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 22;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 1.2;
    this.controls.addEventListener('start', () => {
      this.controls.autoRotate = false;
      this._userZoomed = true;
      clearTimeout(this._idle);
    });
    this.controls.addEventListener('end', () => {
      clearTimeout(this._idle);
      this._idle = setTimeout(() => (this.controls.autoRotate = this.autoRotateEnabled), 5000);
    });
    this.autoRotateEnabled = opts.interactive !== false;
    this.controls.autoRotate = this.autoRotateEnabled;
    this.spin = opts.interactive === false ? 0.6 : 0; // скорость покачивания витрины

    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.tagGroup = new THREE.Group();
    this.root.add(this.tagGroup);

    this.parts = {}; // name -> {sig, obj}
    this.beads = new Map(); // id -> {sig, obj}
    this.anims = [];
    this.targetY = 1;
    this.targetDist = 12;
    this.flipTarget = 0;

    if (opts.offscreen) {
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(opts.offscreen.width, opts.offscreen.height, false);
      this.camera.aspect = opts.offscreen.width / opts.offscreen.height;
      this.camera.updateProjectionMatrix();
      return;
    }
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    this.resize();
    this._last = performance.now();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  resize() {
    const el = this.canvas.parentElement;
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---------- Анимации ----------
  animate(obj, kind, { delay = 0, dur = 520, from, to, onDone } = {}) {
    const a = { obj, kind, start: performance.now() + delay, dur, from, to, onDone };
    this.anims = this.anims.filter((x) => !(x.obj === obj && (x.kind === 'move') === (kind === 'move')));
    if (kind === 'pop') obj.scale.setScalar(0.0001);
    this.anims.push(a);
  }

  tick() {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this._last) / 1000);
    this._last = now;
    if (this.spin) this.flipTarget = Math.sin((now / 1000) * this.spin) * 0.75; // витрина покачивается, надпись видна
    this.anims = this.anims.filter((a) => {
      const t = Math.min(1, Math.max(0, (now - a.start) / a.dur));
      if (now < a.start) return true;
      if (a.kind === 'pop') a.obj.scale.setScalar(Math.max(0.0001, easeOutBack(t)));
      else if (a.kind === 'out') a.obj.scale.setScalar(Math.max(0.0001, 1 - easeInOut(t)));
      else if (a.kind === 'pulse') a.obj.scale.setScalar(1 + Math.sin(t * Math.PI) * 0.07);
      else if (a.kind === 'move') a.obj.position.lerpVectors(a.from, a.to, easeInOut(t));
      if (t >= 1) {
        a.onDone?.();
        return false;
      }
      return true;
    });

    // плавное кадрирование и переворот
    const c = this.controls;
    c.target.y += (this.targetY - c.target.y) * 0.06;
    const dir = this.camera.position.clone().sub(c.target);
    const dist = dir.length();
    if (!this._userZoomed) dir.setLength(dist + (this.targetDist - dist) * 0.05);
    this.camera.position.copy(c.target).add(dir);
    this.root.rotation.y += (this.flipTarget - this.root.rotation.y) * 0.08;

    c.update();
    this.renderer.render(this.scene, this.camera);
  }

  // ---------- Замена компонента с анимацией ----------
  swap(name, sig, build, parent, { quiet = false } = {}) {
    const cur = this.parts[name];
    if (cur && cur.sig === sig) return false;
    const isNew = !cur || !cur.obj;
    if (cur?.obj) {
      parent.remove(cur.obj);
      dispose(cur.obj);
    }
    const obj = build();
    this.parts[name] = { sig, obj };
    if (obj) {
      parent.add(obj);
      if (!quiet) this.animate(obj, isNew ? 'pop' : 'pulse', { dur: isNew ? 560 : 380 });
    }
    return true;
  }

  update(st) {
    const def = buildShape(st.shape);
    const size = byId(CONFIG.sizes, st.size);
    const mat = byId(CONFIG.materials, st.material);
    const sc = size.scale;
    this.def = def;
    this.tagGroup.scale.setScalar(sc);

    const tagSig = [st.shape, mat.id, st.tagColor, st.rim, mat.kind === 'metal' ? 'none' : st.pattern || 'none'].join('|');
    const shapeChanged = this.parts.tag && this.parts.tag.sig.split('|')[0] !== st.shape;
    this.swap('tag', tagSig, () => this.buildTag(def, mat, st), this.tagGroup);
    if (shapeChanged) this.animate(this.parts.tag.obj, 'pop', { dur: 600 });

    // цвет надписи
    let color, engrave = false;
    const tc = byId(CONFIG.textColors, st.front.textColor);
    if (tc.color) color = tc.color;
    else if (mat.kind === 'metal') { color = '#2b2b33'; engrave = true; }
    else color = luminance(st.tagColor) > 0.6 ? '#2d2d3a' : '#ffffff';
    const style = { font: st.front.font, color, engrave };

    const fSig = [st.shape, st.front.line1, st.front.line2, st.front.icon, st.front.font, color, engrave].join('|');
    this.swap('front', fSig, () => this.buildText([st.front.line1, st.front.line2], st.front.icon, def.text, style, true), this.tagGroup);
    const bArea = { cx: def.text.cx, cy: def.text.cy, w: def.text.w, h: def.text.h * 0.85 };
    const bSig = [st.shape, st.back.line1, st.back.line2, st.front.font, color, engrave].join('|');
    this.swap('back', bSig, () => this.buildText([st.back.line1, st.back.line2], null, bArea, { ...style, font: 'Montserrat' }, false), this.tagGroup);

    // фигурка поверх адресника (мордочка, бантик)
    const topper = st.topper && st.topper !== 'none' ? st.topper : null;
    this.swap('topper', [st.shape, topper, st.topperColor].join('|'), () => {
      const t = topper && buildTopper(topper, st.topperColor);
      if (t) {
        t.scale.setScalar(1.35);
        t.position.set(def.hole.x, def.hole.y + 0.08, FRONT_Z + 0.2);
      }
      return t;
    }, this.tagGroup);

    const sSig = [st.shape, st.strass, st.strassColor, !!(st.front.line1 || st.front.icon !== 'none')].join('|');
    if (this.swap('strass', sSig, () => this.buildStrass(def, st), this.tagGroup, { quiet: true }) && this.parts.strass.obj) {
      this.parts.strass.obj.children.forEach((m, i) => this.animate(m, 'pop', { delay: i * 45, dur: 420 }));
    }

    // колечко и шнурок — в координатах root (не масштабируются вместе с адресником)
    const hx = def.hole.x * sc, hy = def.hole.y * sc;
    const ringR = 0.3;
    const ringCy = hy + ringR - Math.min(0.12, def.hole.r * sc * 0.5);
    const ringTop = new THREE.Vector3(hx, ringCy + ringR, 0);
    const ringSig = [hx.toFixed(3), hy.toFixed(3), st.cord === 'chain' ? st.chainColor : mat.id].join('|');
    this.swap('ring', ringSig, () => this.buildRing(hx, ringCy, ringR, st, mat), this.root);

    const cord = byId(CONFIG.cords, st.cord);
    this.curve = cord.id === 'none' ? null : cord.id === 'collar' ? this.collarCurve(ringTop) : this.cordCurve(ringTop);
    this.isCollar = cord.id === 'collar';
    const cSig = [cord.id, st.cordColor, st.chainColor, ringTop.x.toFixed(3), ringTop.y.toFixed(3)].join('|');
    this.swap('cord', cSig, () => (this.curve ? this.buildCord(cord, st) : null), this.root);

    const outline = def.shape.getPoints(60);
    this.tagHalfW = Math.max(...outline.map((q) => Math.abs(q.x - def.hole.x))) * sc;
    this.updateBeads(st);

    let top = ringTop.y, width = 3.6 * sc;
    if (this.curve) {
      const pts = this.curve.getPoints(64);
      top = Math.max(...pts.map((p) => p.y)) + 0.2;
      width = Math.max(width, Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x)) + 0.6);
    }
    const bottom = -1.7 * sc - (this.beadsHang ? 1.1 : 0.7); // запас под кнопки поверх сцены
    this.targetY = (top + bottom) / 2;
    const span = Math.max(top - bottom, (width / Math.max(this.camera.aspect, 0.55)) * 0.95);
    const dist = Math.max(7.5, span * 1.75 + 1.5) * (this.opts.interactive === false ? 1.12 : 1);
    if (Math.abs(dist - this.targetDist) > 0.5) this._userZoomed = false;
    this.targetDist = dist;
  }

  buildTag(def, mat, st) {
    const geo = new THREE.ExtrudeGeometry(def.shape, {
      depth: DEPTH, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 4, curveSegments: 64,
    });
    geo.translate(0, 0, -DEPTH / 2);
    let mats;
    if (mat.kind === 'metal') {
      const m = metal(mat.color);
      mats = [m, m];
    }
    const pat = mat.kind === 'metal' ? null : patternMaps(st.pattern, st.tagColor);
    const withPattern = (opts) => (pat ? { ...opts, color: '#ffffff', map: pat.map, ...(pat.metalMap ? { metalness: 1, metalnessMap: pat.metalMap } : {}) } : { ...opts, color: st.tagColor });
    if (mat.kind === 'metal') {
      // уже задано выше
    } else if (mat.kind === 'enamel') {
      const cap = new THREE.MeshPhysicalMaterial(withPattern({ roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.06 }));
      mats = [cap, metal(byId(CONFIG.rimColors, st.rim).color, 0.18)];
    } else if (mat.kind === 'clay') {
      const cap = new THREE.MeshPhysicalMaterial(withPattern({ roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.3, sheen: 0.4 }));
      mats = [cap, new THREE.MeshPhysicalMaterial({ color: st.tagColor, roughness: 0.55, clearcoat: 0.3 })];
    } else if (mat.kind === 'epoxy') {
      const cap = new THREE.MeshPhysicalMaterial(withPattern({ roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, iridescence: 0.35, transmission: pat ? 0 : 0.25, thickness: 0.4 }));
      mats = [cap, new THREE.MeshPhysicalMaterial({ color: st.tagColor, roughness: 0.05, clearcoat: 1, transmission: 0.2, thickness: 0.4 })];
    } else if (pat) {
      const m = new THREE.MeshPhysicalMaterial(withPattern({ roughness: 0.12, clearcoat: 0.6 }));
      mats = [m, new THREE.MeshPhysicalMaterial({ color: st.tagColor, roughness: 0.12, transmission: 0.55, thickness: 0.4, ior: 1.45 })];
    } else {
      const m = new THREE.MeshPhysicalMaterial({
        color: st.tagColor, roughness: 0.12, transmission: 0.55, thickness: 0.4, ior: 1.45, clearcoat: 0.6,
      });
      mats = [m, m];
    }
    return new THREE.Mesh(geo, mats);
  }

  buildText(lines, icon, area, style, front) {
    if (!lines[0] && !lines[1] && (!icon || icon === 'none')) return null;
    const tex = textTexture(lines, icon, area, style);
    const isGold = style.color === '#d9a838';
    const m = new THREE.MeshStandardMaterial({
      map: tex, transparent: true, roughness: style.engrave ? 0.6 : 0.4, metalness: isGold ? 0.8 : 0,
      polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(area.w, area.h), m);
    mesh.position.set(area.cx, area.cy, front ? FRONT_Z + 0.004 : -FRONT_Z - 0.004);
    if (!front) mesh.rotation.y = Math.PI;
    return mesh;
  }

  buildStrass(def, st) {
    if (!st.strass) return null;
    const hasText = !!(st.front.line1 || st.front.icon !== 'none');
    const t = def.text;
    const valid = (p) => {
      if (Math.hypot(p.x - def.hole.x, p.y - def.hole.y) < def.hole.r + 0.24) return false;
      if (hasText && Math.abs(p.x - t.cx) < t.w * 0.42 && Math.abs(p.y - t.cy) < t.h * 0.4) return false;
      return true;
    };
    const N = 600;
    const pts = def.shape.getSpacedPoints(N).slice(0, N);
    const cw = THREE.ShapeUtils.isClockWise(pts);
    const ok = [];
    for (let i = 0; i < N; i++) {
      const p = pts[i], q = pts[(i + 1) % N];
      const tg = q.clone().sub(p).normalize();
      const n = cw ? new THREE.Vector2(tg.y, -tg.x) : new THREE.Vector2(-tg.y, tg.x);
      const c = p.clone().addScaledVector(n, 0.22);
      if (valid(c)) ok.push(c);
    }
    const g = new THREE.Group();
    if (!ok.length) return g;
    const color = byId(CONFIG.strassColors, st.strassColor).color;
    const geo = new THREE.OctahedronGeometry(0.085, 0);
    geo.scale(1, 1, 0.55);
    const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.02, metalness: 0.85, iridescence: 1, iridescenceIOR: 1.8, envMapIntensity: 3, flatShading: true, emissive: color, emissiveIntensity: 0.12 });
    const bez = new THREE.TorusGeometry(0.088, 0.018, 8, 24);
    const bezMat = metal('#d9dbe0', 0.2);
    for (let k = 0; k < st.strass; k++) {
      const p = ok[Math.floor(((k + 0.5) * ok.length) / st.strass)];
      const s = new THREE.Group();
      s.add(new THREE.Mesh(geo, mat), new THREE.Mesh(bez, bezMat));
      s.position.set(p.x, p.y, FRONT_Z + 0.03);
      g.add(s);
    }
    return g;
  }

  buildRing(x, cy, r, st, mat) {
    const color = st.cord === 'chain' ? byId(CONFIG.chainColors, st.chainColor).color : mat.kind === 'metal' ? mat.color : '#d3d6db';
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, 0.045, 16, 48), metal(color, 0.2));
    mesh.position.set(x, cy, 0);
    mesh.rotation.y = Math.PI / 2;
    return mesh;
  }

  cordCurve(p0) {
    const pts = [
      [0, 0, 0], [0.38, 0.5, 0.05], [0.88, 1.5, 0.08], [1.0, 2.7, 0.05], [0.62, 3.6, 0], [0, 3.9, -0.03],
      [-0.62, 3.6, 0], [-1.0, 2.7, -0.05], [-0.88, 1.5, -0.08], [-0.38, 0.5, -0.05],
    ].map(([x, y, z]) => new THREE.Vector3(p0.x + x, p0.y + y, z));
    return new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  }

  // Ошейник-бусы: большое кольцо из паракорда, адресник висит снизу
  collarCurve(p0) {
    const R = 4.1, pts = [];
    for (let i = 0; i < 48; i++) {
      const a = -Math.PI / 2 + (i / 48) * Math.PI * 2;
      pts.push(new THREE.Vector3(p0.x + Math.cos(a) * R * 0.95, p0.y + (Math.sin(a) + 1) * R, -(Math.sin(a) + 1) * R * 0.16));
    }
    return new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  }

  buildCord(cord, st) {
    if (cord.id === 'chain') {
      const len = this.curve.getLength();
      const n = Math.floor(len / 0.2);
      const geo = new THREE.TorusGeometry(0.1, 0.026, 8, 20);
      geo.scale(1.35, 1, 1);
      const inst = new THREE.InstancedMesh(geo, metal(byId(CONFIG.chainColors, st.chainColor).color, 0.18), n);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), roll = new THREE.Quaternion();
      for (let i = 0; i < n; i++) {
        const u = i / n;
        const p = this.curve.getPointAt(u), t = this.curve.getTangentAt(u);
        q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), t);
        roll.setFromAxisAngle(new THREE.Vector3(1, 0, 0), i % 2 ? Math.PI / 2 : 0);
        q.multiply(roll);
        m.compose(p, q, new THREE.Vector3(1, 1, 1));
        inst.setMatrixAt(i, m);
      }
      return inst;
    }
    const geo = new THREE.TubeGeometry(this.curve, 360, cord.radius, 14, true);
    const matOpts = { color: st.cordColor, roughness: cord.id === 'wax' ? 0.45 : 0.85, sheen: 0.5 };
    if (cord.id === 'paracord' || cord.id === 'collar') {
      const cv = document.createElement('canvas');
      cv.width = 64; cv.height = 64;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 64, 64);
      ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 9;
      for (let i = -64; i < 128; i += 22) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 64, 64); ctx.stroke(); }
      const tex = new THREE.CanvasTexture(cv);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.repeat.set(Math.round(this.curve.getLength() / 0.14), 2);
      matOpts.map = tex;
    }
    const tube = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial(matOpts));
    if (cord.id !== 'collar') return tube;
    // регулировочные узлы наверху ошейника
    const g = new THREE.Group();
    g.add(tube);
    for (const u of [0.43, 0.57]) {
      const knot = new THREE.Mesh(new THREE.CylinderGeometry(cord.radius * 2.3, cord.radius * 2.3, 0.42, 20), tube.material);
      knot.position.copy(this.curve.getPointAt(u));
      knot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), this.curve.getTangentAt(u));
      g.add(knot);
    }
    return g;
  }

  // ---------- Бусины ----------
  beadSlots(st) {
    if (!this.curve) return [];
    const len = this.curve.getLength();
    const k = this.isCollar ? BEAD_COLLAR : 1; // на ошейнике бусины крупнее и отступают от адресника
    // отступ от центра: на ошейнике — по ширине адресника, чтобы подвески не прятались за ним
    const R = 3.9, halfW = Math.min(R * 0.95, (this.tagHalfW || 1.6) + 0.45);
    const u0 = (this.isCollar ? R * Math.asin(halfW / R) + 0.25 : 0.36) / len, step = (0.42 * k) / len;
    const n = st.beads.length;
    const half = Math.ceil(n / 2);
    return st.beads.map((b, i) => {
      let u;
      if (st.beadLayout === 'row' && this.isCollar) {
        // на ошейнике слово читается слева направо по нижней дуге, с местом под адресник
        u = i < half ? -(u0 + (half - 1 - i) * step) : u0 + (i - half) * step;
      } else if (st.beadLayout === 'row') u = 1 - (u0 + (n - 1 - i) * step);
      else u = i % 2 === 0 ? u0 + Math.floor(i / 2) * step : 1 - (u0 + Math.floor(i / 2) * step);
      u = ((u % 1) + 1) % 1;
      const p = this.curve.getPointAt(u);
      const t = this.curve.getTangentAt(u);
      const rot = this.isCollar && !isCharm(b.type) ? Math.atan2(t.y, t.x) : 0;
      return { p, rot: Math.abs(rot) > Math.PI / 2 ? rot - Math.sign(rot) * Math.PI : rot };
    });
  }

  updateBeads(st) {
    const slots = this.beadSlots(st);
    this.beadsHang = st.beads.some((b) => isCharm(b.type));
    const keep = new Set();
    st.beads.forEach((b, i) => {
      if (!slots[i]) return;
      keep.add(b.id);
      const sig = [b.type, b.color, b.letter, !!this.isCollar].join('|');
      const cur = this.beads.get(b.id);
      const { p: slot, rot } = slots[i];
      if (cur && cur.sig === sig) {
        cur.obj.rotation.z = rot;
        if (cur.obj.position.distanceTo(slot) > 1e-3) this.animate(cur.obj, 'move', { from: cur.obj.position.clone(), to: slot.clone(), dur: 450 });
        return;
      }
      if (cur) { this.root.remove(cur.obj); dispose(cur.obj); }
      let obj = this.buildBead(b);
      if (this.isCollar) {
        const w = new THREE.Group();
        obj.scale.setScalar(BEAD_COLLAR);
        w.add(obj);
        obj = w;
      }
      obj.position.copy(slot);
      obj.rotation.z = rot;
      this.root.add(obj);
      this.beads.set(b.id, { sig, obj });
      this.animate(obj, cur ? 'pulse' : 'pop', { dur: 520 });
    });
    for (const [id, v] of this.beads) {
      if (keep.has(id)) continue;
      this.beads.delete(id);
      this.animate(v.obj, 'out', { dur: 260, onDone: () => { this.root.remove(v.obj); dispose(v.obj); } });
    }
  }

  buildBead(b) {
    const extra = buildExtraBead(b);
    if (extra) return extra;
    const c = b.color;
    const glossy = () => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 });
    switch (b.type) {
      case 'facet':
        return new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.21, 1),
          new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.02, transmission: 0.75, thickness: 0.35, ior: 1.6, flatShading: true, envMapIntensity: 1.6 })
        );
      case 'pearl':
        return new THREE.Mesh(
          new THREE.SphereGeometry(0.19, 32, 24),
          new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.28, sheen: 1, sheenColor: '#ffffff', iridescence: 0.7, clearcoat: 0.6 })
        );
      case 'metal':
        return new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 24), metal(c, 0.15));
      case 'heart':
      case 'star': {
        const sh = b.type === 'heart' ? smallHeart(0.24) : smallStar(0.27);
        const g = new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3 });
        g.center();
        return new THREE.Mesh(g, glossy());
      }
      case 'letter': {
        const cv = document.createElement('canvas');
        cv.width = cv.height = 128;
        const ctx = cv.getContext('2d');
        ctx.fillStyle = c; ctx.fillRect(0, 0, 128, 128);
        ctx.fillStyle = luminance(c) > 0.6 ? '#1f1f28' : '#ffffff';
        ctx.font = '800 92px Montserrat';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText((b.letter || 'А').toUpperCase(), 64, 70);
        const tex = new THREE.CanvasTexture(cv);
        tex.colorSpace = THREE.SRGBColorSpace;
        const face = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.3, clearcoat: 0.8 });
        const side = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.3, clearcoat: 0.8 });
        return new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.36, 0.36, 3, 0.05), [side, side, side, side, face, face]);
      }
      default:
        return new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 24), glossy());
    }
  }

  // ---------- Действия ----------
  flip() {
    this.flipTarget = Math.round(this.flipTarget / Math.PI) * Math.PI + Math.PI;
  }

  setAutoRotate(v) {
    this.autoRotateEnabled = v;
    this.controls.autoRotate = v;
  }

  resetView() {
    this.flipTarget = Math.round(this.flipTarget / (2 * Math.PI)) * 2 * Math.PI;
    const t = this.controls.target;
    this.camera.position.set(t.x, t.y + 0.6, t.z + this.targetDist);
  }

  // Поэтапная «сборка» адресника: детали появляются по очереди
  replay() {
    const seq = [];
    const p = this.parts;
    if (p.tag?.obj) seq.push([p.tag.obj, 0]);
    if (p.front?.obj) seq.push([p.front.obj, 650]);
    if (p.back?.obj) seq.push([p.back.obj, 0]);
    p.strass?.obj?.children.forEach((m, i) => seq.push([m, i === 0 ? 450 : 70]));
    if (p.topper?.obj) seq.push([p.topper.obj, 400]);
    if (p.ring?.obj) seq.push([p.ring.obj, 500]);
    if (p.cord?.obj) seq.push([p.cord.obj, 450]);
    [...this.beads.values()].forEach((v, i) => seq.push([v.obj, i === 0 ? 550 : 230]));
    let t = 150;
    for (const [obj, d] of seq) {
      t += d;
      this.animate(obj, 'pop', { delay: t, dur: 560 });
    }
    this.resetView();
    this._userZoomed = false;
    return t + 600;
  }

  // мгновенно завершить анимации и выставить камеру — для превью
  settle() {
    for (const a of this.anims) {
      if (a.kind === 'move') a.obj.position.copy(a.to);
      else a.obj.scale.setScalar(a.kind === 'out' ? 0.0001 : 1);
      a.onDone?.();
    }
    this.anims = [];
    this.root.rotation.y = this.flipTarget = -0.35;
    this.controls.target.set(0, this.targetY, 0);
    this.camera.position.set(0, this.targetY + 0.5, this.targetDist * 0.92);
    this.camera.lookAt(this.controls.target);
  }

  render(st) {
    this.update(st);
    this.settle();
    this.renderer.render(this.scene, this.camera);
    return this.canvas.toDataURL('image/png');
  }

  // Отдельная деталь крупным планом (для витрины бусин и подвесок)
  renderItem(b) {
    const hidden = this.root.children.filter((c) => c.visible);
    hidden.forEach((c) => (c.visible = false));
    const o = this.buildBead(b);
    this.root.add(o);
    this.root.rotation.y = -0.25;
    const box = new THREE.Box3().setFromObject(o);
    const c = box.getCenter(new THREE.Vector3());
    const s = box.getSize(new THREE.Vector3()).length();
    this.camera.position.set(c.x, c.y + s * 0.25, c.z + s * 2.2);
    this.camera.lookAt(c);
    this.renderer.render(this.scene, this.camera);
    const url = this.canvas.toDataURL('image/png');
    this.root.remove(o);
    dispose(o);
    hidden.forEach((h) => (h.visible = true));
    return url;
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.scene.traverse((o) => o !== this.scene && o.geometry && dispose(o));
    this.renderer.dispose();
  }

  snapshot() {
    this.renderer.render(this.scene, this.camera);
    return this.canvas.toDataURL('image/png');
  }
}
