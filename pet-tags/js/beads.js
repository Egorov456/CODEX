import * as THREE from 'three';
import { variantOf } from './pricing.js';

// 3D-модели бусин из каталога (фото поставщика): pony-бочонки, перламутровые ронделли,
// пятнистые, цветы и сердечки. Всё процедурно: геометрия Three.js + canvas-текстуры.
// Канал бусины смотрит вдоль оси X — сцена поворачивает бусину по касательной к шнурку.

// Псевдослучайность с зерном: рисунок мрамора и пятен не меняется между перерисовками
function rng(str) {
  let s = 2166136261;
  for (const ch of String(str)) s = Math.imul(s ^ ch.charCodeAt(0), 16777619);
  s >>>= 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

const lum = (hex) => {
  const n = parseInt(String(hex).replace('#', ''), 16) || 0;
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
};
const rgba = (hex, a) => {
  const n = parseInt(String(hex).replace('#', ''), 16) || 0;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// ---------- Текстуры (холсты кешируются, текстура на каждую бусину своя — её можно безопасно удалить) ----------
const canvases = new Map();
function canvasFor(key, w, h, draw) {
  if (!canvases.has(key)) {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    draw(cv.getContext('2d'), w, h);
    canvases.set(key, cv);
  }
  return canvases.get(key);
}
function tex(cv, { srgb = true, repeat = 1, offset = 0 } = {}) {
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.offset.set(offset, offset);
  t.anisotropy = 4;
  return t;
}

// плавные мраморные разводы второго цвета
function drawSwirls(c, w, h, r, color, { n = 9, alpha = 0.55, width = [4, 22], blur = 10 } = {}) {
  c.lineCap = 'round';
  c.shadowColor = rgba(color, alpha);
  c.shadowBlur = blur;
  for (let i = 0; i < n; i++) {
    c.strokeStyle = rgba(color, alpha * (0.45 + r() * 0.55));
    c.lineWidth = width[0] + r() * (width[1] - width[0]);
    let x = r() * w, y = r() * h;
    c.beginPath();
    c.moveTo(x, y);
    for (let k = 0; k < 3; k++) {
      const nx = x + (r() - 0.5) * w * 0.9, ny = y + (r() - 0.5) * h * 1.2;
      c.bezierCurveTo(x + (r() - 0.5) * w * 0.6, y + (r() - 0.5) * h, nx + (r() - 0.5) * w * 0.4, ny + (r() - 0.5) * h, nx, ny);
      x = nx; y = ny;
    }
    c.stroke();
  }
  c.shadowBlur = 0;
}

function patternCanvas(v, seed) {
  const key = [v.finish, v.color, v.accent, seed].join('|');
  return canvasFor(key, 512, 256, (c, w, h) => {
    const r = rng(key);
    c.fillStyle = v.color;
    c.fillRect(0, 0, w, h);
    switch (v.finish) {
      case 'marble':
      case 'marble-clear':
        drawSwirls(c, w, h, r, v.accent, { n: 12, alpha: 0.7, width: [3, 26], blur: 14 });
        drawSwirls(c, w, h, r, '#ffffff', { n: 4, alpha: 0.25, width: [2, 8], blur: 6 });
        break;
      case 'swirl':
      case 'glitter':
        drawSwirls(c, w, h, r, v.accent || '#ffffff', { n: 14, alpha: 0.5, width: [3, 18], blur: 12 });
        if (v.finish === 'glitter') {
          for (let i = 0; i < 700; i++) {
            c.fillStyle = r() > 0.5 ? 'rgba(255,220,230,0.9)' : 'rgba(255,90,110,0.9)';
            c.fillRect(r() * w, r() * h, 2, 2);
          }
        }
        break;
      case 'spots': {
        // мягкая неоднородность фона, затем тёмные пятна с ореолом
        for (let i = 0; i < 260; i++) {
          c.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
          c.beginPath();
          c.arc(r() * w, r() * h, 2 + r() * 6, 0, Math.PI * 2);
          c.fill();
        }
        for (let i = 0; i < 16; i++) {
          const x = r() * w, y = 30 + r() * (h - 60), rad = 14 + r() * 14;
          const g = c.createRadialGradient(x, y, rad * 0.35, x, y, rad * 1.5);
          g.addColorStop(0, rgba(v.accent, 0.95));
          g.addColorStop(0.55, rgba(v.accent, 0.75));
          g.addColorStop(1, rgba(v.accent, 0));
          c.fillStyle = g;
          for (const dx of [0, -w, w]) { c.beginPath(); c.arc(x + dx, y, rad * 1.5, 0, Math.PI * 2); c.fill(); }
        }
        break;
      }
      case 'speckle':
        for (let i = 0; i < 1600; i++) {
          c.fillStyle = r() > 0.35 ? 'rgba(60,0,20,0.35)' : 'rgba(255,255,255,0.35)';
          c.beginPath();
          c.arc(r() * w, r() * h, 0.8 + r() * 2.2, 0, Math.PI * 2);
          c.fill();
        }
        break;
      case 'confetti': {
        const pal = ['#ff4f81', '#ffd23f', '#2e86de', '#3bb273', '#ff8c42', '#a46ae8', '#48dbfb', '#d0141c'];
        for (let i = 0; i < 70; i++) {
          c.fillStyle = pal[Math.floor(r() * pal.length)];
          c.beginPath();
          c.ellipse(r() * w, r() * h, 8 + r() * 12, 7 + r() * 10, r() * 3, 0, Math.PI * 2);
          c.fill();
        }
        break;
      }
      case 'stars': {
        c.clearRect(0, 0, w, h);
        const pal = ['#f5b82e', '#2e6fe0', '#ff6fa5', '#f5b82e'];
        for (let i = 0; i < 14; i++) {
          const x = r() * w, y = 20 + r() * (h - 40), s = 18 + r() * 10, a = r() * Math.PI;
          c.fillStyle = pal[i % pal.length];
          c.beginPath();
          for (let k = 0; k < 10; k++) {
            const rr = k % 2 ? s * 0.45 : s, t = a + (k * Math.PI) / 5;
            k ? c.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr) : c.moveTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr);
          }
          c.closePath();
          c.fill();
        }
        break;
      }
      case 'ombre': {
        const g = c.createLinearGradient(0, h, 0, 0);
        g.addColorStop(0, v.color);
        g.addColorStop(0.55, v.color);
        g.addColorStop(1, v.accent);
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
        break;
      }
      default:
    }
  });
}

// рельеф «пузырьков» для бусины-льда
function bubbleBump() {
  return canvasFor('bubble-bump', 256, 128, (c, w, h) => {
    const r = rng('bubble');
    c.fillStyle = '#808080';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) {
      const x = r() * w, y = r() * h, rad = 2 + r() * 6;
      const g = c.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, 'rgba(128,128,128,0)');
      c.fillStyle = g;
      c.beginPath();
      c.arc(x, y, rad, 0, Math.PI * 2);
      c.fill();
    }
  });
}

// ---------- Материалы по типу отделки ----------
function material(v, { uvRepeat = 1, uvOffset = 0, faceted = false } = {}) {
  const o = { repeat: uvRepeat, offset: uvOffset };
  const P = (opts) => new THREE.MeshPhysicalMaterial({ flatShading: faceted, ...opts });
  // Бесцветное «стекло»: transmission на прозрачном фоне канваса даёт серое пятно,
  // поэтому светлые прозрачные бусины — полупрозрачный материал с яркими бликами.
  const light = lum(v.color) > 0.8;
  const clear = (extra = {}) => (light
    ? P({ color: v.color, roughness: 0.04, transparent: true, opacity: 0.38, depthWrite: false, clearcoat: 1, envMapIntensity: 2.5, iridescence: 0.25, ...extra })
    : P({ color: v.color, roughness: 0.05, transmission: 0.85, thickness: 0.35, ior: 1.5,
      attenuationColor: v.color, attenuationDistance: 0.6, clearcoat: 1, envMapIntensity: 1.5, ...extra }));
  switch (v.finish) {
    case 'clear':
    case 'facet':
      return clear();
    case 'milky':
      return P({ color: v.color, roughness: 0.35, transmission: 0.3, thickness: 0.4, ior: 1.45, clearcoat: 0.8 });
    case 'bubble':
      return clear({ roughness: 0.12, bumpMap: tex(bubbleBump(), { srgb: false, ...o }), bumpScale: 2 });
    case 'stars': // звёзды рисуются отдельным слоем внутри (см. withStars)
      return clear();
    case 'metal':
      return P({ color: v.color, metalness: 1, roughness: 0.16, clearcoat: 0.6 });
    case 'ab':
      return P({ color: v.color, roughness: 0.16, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.8, iridescenceThicknessRange: [180, 620], sheen: 0.6, sheenColor: '#ffd6f0' });
    case 'marble-clear':
      return P({ color: '#ffffff', map: tex(patternCanvas(v, 'm'), o), roughness: 0.08, transmission: 0.45, thickness: 0.4, ior: 1.5, clearcoat: 1 });
    case 'swirl':
    case 'glitter':
      return P({ color: '#ffffff', map: tex(patternCanvas(v, 'w'), o), roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05,
        sheen: 0.7, sheenColor: '#ffffff', iridescence: 0.35, ...(v.finish === 'glitter' ? { transmission: 0.25, thickness: 0.3 } : {}) });
    case 'marble':
    case 'spots':
    case 'speckle':
    case 'confetti':
    case 'ombre':
      return P({ color: '#ffffff', map: tex(patternCanvas(v, 'p'), o), roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 });
    default: // gloss — непрозрачный глянцевый акрил
      return P({ color: v.color, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.04 });
  }
}

// ---------- Геометрия ----------
// Бочонок с каналом: замкнутый профиль вращается вокруг оси Y, затем ось канала поворачивается в X.
// Снаружи профиль скруглённый (n), внутри почти прямой канал.
function barrel({ rIn = 0.085, rOut = 0.21, half = 0.15, n = 2.4, segments = 48 } = {}) {
  const rc = (rIn + rOut) / 2, a = (rOut - rIn) / 2;
  const pts = [];
  const N = 64;
  for (let i = 0; i <= N; i++) {
    const t = -Math.PI + (i / N) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    const e = c >= 0 ? 2 / n : 2 / 9; // внешний бок — скруглённый, канал — прямой
    pts.push(new THREE.Vector2(rc + a * Math.sign(c) * Math.abs(c) ** e, half * Math.sign(s) * Math.abs(s) ** (c >= 0 ? 2 / n : 2 / 4)));
  }
  const geo = new THREE.LatheGeometry(pts, segments);
  geo.rotateZ(-Math.PI / 2);
  return geo;
}

// Сердце (классическая параметрическая кривая), центр примерно в (0,0)
function heartPath(size, path = new THREE.Shape()) {
  const N = 90, k = size / 34;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    i ? path.lineTo(x * k, (y + 2.5) * k) : path.moveTo(x * k, (y + 2.5) * k);
  }
  return path;
}

function flowerGeo() {
  const s = new THREE.Shape();
  const N = 200;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * Math.PI * 2;
    const r = 0.215 * (0.74 + 0.26 * Math.abs(Math.cos(2.5 * t)) ** 0.7);
    i ? s.lineTo(Math.cos(t) * r, Math.sin(t) * r) : s.moveTo(Math.cos(t) * r, Math.sin(t) * r);
  }
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.075, 0, Math.PI * 2, true);
  s.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.04, bevelSegments: 5, curveSegments: 48 });
  geo.center();
  geo.rotateY(Math.PI / 2); // канал — вдоль шнурка
  return geo;
}

function heartFrameGeo() {
  const s = heartPath(0.4);
  s.holes.push(heartPath(0.19, new THREE.Path()));
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.035, bevelSegments: 5, curveSegments: 48 });
  geo.center();
  return geo;
}

function heartPuffyGeo() {
  const geo = new THREE.ExtrudeGeometry(heartPath(0.34), { depth: 0.08, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.05, bevelSegments: 8, curveSegments: 48 });
  geo.center();
  return geo;
}

const CATALOG = new Set(['pony', 'pony-clear', 'pony-fx', 'marble', 'spotted', 'flower', 'heart-frame', 'heart-puffy']);
export const isCatalogBead = (type) => CATALOG.has(type);

// Возвращает Group или null, если тип не из каталога
export function buildCatalogBead(b) {
  if (!CATALOG.has(b.type)) return null;
  const v = variantOf(b);
  const g = new THREE.Group();
  let mesh, tilt = 0.95;
  switch (b.type) {
    case 'pony':
    case 'pony-clear':
    case 'pony-fx': {
      const cyl = v.id === 'amber' || v.id === 'rootbeer'; // янтарь и рутбир — цилиндрики
      const facet = v.finish === 'facet';
      const geo = cyl ? barrel({ rIn: 0.085, rOut: 0.19, half: 0.17, n: 5 }) : barrel({ segments: facet ? 14 : 48 });
      mesh = new THREE.Mesh(geo, material(v, { faceted: facet }));
      if (v.finish === 'stars') {
        // звёздочки-конфетти внутри прозрачной бусины
        const inner = new THREE.Mesh(geo.clone(), new THREE.MeshStandardMaterial({ map: tex(patternCanvas(v, 's')), transparent: true, alphaTest: 0.4, roughness: 0.4, side: THREE.DoubleSide }));
        inner.scale.setScalar(0.94);
        g.add(inner);
      }
      break;
    }
    case 'marble':
    case 'spotted':
      mesh = new THREE.Mesh(barrel({ rIn: 0.09, rOut: 0.225, half: 0.16, n: 2.2 }), material(v));
      break;
    case 'flower':
      mesh = new THREE.Mesh(flowerGeo(), material(v, { uvRepeat: 2, uvOffset: 0.5 }));
      tilt = -1.0; // лицом к зрителю, но канал всё равно вдоль шнурка
      break;
    case 'heart-frame':
      mesh = new THREE.Mesh(heartFrameGeo(), material(v));
      tilt = 0;
      break;
    case 'heart-puffy':
      mesh = new THREE.Mesh(heartPuffyGeo(), material(v));
      Object.assign(mesh.material, { roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.2 }); // мягкий пастельный глянец, не выцветает в бликах
      tilt = 0;
      break;
    default:
      return null;
  }
  g.add(mesh);
  g.rotation.y = tilt; // лёгкий разворот, чтобы был виден канал и объём
  const wrap = new THREE.Group();
  wrap.add(g);
  return wrap;
}

// CSS-фон свотча, похожий на отделку бусины (для кнопок выбора и списка)
export function variantCss(v) {
  const c = v.color, a = v.accent || '#ffffff';
  const hi = 'radial-gradient(circle at 32% 28%, rgba(255,255,255,.85) 0 9%, rgba(255,255,255,0) 26%)';
  switch (v.finish) {
    case 'clear':
    case 'facet':
    case 'bubble':
      return `${hi}, linear-gradient(135deg, ${rgba(c, 0.95)}, ${rgba(c, 0.45)} 55%, ${rgba(c, 0.85)})`;
    case 'milky':
      return `${hi}, linear-gradient(135deg, #ffffff, ${rgba(c, 0.7)})`;
    case 'stars':
      return `${hi}, radial-gradient(circle at 30% 65%, #f5b82e 0 7%, transparent 8%), radial-gradient(circle at 68% 40%, #2e6fe0 0 7%, transparent 8%), radial-gradient(circle at 60% 75%, #ff6fa5 0 6%, transparent 7%), linear-gradient(135deg, #f4f8fb, #dfe7ee)`;
    case 'metal':
      return `linear-gradient(135deg, #fff3c4, ${c} 45%, #8a6418 80%, #f2d27a)`;
    case 'ab':
      return `${hi}, linear-gradient(135deg, ${c} 20%, ${rgba('#ff9ad5', 0.8)} 45%, ${rgba('#9ad8ff', 0.8)} 65%, ${c} 90%)`;
    case 'marble':
    case 'marble-clear':
    case 'swirl':
    case 'glitter':
      return `${hi}, linear-gradient(115deg, ${c} 0 30%, ${rgba(a, 0.75)} 38%, ${c} 48%, ${c} 62%, ${rgba(a, 0.6)} 70%, ${c} 80%)`;
    case 'spots':
      return `radial-gradient(circle at 30% 35%, ${a} 0 13%, transparent 15%), radial-gradient(circle at 70% 60%, ${a} 0 12%, transparent 14%), radial-gradient(circle at 40% 80%, ${a} 0 9%, transparent 11%), ${c}`;
    case 'speckle':
      return `radial-gradient(circle at 25% 30%, #5a0a22 0 4%, transparent 5%), radial-gradient(circle at 65% 45%, #5a0a22 0 4%, transparent 5%), radial-gradient(circle at 45% 75%, #fff8 0 4%, transparent 5%), ${c}`;
    case 'confetti':
      return `radial-gradient(circle at 30% 30%, #ff4f81 0 10%, transparent 11%), radial-gradient(circle at 70% 40%, #ffd23f 0 10%, transparent 11%), radial-gradient(circle at 40% 72%, #2e86de 0 10%, transparent 11%), radial-gradient(circle at 72% 75%, #3bb273 0 9%, transparent 10%), ${c}`;
    case 'ombre':
      return `linear-gradient(180deg, ${c} 0 50%, ${a})`;
    default:
      return `${hi}, ${c}`;
  }
}
